/*
 * Surge 网络详情面板 (全能延迟监测版)
 * 功能：SSID, BSSID, IPv4, IPv6, Router, DNS, 网关延迟, 公网延迟, ISP, ASN
 * @Giaoogle
 */

/**
 * 网络请求封装
 */
class httpMethod {
  static _httpRequestCallback(resolve, reject, error, response, data) {
    if (error) { reject(error); } else { resolve(Object.assign(response, { data })); }
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
  const codePoints = countryCode.toUpperCase().split('').map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function getCellularInfo() {
  const radioGeneration = { 'GPRS': '2.5G', 'LTE': '4G', 'NRNSA': '5G', 'NR': '5G' };
  const carrierNames = {
    '460-00': '中国移动', '460-01': '中国联通', '460-03': '中国电信',
    '454-00': 'CSL', '454-09': 'CMHK', '466-11': '中華電信'
  };
  if ($network['cellular-data']) {
    const carrierId = $network['cellular-data'].carrier;
    const radio = $network['cellular-data'].radio;
    if (!$network.wifi?.ssid && radio) {
      const name = carrierNames[carrierId] || '蜂窝数据';
      const type = radioGeneration[radio] || radio;
      return `${name} | ${type}`;
    }
  }
  return null;
}

// 获取颜色图标
function getLatencyIcon(ms) {
  if (ms < 50) return '🟢';
  if (ms < 150) return '🟡';
  return '🔴';
}

async function getNetworkInfo() {
  const { v4, v6, wifi, dns: globalDns } = $network;
  const isWifi = wifi?.ssid;
  const routerIp = v4?.primaryRouter;
  
  // 准备本地延迟测试
  let localLatencyStr = "";
  if (isWifi && routerIp) {
    const startLocal = Date.now();
    try {
      // 尝试访问网关，设置超时为 500ms
      await httpMethod.get({ url: `http://${routerIp}`, timeout: 500 });
      const localDuration = Date.now() - startLocal;
      localLatencyStr = `${getLatencyIcon(localDuration)} ${localDuration}ms`;
    } catch (e) {
      // 如果网关拒绝连接(正常现象)，依然可以计算时间差
      const localDuration = Date.now() - startLocal;
      if (localDuration < 500) {
        localLatencyStr = `${getLatencyIcon(localDuration)} ${localDuration}ms`;
      } else {
        localLatencyStr = "🔴 Timeout";
      }
    }
  }

  // 准备公网延迟和信息测试
  const startPublic = Date.now();
  httpMethod.get('http://ip-api.com/json?fields=66846719').then(response => {
    const publicDuration = Date.now() - startPublic;
    const info = JSON.parse(response.data);
    
    // 组装本地网络详情
    let localInfo = [];
    if (v4?.primaryAddress) localInfo.push(`IPv4：${v4.primaryAddress}`);
    if (v6?.primaryAddress) localInfo.push(`IPv6：${v6.primaryAddress}`);
    if (isWifi) {
      if (wifi.bssid) localInfo.push(`BSSID：${wifi.bssid}`);
      if (routerIp) localInfo.push(`Router：${routerIp}`);
    }
    
    // DNS 逻辑
    let dnsServers = v4?.dns || globalDns || [];
    if (dnsServers.length > 0) {
      const uniqueDns = [...new Set(dnsServers)];
      localInfo.push(`DNS：${uniqueDns[0]}${uniqueDns.length > 1 ? ' ...' : ''}`);
    }

    $done({
      title: isWifi ?? getCellularInfo() ?? "网络详情",
      content:
        `[ 本地网络 ]  ${localLatencyStr}\n` +
        localInfo.join("\n") + `\n` +
        `\n[ 公网出口 ]  ${getLatencyIcon(publicDuration)} ${publicDuration}ms\n` +
        `IP ：${info.query}\n` +
        `ISP ：${info.isp}\n` +
        `ASN ：${info.as || '未知'}\n` +
        `位置 ：${getFlagEmoji(info.countryCode)} ${info.country} · ${info.city}`,
      icon: isWifi ? 'wifi.circle' : 'antenna.radiowaves.left.and.right.circle',
      'icon-color': isWifi ? '#007AFF' : '#34C759',
    });

  }).catch(error => {
    $done({
      title: '获取失败',
      content: '请检查网络或代理设置\n' + error,
      icon: 'exclamationmark.triangle',
      'icon-color': '#FF3B30',
    });
  });
}

(() => {
  getNetworkInfo();
})();
