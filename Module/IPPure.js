/*
 * 脚本名称：IPPure 深度检测
 * 脚本作者：Likhixang (优化版)
 * 对应功能：还原 ippure.com 网页视觉体验
 */

const url = "https://ippure.com/json";

$httpClient.get(url, function(error, response, data) {
    if (error) {
        $done({ title: "IPPure 检测失败", content: "无法连接到服务器", icon: "exclamationmark.triangle", "icon-color": "#FF0000" });
        return;
    }

    try {
        const json = JSON.parse(data);
        if (!json.success) {
            $done({ title: "IPPure 数据错误", content: "API 返回异常", icon: "xmark.octagon" });
            return;
        }

        const info = json.data;

        // --- 数据处理 ---
        
        // 1. IP & ASN
        const ip = info.ip;
        const asn = info.asn_org || info.asn || "Unknown ASN";
        
        // 2. 位置 (优先显示精确位置)
        const country = info.country_name || "";
        const region = info.region || "";
        const city = info.city || "";
        const locStr = `${country} ${region} ${city}`.trim();
        const flag = getFlagEmoji(info.country_code);

        // 3. IP 类型标签 (仿照网页绿色标签)
        let typeTags = [];
        if (info.type === "residential") typeTags.push("🏠 住宅 IP");
        else if (info.type === "datacenter") typeTags.push("🏢 数据中心");
        
        // 补充属性 (原生/广播) - 假设 API 返回字段包含这些信息，如果没有则根据经验推断
        // 注意：IPPure JSON 并不总是直接返回 "native"，这里根据常见字段处理
        // 如果网页显示 "原生"，通常 API 会有对应字段，这里预留逻辑
        if (info.is_mobile) typeTags.push("📱 移动网络");
        // 这里只是为了视觉效果，如果 json 中有具体字段请替换
        // typeTags.push("🍃 原生 IP"); 
        
        const typeLine = typeTags.length > 0 ? typeTags.join("  |  ") : "未知类型";

        // 4. 分数与进度条 (核心视觉优化)
        // 假设 API 返回 scores，如果没有则默认为 0
        // ippure 网页的 score 越低越好(纯净)，CF score 越高越危险
        
        // 模拟数据 (因为不知道你 API 具体返回的 key，以下为通用逻辑，请根据实际 key 调整)
        const ipPureScore = info.score || 0; // 0-100
        const cfScore = info.cf_score || 0;  // 0-100 (Cloudflare Risk)

        // 生成进度条
        // IPPure: 低分是绿色(好)，高分是红色
        // CF Risk: 低分是绿色(好)，高分是红色
        const ipPureBar = renderProgressBar(ipPureScore, true); // 反向：分数越低越绿
        const cfBar = renderProgressBar(cfScore, false); // 正向：分数越高越红(但在Surge里都是字符，我们用圆圈表示程度)

        // 5. 人机流量比 (模拟网页的 human/bot 条)
        // 如果 API 没返回这个具体数值，我们可以忽略或随机模拟(不建议)，这里仅展示如果有数据怎么写
        // const humanScore = 76; 
        // const botScore = 23;

        // --- 组装面板内容 ---
        
        const title = `${flag} ${ip}`;
        
        let content = [];
        content.push(`🏢 ${asn}`);
        content.push(`📍 ${locStr}`);
        content.push(`🏷️ ${typeLine}`);
        content.push(``); // 空行分割
        content.push(`🛡️ IP纯净度:  ${ipPureScore}% ${ipPureScore < 20 ? "极度纯净" : "一般"}`);
        content.push(`${ipPureBar}`); 
        content.push(`☁️ CF风控值:  ${cfScore}% ${cfScore > 80 ? "极度风险" : "安全"}`);
        content.push(`${cfBar}`);

        $done({
            title: title,
            content: content.join("\n"),
            icon: "network.badge.shield.half.filled", // SF Symbol
            "icon-color": ipPureScore < 30 ? "#26C364" : "#FF3B30" // 动态图标颜色：纯净绿，脏了红
        });

    } catch (e) {
        $done({ title: "IPPure 解析失败", content: e.message, icon: "exclamationmark.triangle" });
    }
});

// --- 辅助函数 ---

// 绘制进度条 (10格)
// isReverse: true 代表分数越低越好(绿色)，false 代表分数越高越好(红色)
// Surge 面板不支持彩色文本，我们用实心和空心块表示
function renderProgressBar(score, isReverse) {
    const total = 15; // 总长度
    const active = Math.round((score / 100) * total);
    const inactive = total - active;
    
    // 使用 Unicode 方块字符
    const fill = "▓"; 
    const empty = "░";
    
    return fill.repeat(active) + empty.repeat(inactive);
}

// 获取国旗 Emoji
function getFlagEmoji(countryCode) {
    if (!countryCode) return "🌍";
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char =>  127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}
