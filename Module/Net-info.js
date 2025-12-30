/*
 * Surge 网络详情面板 (优化版 + BSSID)
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
  return {
    // 台湾
    '466-11': '中華電信', '466-92': '中華電信', '466-01': '遠傳電信', '466-03': '遠傳電信',
    '466-97': '台灣大哥大', '466-89': '台灣之星', '466-05': 'GT',
    // 大陆
    '460-03': '中国电信', '460-05': '中国电信', '460-11': '中国电信',
    '460-01': '中国联通', '460-06': '中国联通', '460-09': '中国联通',
    '460-00': '中国移动', '460-02': '中国移动', '460-04': '中国移动',
    '460-07': '中国移动', '460-08': '中国移动', '460-15': '中国广电', '460-20': '中移铁通',
    // 香港
    '454-00': 'CSL', '454-02': 'CSL', '454-10': 'CSL', '454-18': 'CSL',
    '454-03': '3', '454-04': '3', '454-05': '3', '454-06': 'SMC HK',
    '454-09': 'CMHK', '454-12': 'CMHK', '454-13': 'CMHK', '454-28': 'CMHK',
    '454-16': 'csl.', '454-19': 'csl.', '454-20': 'csl.', '454-29': 'csl.',
    '454-01': '中信國際電訊', '454-07': 'UNICOM HK', '454-08': 'Truphone', '454-23': 'Lycamobile',
    // 美国 (精简部分常见)
    '310-030': 'AT&T', '310-070': 'AT&T', '310-410': 'AT&T',
    '310-160': 'T-Mobile', '310-260': 'T-Mobile', '310-240': 'T-Mobile',
    '310-004': 'Verizon', '310-012': 'Verizon', '311-480': 'Verizon'
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
    // 如果没有连接 WiFi 且有蜂窝数据
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
  const { v4, v6, wifi } = $network; // 这里增加了 wifi 的解构
  let info = [];
   
  if (!v4 && !v6) {
    info.push('网络状态未知');
  } else {
    // 优化文案: v4 -> IPv4
    if (v4?.primaryAddress) info.push(`IPv4：${v4?.primaryAddress}`);
    if (v6?.primaryAddress) info.push(`IPv6：${v6?.primaryAddress}`);
     
    // 仅在 WiFi 状态下显示路由器地址和 BSSID
    if (wifi?.ssid) {
      // ---> 新增 BSSID 显示逻辑 <---
      if (wifi.bssid) info.push(`BSSID：${wifi.bssid}`);
      
      if (v4?.primaryRouter) info.push(`Router IPv4：${v4?.primaryRouter}`);
      if (v6?.primaryRouter) info.push(`Router IPv6：${v6?.primaryRouter}`);
    }
  }
  return info.join("\n");
}

function getNetworkInfo(retryTimes = 5, retryInterval = 1000) {
  httpMethod.get('http://ip-api.com/json').then(response => {
    if (Number(response.status) > 300) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    const info = JSON.parse(response.data);
     
    // 图标逻辑
    const isWifi = getSSID();
    const icon = isWifi ? 'wifi.circle' : 'antenna.radiowaves.left.and.right.circle';
    const iconColor = isWifi ? '#007AFF' : '#34C759'; // WiFi蓝 / 蜂窝绿

    $done({
      title: getSSID() ?? getCellularInfo(),
      content:
        `[ 本地网络 ]\n` +
        getLocalIP() + `\n` +
        `\n[ 公网出口 ]\n` +
        `节点 IP：${info.query}\n` +
        `运营商 ：${info.isp}\n` +
        `所在地 ：${getFlagEmoji(info.countryCode)} ${info.country} - ${info.city}`,
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
  // 脚本入口
  getNetworkInfo();
})();
