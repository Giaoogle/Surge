/*
 * Surge 网络详情面板 (增强版)
 * 增加功能：BSSID, 本地延迟, 公网延迟, DNS, ASN
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
  let cellularInfo = '';
  const carrierNames = loadCarrierNames();

  const cell = $network['cellular-data'];
  if (!cell) return '';

  const carrierId = cell.carrier;
  const radio = cell.radio;

  // 仅在非 Wi-Fi 时展示蜂窝信息（保持你原逻辑）
  if ($network.wifi?.ssid != null) return '';

  // 只显示 4G/5G：增强 5G 识别（兼容不同字段/返回差异）
  const radioStr = (radio ?? '').toString().toUpperCase();
  const cellDump = JSON.stringify(cell).toUpperCase();

  let type = '';
  if (
    radioStr.includes('NR') || radioStr.includes('5G') ||
    cellDump.includes('"NR"') || cellDump.includes('NRNSA') ||
    cellDump.includes('NRSA') || cellDump.includes('"5G"')
  ) {
    type = '5G';
  } else if (radioStr.includes('LTE') || radioStr.includes('4G')) {
    type = '4G';
  } else {
    // 4G 以下不显示
    return '';
  }

  const name = carrierNames[carrierId] ? carrierNames[carrierId] : '蜂窝数据';
  cellularInfo = `${name} | ${type}`;
  return cellularInfo;
}

function getSSID() {
  return $network.wifi?.ssid;
}

// 延迟图标辅助函数（保留但不再使用）
function getLatencyIcon(ms, isLocal) {
  const threshold = isLocal ? 20 : 200;
  return ms < threshold ? "🟢" : (ms < threshold * 2 ? "🟡" : "🔴");
}

function getLocalIP() {
  const { v4, v6, wifi, dns } = $network;
  let info = [];

  if (!v4 && !v6) {
    info.push('网络状态未知');
  } else {
    if (v4?.primaryAddress) info.push(`IPv4：${v4?.primaryAddress}`);
    if (v6?.primaryAddress) info.push(`IPv6：${v6?.primaryAddress}`);

    if (getSSID()) {
      if (wifi?.bssid) info.push(`BSSID：${wifi.bssid}`); // 新增 BSSID
      if (v4?.primaryRouter) info.push(`Router IPv4：${v4?.primaryRouter}`);
      if (v6?.primaryRouter) info.push(`Router IPv6：${v6?.primaryRouter}`);
    }

    // 新增 DNS 显示
    let dnsServers = v4?.dns || dns || [];
    if (dnsServers.length > 0) {
      info.push(`DNS：${dnsServers[0]}`);
    }
  }
  return info.join("\n");
}

async function getNetworkInfo(retryTimes = 5, retryInterval = 1000) {
  const startPublic = Date.now();
  const routerIp = $network.v4?.primaryRouter;
  let localLatencyStr = "";

  // 1. 探测本地网关延迟（去掉圆形符号，仅显示 ms）
  if (getSSID() && routerIp) {
    const startLocal = Date.now();
    try {
      await $httpClient.get({ url: `http://${routerIp}`, timeout: 0.5 });
    } catch (e) {}
    const localMs = Date.now() - startLocal;
    localLatencyStr = `${localMs}ms`;
  }

  // 2. 获取公网信息
  httpMethod.get('http://ip-api.com/json?fields=66846719').then(response => {
    const publicMs = Date.now() - startPublic;
    if (Number(response.status) > 300) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    const info = JSON.parse(response.data);

    const isWifi = getSSID();
    const icon = isWifi ? 'wifi.circle' : 'antenna.radiowaves.left.and.right.circle';
    const iconColor = isWifi ? '#007AFF' : '#34C759';

    $done({
      title: getSSID() ?? getCellularInfo(),
      content:
        `[ 本地网络 ]  ${localLatencyStr}\n` +
        getLocalIP() + `\n` +
        `\n[ 公网出口 ]  ${publicMs}ms\n` +
        `节点 IP：${info.query}\n` +
        `运营商 ：${info.isp}\n` +
        `ASN    ：${info.as ? info.as.split(' ')[0] : '未知'}\n` + // 新增 ASN
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
  getNetworkInfo();
})();
