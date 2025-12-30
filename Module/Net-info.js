/*
 * Surge 网络详情面板 (全能修复版)
 * 功能：SSID, BSSID, IPv4, IPv6, Router, DNS, 公网IP, ISP, ASN, 延迟
 * @Giaoogle
 */

/**
 * 网络请求封装
 */
class httpMethod {
  static _httpRequestCallback(resolve, reject, error, response, data) {
    if (error) {
      reject(error);
    } else {
      resolve(Object.assign(response, { data }));
    }
  }

  static get(option = {}) {
    return new Promise((resolve, reject) => {
      $httpClient.get(option, (error, response, data) => {
        this._httpRequestCallback(resolve, reject, error, response, data);
      });
    });
  }
}

function getFlagEmoji(countryCode) {
  if (!countryCode) return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function loadCarrierNames() {
  return {
    '460-00': '中国移动', '460-02': '中国移动', '460-07': '中国移动',
    '460-01': '中国联通', '460-06': '中国联通', '460-09': '中国联通',
    '460-03': '中国电信', '460-05': '中国电信', '460-11': '中国电信',
    '454-00': 'CSL', '454-09': 'CMHK', '454-03': '3',
    '466-11': '中華電信', '466-01': '遠傳電信', '466-97': '台灣大哥大'
  };
}

function getCellularInfo() {
  const radioGeneration = {
    'GPRS': '2.5G', 'LTE': '4G', 'NRNSA': '5G', 'NR': '5G',
  };
  let cellularInfo = '';
  const carrierNames = loadCarrierNames();
  if ($network['cellular-data']) {
    const carrierId = $network['cellular-data'].carrier;
    const radio = $network['cellular-data'].radio;
    if (!$network.wifi?.ssid && radio) {
      const name = carrierNames[carrierId] ? carrierNames[carrierId] : '蜂窝数据';
      const type = radioGeneration[radio] ? radioGeneration[radio] : radio;
      cellularInfo = `${name} | ${type}`;
    }
  }
  return cellularInfo;
}

function getLocalIP() {
  const { v4, v6, wifi } = $network;
  let info = [];
   
  if (!v4 && !v6) {
    info.push('网络状态未知');
  } else {
    // 1. IPv4 地址
    if (v4?.primaryAddress) info.push(`IPv4：${v4.primaryAddress}`);
    
    // 2. IPv6 地址 (修复：重新加入)
    if (v6?.primaryAddress) info.push(`IPv6：${v6.primaryAddress}`);
    
    // 3. WiFi 环境信息
    if (wifi?.ssid) {
      if (wifi.bssid) info.push(`BSSID：${wifi.bssid}`);
      if (v4?.primaryRouter) info.push(`Router：${v4.primaryRouter}`);
    }

    // 4. DNS 信息 (修复：确保读取正确)
    // 优先读取 v4 的 DNS，如果没有则尝试显示系统 DNS
    const dns = v4?.dns || [];
    if (dns.length > 0) {
      info.push(`DNS：${dns.join(', ')}`);
    }
  }
  return info.join("\n");
}

function getNetworkInfo(retryTimes = 5, retryInterval = 1000) {
  const startTime = Date.now();
  // 使用 ip-api 并请求全部所需字段
  httpMethod.get('http://ip-api.com/json?fields=66846719').then(response => {
    const duration = Date.now() - startTime;
    const speedIcon = duration < 250 ? '🟢' : (duration < 600 ? '🟡' : '🔴');
    
    if (Number(response.status) > 300) throw new Error(`HTTP Error: ${response.status}`);
    
    const info = JSON.parse(response.data);
    const isWifi = $network.wifi?.ssid;
    
    $done({
      title: isWifi ?? getCellularInfo() ?? "网络详情",
      content:
        `[ 本地网络 ]\n` +
        getLocalIP() + `\n` +
        `\n[ 公网出口 ]  ${speedIcon} ${duration}ms\n` +
        `IP ：${info.query}\n` +
        `ISP ：${info.isp}\n` +
        `ASN ：${info.as || '未知'}\n` +
        `位置 ：${getFlagEmoji(info.countryCode)} ${info.country} · ${info.city}`,
      icon: isWifi ? 'wifi.circle' : 'antenna.radiowaves.left.and.right.circle',
      'icon-color': isWifi ? '#007AFF' : '#34C759',
    });
  }).catch(error => {
    if (retryTimes > 0) {
      setTimeout(() => getNetworkInfo(--retryTimes, retryInterval), retryInterval);
    } else {
      $done({
        title: '获取失败',
        content: '请检查网络或代理设置',
        icon: 'exclamationmark.triangle',
        'icon-color': '#FF3B30',
      });
    }
  });
}

(() => {
  getNetworkInfo();
})();
