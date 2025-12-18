/*
 * 脚本名称：IPPure Minimal
 * 风格：Apple 极简风
 * 数据源：https://my.ippure.com/v1/info
 */

const url = "https://my.ippure.com/v1/info";
const headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
};

$httpClient.get({ url: url, headers: headers }, function(error, response, data) {
    if (error) {
        $done({ title: "网络错误", content: "无法连接到检测接口", icon: "wifi.exclamationmark", "icon-color": "#8E8E93" });
        return;
    }

    try {
        const info = JSON.parse(data);

        // --- 1. 核心数据提取 ---
        const ip = info.ip;
        const country = info.countryCode || "UN";
        const city = info.city || "";
        const region = info.regionCode || "";
        const org = info.asOrganization || "Unknown ISP";
        const score = info.fraudScore || 0; // 0-100
        const isRes = info.isResidential; // true/false

        // --- 2. 视觉逻辑处理 ---
        
        // A. 图标颜色逻辑 (Apple 系统色)
        // 0-30: 安全(绿), 31-70: 警告(黄), 71-100: 危险(红)
        let iconColor = "#34C759"; // Apple Green
        let statusText = "Safe";
        if (score > 70) {
            iconColor = "#FF3B30"; // Apple Red
            statusText = "Risk";
        } else if (score > 30) {
            iconColor = "#FF9500"; // Apple Orange
            statusText = "Warn";
        }

        // B. 网络类型标签
        // 苹果风格通常不使用大量文字，而是用状态词
        const typeTag = isRes ? "Residential 🏠" : "Datacenter 🏢";

        // C. 极简进度条 (模拟 iOS 音量条风格)
        // 使用实心与空心圆点，比方块更圆润优雅
        const bar = renderDots(score);

        // --- 3. 内容排版 ---
        // 标题：国旗 + IP
        const title = `${getFlagEmoji(country)} ${ip}`;
        
        // 内容：三行式布局，利用换行符对齐
        // 第一行：位置信息
        // 第二行：运营商 (ISP)
        // 第三行：网络属性 + 风险评分条
        let content = [];
        content.push(`${city}, ${region} · ${typeTag}`);
        content.push(`${org}`);
        content.push(`${statusText} ${score}%  ${bar}`);

        $done({
            title: title,
            content: content.join("\n"),
            icon: "network.badge.shield.half.filled", // SF Symbol
            "icon-color": iconColor
        });

    } catch (e) {
        $done({ title: "解析错误", content: "数据格式不兼容", icon: "xmark.octagon", "icon-color": "#8E8E93" });
    }
});

// --- 辅助工具 ---

// 绘制圆点进度条 (10格)
function renderDots(score) {
    const total = 10;
    const active = Math.round((score / 100) * total);
    const inactive = total - active;
    // 实心圆点与空心圆点
    return "●".repeat(active) + "○".repeat(inactive);
}

// 国旗 Emoji 转换
function getFlagEmoji(countryCode) {
    if (!countryCode) return "🌍";
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char =>  127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}
