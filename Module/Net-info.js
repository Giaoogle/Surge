/*
 * Surge 网络详情面板 (全能增强版)
 * 功能：SSID, BSSID, Router, DNS, 公网IP, ISP, ASN, 时区, 延迟测试
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

class loggerUtil {
  constructor() {
    this.id = Math.random().toString(36).slice(2, 8);
  }
  log(message) {
    console.log(`[${this.id}] [ LOG ] ${message}`);
  }
  error(message) {
    console.log(`[${this.id}] [ERROR] ${message}`);
  }
}

var logger = new loggerUtil();

function getFlagEmoji(countryCode) {
  if (!countryCode) return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function loadCarrierNames() {
  // 仅保留常见运营商以节省空间
  return {
    '460-00': '中国移动', '460-02': '中国移动', '460-07': '中国移动',
    '460-01': '中国联通', '460-06': '中国联通', '460-09': '中国联通',
    '460-03': '中国电信', '460-05': '中国电信', '460-11': '中国电信',
    '454-00': 'CSL', '454-06': 'SMC HK', '454-09': 'CMHK', '454-03': '3',
    '466-11': '中華電信', '466-01': '遠傳電信', '466-97': '台灣大哥大'
  };
}

function getCellularInfo() {
  const radioGeneration = {
    'GPRS': '2.5G', 'CDMA1x': '2.5G', 'EDGE': '2.75G',
    'WCDMA': '3G', 'HSDPA': '3.5G', 'HSUPA': '3.75G',
    'LTE': '4G', 'NRNSA': '5G', 'NR': '5G',
  };

  let cellularInfo = '';
  const carrierNames = loadCarrierNames();
   
  if ($network['cellular-data']) {
    const carrierId = $network['cellular-data'].carrier;
    const radio = $network['cellular-data'].radio;
    if ($network.wifi?.ssid == null && radio) {
      const name = carrierNames[carrierId] ? carrierNames[carrierId] : '蜂窝数据';
      const type = radioGeneration[radio] ? radioGeneration[radio] : radio;
      cellularInfo = `${name} | ${type}`;
    }
  }
  return cellularInfo;
}

function getSSID() {
  return $network.wifi?.ssid;
}

function getLocalIP() {
  const { v4, v6, wifi } = $network;
  let info = [];
   
  if (!v4 && !v6) {
    info.push('网络状态未知');
  } else {
    // 1. 本地 IP
    if (v4?.primaryAddress) info.push(`IPv4：${v4?.primaryAddress}`);
    
    // 2. WiFi 特定信息
    if (wifi?.ssid) {
      if (wifi.bssid) info.push(`BSSID：${wifi.bssid}`);
      if (v4?.primaryRouter) info.push(`Router：${v4?.primaryRouter}`);
    }

    // 3. DNS 信息 (新增)
    const dns = v4?.dns;
    if (dns && dns.length > 0) {
      // 只显示第一个 DNS 以防面板太长
      info.push(`DNS：${dns[0]}`); 
    }
  }
  return info.join("\n");
}

function getNetworkInfo(retryTimes = 5, retryInterval = 1000) {
  // 记录开始时间用于计算延迟
  const startTime = Date.now();

  httpMethod.get('http://ip-api.com/json').then(response => {
    // 计算延迟
    const endTime = Date.now();
    const duration = endTime - startTime;
    // 根据延迟设置颜色指示器
    const speedIcon = duration < 200 ? '🟢' : (duration < 500 ? '🟡' : '🔴');
    const latencyStr = `${speedIcon} ${duration}ms`;

    if (Number(response.status) > 300) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    const info = JSON.parse(response.data);
     
    const isWifi = getSSID();
    const icon = isWifi ? 'wifi.circle' : 'antenna.radiowaves.left.and.right.circle';
    const iconColor = isWifi ? '#007AFF' : '#34C759';

    // 处理 ASN 格式 (去除多余的 AS 编号重复显示)
    let asn = info.as || '';
    
    $done({
      title: getSSID() ?? getCellularInfo(),
      content:
        `[ 本地网络 ]\n` +
        getLocalIP() + `\n` +
        `\n[ 公网出口 ]  ${latencyStr}\n` + // 显示延迟
        `IP ：${info.query}\n` +
        `ISP ：${info.isp}\n` +
        `ASN ：${asn}\n` + // 显示 ASN
        `位置 ：${getFlagEmoji(info.countryCode)} ${info.city} (${info.timezone})`, // 显示时区
      icon: icon,
      'icon-color': iconColor,
    });

  }).catch(error => {
    if (retryTimes > 0) {
      logger.log(`Retry... (${retryTimes})`);
      setTimeout(() => getNetworkInfo(--retryTimes, retryInterval), retryInterval);
    } else {
      $done({
        title: '获取失败',
        content: '无法连接到检测服务器\n请检查网络连接',
        icon: 'exclamationmark.triangle',
        'icon-color': '#FF3B30',
      });
    }
  });
}

(() => {
  getNetworkInfo();
})();
