
/* wifi_proxy change
[Script]
SSID助手 = debug=1,script-path=https://raw.githubusercontent.com/Giaoogle/Surge/main/Module/Wi-Fi_Proxy.js,type=event,event-name=network-changed,control-api=true

PS:记得自己修改WIFI名称
主要功能:指定Wi-Fi(路由器翻)下,Surge使用直连模式,其他网络下Surge使用规则模式
虽然设置SSID可以达到基本相同功能
使用脚本,Surge不会被suspend
Rewrite和Scripting依然有效
*/

var wifiname = $network.wifi.ssid;
var proxywifi = ["DAYUAN-5G"];

var isProxyWiFi = proxywifi.includes(wifiname);

if (isProxyWiFi) {
    // 设置为直连模式
    $surge.setOutboundMode("direct");
    setTimeout(function() {
        $notification.post("Meeta_Remind", "您目前处于WIFI-Proxy" + "SSID: " + wifiname, "Surge已自动变为直连模式");
    }, 3000);
} else {
    // 设置为规则模式
    $surge.setOutboundMode("rule");
    setTimeout(function() {
        $notification.post("Meeta_Remind", "Surge已自动变为规则模式", "");
    }, 3000);
}

$done();

