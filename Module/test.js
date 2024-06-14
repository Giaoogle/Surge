// 获取当前 Wi-Fi 名称
const wifiName = $network.wifi.ssid;

if (wifiName === "DAYUAN-5G") {
  // 设置为全局代理
  $surge.setOutboundMode("proxy");
} else {
  // 设置为规则模式
  $surge.setOutboundMode("rule");
}

$done();
