/*
 * 脚本名称：IP 深度检测 (高仿 IPPure 视觉版)
 * 数据来源：ip-api.com (稳定/无墙/无盾)
 * 脚本作者：Likhixang (优化版)
 * 功能：还原 IPPure 网页视觉体验，自动计算风险评分
 */

// 使用 ip-api，请求特定的字段以减少流量
const url = "http://ip-api.com/json/?fields=status,message,country,countryCode,regionName,city,isp,org,as,mobile,proxy,hosting,query";

$httpClient.get(url, function(error, response, data) {
    if (error) {
        $done({ title: "检测失败", content: "网络连接错误", icon: "exclamationmark.triangle", "icon-color": "#FF0000" });
        return;
    }

    try {
        const info = JSON.parse(data);
        
        if (info.status !== "success") {
            $done({ title: "查询失败", content: info.message || "API 异常", icon: "xmark.octagon" });
            return;
        }

        // --- 1. 基础信息处理 ---
        const ip = info.query;
        // 处理 ASN，去除多余的长字符
        let asn = info.as || info.org || "Unknown";
        if (asn.length > 30) asn = asn.split(" ")[0] + " " + asn.split(" ")[1]; // 简单缩短

        const locStr = `${info.country} ${info.regionName} ${info.city}`;
        const flag = getFlagEmoji(info.countryCode);

        // --- 2. 智能类型判断 & 风险模拟 ---
        // ip-api 不返回 0-100 分数，我们根据属性自己计算，模拟 IPPure 的视觉效果
        
        let typeTags = [];
        let riskScore = 0; // 0 是最安全，100 是最危险
        let pureScore = 100; // 100 是最纯净

        if (info.mobile) {
            typeTags.push("📱 移动网络");
            typeTags.push("🍃 原生 IP"); // 移动网通常被视为原生
            riskScore = 0;
            pureScore = 98;
        } else if (info.hosting) {
            typeTags.push("🏢 数据中心");
            riskScore += 80; // 托管机房通常被视为高风险/非原生
            pureScore -= 80;
        } else {
            typeTags.push("🏠 住宅宽带"); // 既非 mobile 也非 hosting，通常是家宽
            riskScore += 10;
            pureScore = 90;
        }

        if (info.proxy) {
            typeTags.push("🔒 代理节点");
            riskScore = 99;
            pureScore = 1;
        }

        // 修正分数范围
        if (riskScore > 100) riskScore = 100;
        if (pureScore < 0) pureScore = 0;

        const typeLine = typeTags.join("  |  ");

        // --- 3. 生成进度条 (视觉核心) ---
        const ipPureBar = renderProgressBar(pureScore, true); // 越长越好(绿)
        const riskBar = renderProgressBar(riskScore, false);  // 越长越差(红)

        // --- 4. 组装面板 ---
        
        let content = [];
        content.push(`🏢 ${asn}`);
        content.push(`📍 ${locStr}`);
        content.push(`🏷️ ${typeLine}`);
        content.push(``); // 视觉空行
        content.push(`🛡️ IP纯净度:  ${pureScore}% ${pureScore > 80 ? "极度纯净" : "一般"}`);
        content.push(`${ipPureBar}`); 
        content.push(`☁️ 风险指数:  ${riskScore}% ${riskScore > 50 ? "高风险" : "安全"}`);
        content.push(`${riskBar}`);

        // 动态图标颜色
        let iconColor = "#26C364"; // 默认绿
        if (riskScore > 80) iconColor = "#FF3B30"; // 危险红
        else if (riskScore > 40) iconColor = "#FF9500"; // 警告黄

        $done({
            title: `${flag} ${ip}`,
            content: content.join("\n"),
            icon: "network.badge.shield.half.filled",
            "icon-color": iconColor
        });

    } catch (e) {
        $done({ title: "解析错误", content: e.message, icon: "exclamationmark.triangle" });
    }
});

// --- 辅助工具 ---

// 绘制进度条
// isGoodBar: true(纯净度，满格是好事), false(风险值，满格是坏事)
function renderProgressBar(score, isGoodBar) {
    const total = 14; 
    const active = Math.round((score / 100) * total);
    const inactive = total - active;
    
    const fill = "▓"; 
    const empty = "░";
    
    // 视觉上的进度条
    return fill.repeat(active) + empty.repeat(inactive);
}

function getFlagEmoji(countryCode) {
    if (!countryCode) return "🌍";
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char =>  127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}
