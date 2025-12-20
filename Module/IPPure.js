/*
 * 脚本名称：IPPure Design (Apple Layout)
 * 风格：列表式极简风
 * 数据源：https://my.ippure.com/v1/info
 */

const url = "https://my.ippure.com/v1/info";
const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15"
};

$httpClient.get({ url: url, headers: headers }, function(error, response, data) {
    if (error) {
        $done({ title: "检测超时", content: "网络连接中断", icon: "wifi.exclamationmark", "icon-color": "#8E8E93" });
        return;
    }

    try {
        const info = JSON.parse(data);

        // --- 1. 数据映射 ---
        const ip = info.ip;
        const asn = info.asn || "Unknown";
        const org = info.asOrganization || "Unknown";
        
        // 位置信息
        const countryCode = info.countryCode || "UN";
        const region = info.regionCode || "";
        const city = info.city || "";
        const locStr = `${getFlagEmoji(countryCode)} ${region} ${city}`;

        // 分数
        const score = info.fraudScore || 0;

        // 属性与来源判断
        // isResidential: true (住宅) / false (机房)
        // isBroadcast: true (广播IP/非原生) / false (通常为原生)
        const isRes = info.isResidential;
        const isBroad = info.isBroadcast;

        // 属性: 住宅宽带 vs 数据中心
        const attrStr = isRes ? "住宅宽带 (ISP)" : "数据中心 (Hosting)";
        
        // 来源: 原生 IP vs 广播 IP
        // 逻辑：如果是住宅且非广播，通常是原生；否则可能是广播
        // 这里为了简约，直接根据 isBroadcast 判断
        const sourceStr = (!isBroad && isRes) ? "原生 IP (Native)" : "广播 IP (Broadcast)";

        // --- 2. 评级系统 (6级划分) ---
        // 0-15, 15-25, 25-40, 40-50, 50-70, 70-100
        const level = getRiskLevel(score);

        // --- 3. 视觉组件 ---
        
        // 圆点进度条 (10点制)
        const dots = renderDots(score);

        // --- 4. 组装面板 (严格按照你的排版) ---
        
        let content = [];
        
        // 每一行都使用全角空格或普通空格微调对齐
        content.push(`IP: ${ip}`);
        content.push(`ISP: ${org}`);
        content.push(`ASN: AS${asn}`);
        content.push(`位置: ${locStr}`);
        content.push(`属性: ${attrStr}`);
        content.push(`来源: ${sourceStr}`);
        content.push(``); // 空行分割，突出分数
        content.push(`IPPure系数: ${score}%  ${level.text}`);
        content.push(`${dots}`); // 标尺

        // 动态图标颜色
        // --- 2. 动态图标颜色逻辑 (6级划分) ---
        let iconColor = "#FF3B30"; // 默认红色 (>70)

        if (score <= 15) {
            iconColor = "#1D7044"; // 深绿色 (极度纯净)
        } else if (score <= 25) {
            iconColor = "#34C759"; // 绿色 (纯净)
        } else if (score <= 40) {
            iconColor = "#A4E674"; // 浅绿色 (低风险)
        } else if (score <= 50) {
            iconColor = "#FFD60A"; // 黄色 (中风险)
        } else if (score <= 70) {
            iconColor = "#FF9500"; // 橙色 (风险)
        } 
        // 大于 70 保持默认红色 (极度风险)

        $done({
            title: "IP 深度检测",
            content: content.join("\n"),
            icon: "leaf.fill",
            "icon-color": iconColor
        });

    } catch (e) {
        $done({ title: "解析错误", content: "数据不兼容: " + e.message, icon: "xmark.octagon" });
    }
});

// --- 辅助工具 ---

// 1. 风险评级 (0 15 25 40 50 70 100)
function getRiskLevel(s) {
    if (s <= 15) return { text: "极度纯净", color: "green" };
    if (s <= 25) return { text: "纯净", color: "green" };
    if (s <= 40) return { text: "低风险", color: "yellow" };
    if (s <= 50) return { text: "中风险", color: "orange" };
    if (s <= 70) return { text: "风险", color: "red" };
    return { text: "极度风险", color: "purple" };
}

// 2. 绘制圆点 (10格 - 月相高精版)
function renderDots(score) {
    const width = 10; // 保持 10 格宽度
    
    if (score > 100) score = 100;
    if (score < 0) score = 0;

    // 将 0-100 映射到 0-40 (因为 10格 * 4个状态 = 40级精度)
    const raw = (score / 100) * width * 4;
    const rounded = Math.round(raw);
    
    const fullDots = Math.floor(rounded / 4); // 满格的数量
    const remainder = rounded % 4;            // 余数 (决定最后一个点的状态)
    
    // 状态字符：空 -> 1/4 -> 1/2 -> 3/4 -> 满 (注意：满即 ●，这里处理余数)
    const symbols = ["○", "◔", "◑", "◕"]; 
    
    let str = "●".repeat(fullDots);
    
    // 如果还没填满，处理中间那个“半满”的点
    if (fullDots < width) {
        str += symbols[remainder];
        // 补齐剩下的空位
        str += "○".repeat(width - fullDots - 1);
    }
    
    return str;
}

// 3. 国旗
function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode === "UN") return "🇺🇳";
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char =>  127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}
