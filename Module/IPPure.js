/*
 * 脚本名称：IPPure 深度检测 (修复版)
 * 脚本作者：Giaoogle (优化版)
 * 功能：还原 ippure.com 网页视觉体验，修复 JSON 解析错误
 */

const url = "https://ippure.com/json";

// 关键修复：添加伪装头，模拟 iPhone 浏览器访问，避免被 Cloudflare 拦截
const headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://ippure.com/",
    "Origin": "https://ippure.com"
};

$httpClient.get({ url: url, headers: headers }, function(error, response, data) {
    if (error) {
        $done({ title: "检测失败", content: "无法连接服务器，请检查网络", icon: "exclamationmark.triangle", "icon-color": "#FF0000" });
        return;
    }

    try {
        const json = JSON.parse(data);
        
        // 如果 API 返回的数据里没有 success 字段或为 false
        if (json.success === false) { 
             $done({ title: "数据异常", content: "API 请求未成功", icon: "xmark.octagon" });
             return;
        }

        const info = json.data;

        // --- 数据处理 ---
        
        // 1. IP & ASN
        const ip = info.ip;
        const asn = info.asn_org || info.asn || "Unknown";
        
        // 2. 位置
        const country = info.country_name || "";
        const region = info.region || "";
        const city = info.city || "";
        // 简单组合位置信息，避免过长
        const locStr = `${country} ${region}`.trim(); 
        const flag = getFlagEmoji(info.country_code);

        // 3. IP 类型标签
        let typeTags = [];
        if (info.type === "residential") typeTags.push("🏠 住宅");
        else if (info.type === "datacenter") typeTags.push("🏢 数据中心");
        else typeTags.push("🌐 " + (info.type || "未知"));

        // 尝试判断原生 (根据常见字段猜测，IPPure 可能不直接返回 is_native)
        // 这里仅作示例，如果没有准确字段可注释掉
        if (info.is_mobile) typeTags.push("📱 移动");
        
        const typeLine = typeTags.join(" | ");

        // 4. 分数与进度条
        // 注意：不同 IP 库返回的 key 可能不同，这里防御性读取
        const ipPureScore = parseInt(info.score || 0); 
        const cfScore = parseInt(info.cf_score || 0);

        const ipPureBar = renderProgressBar(ipPureScore, true); // 低分绿
        const cfBar = renderProgressBar(cfScore, false);      // 高分红

        // --- 组装面板 ---
        
        const title = `${flag} ${ip}`;
        
        let content = [];
        content.push(`🏢 ${asn}`);
        content.push(`📍 ${locStr}  ${city}`);
        content.push(`🏷️ ${typeLine}`);
        content.push(``); 
        content.push(`🛡️ 纯净度: ${ipPureScore}% ${ipPureScore < 20 ? "极好" : "一般"}`);
        content.push(`${ipPureBar}`); 
        content.push(`☁️ CF风控: ${cfScore}% ${cfScore > 80 ? "危险" : "安全"}`);
        content.push(`${cfBar}`);

        $done({
            title: title,
            content: content.join("\n"),
            icon: "network.badge.shield.half.filled",
            "icon-color": ipPureScore < 30 ? "#26C364" : "#FF3B30"
        });

    } catch (e) {
        // --- 调试日志 ---
        // 如果再次报错，请在 Surge 日志查看这一行，看看服务器到底返回了什么 HTML
        console.log("❌ IPPure JSON 解析失败。返回数据片段: " + data.substring(0, 200));
        
        $done({ 
            title: "解析错误", 
            content: "服务器可能开启了盾(Cloudflare)。\n请查看脚本日志。", 
            icon: "exclamationmark.triangle" 
        });
    }
});

// --- 辅助函数 ---

function renderProgressBar(score, isReverse) {
    const total = 12; // 稍微缩短一点以防折行
    const active = Math.round((score / 100) * total);
    const inactive = total - active;
    const fill = "▓"; 
    const empty = "░";
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
