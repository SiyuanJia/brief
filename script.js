// ==================== 环境配置 ====================
const ENV_CONFIG = {
    // 环境检测：根据域名自动判断环境
    getEnvironment() {
        const hostname = window.location.hostname;
        // 生产环境域名判断
        if (hostname === 'siyuanjia.github.io' ||
            hostname.includes('brief-prod')) {
            return 'production';
        }
        return 'development';
    },

    // 代理端点配置
    proxyEndpoints: {
        development: 'https://brief-pdondtcgjd.cn-hongkong.fcapp.run',
        production: 'https://brief-prod-skdpzkhhzk.cn-hongkong.fcapp.run'
    },

    // 获取当前环境的代理端点
    getProxyEndpoint() {
        const env = this.getEnvironment();
        return this.proxyEndpoints[env];
    }
};

// ==================== API 接口配置 ====================
const API_CONFIG = {
    // Unifuns 爬取接口配置
    UNIFUNS: {
        endpointAI: 'https://api.302.ai/unifuncs/api/web-reader/read',
        endpointCN: 'https://api.302ai.cn/unifuncs/api/web-reader/read',
        endpoint: 'https://api.302.ai/unifuncs/api/web-reader/read', // 默认直连 .ai
        region: 'ai', // ai 或 cn
        apiKey: '', // 生产环境下由后端代理处理，无需填写
        useProxy: true, // 避免浏览器CORS，走统一代理
        proxyEndpoint: ENV_CONFIG.getProxyEndpoint() // 自动根据环境选择
    },
    // Gemini 2.5 Flash 配置
    GEMINI: {
        endpoint: 'https://api.302.ai/v1/chat/completions',
        apiKey: 'sk-aE0CzP46qaMdvt1u1gcNZXBr0oDUWrzLaEJsjje8HBxnLJGA', // 开发环境密钥，生产环境由代理处理
        useProxy: false // 暂时直连，等后端代理完成后改为 true
    },
    // Nano Banana 图片生成配置
    NANO_BANANA: {
        endpoint: 'https://api.302.ai/google/v1/models/gemini-2.5-flash-image-preview?response_format',
        apiKey: 'sk-l1k1WmtcTJOugQWCvkHFJUacCxdxIYyXwqss7yuGZLUHvwL3', // 开发环境密钥，生产环境由代理处理
        useProxy: false // 暂时直连，等后端代理完成后改为 true
    }
};

// ==================== 提示词模板 ====================
const PROMPTS = {
    // Gemini 内容提炼提示词（优化版）
    CONTENT_EXTRACTION: `
我们要做一份好看的时事资讯简报，请仔细阅读用户输入的新闻内容并做信息提炼，保持原文的框架结构，合理分割为2-6个子模块，提炼出文章标题、关键词和每个子模块的信息。注意，新闻内容中审校信息、评论点赞信息等无关信息，不用于提炼。

## 需要输出的内容如下：（用 JSON 格式返回）

1. **文章标题及关键词**：如果原文有标题，则采用原标题；关键词根据新闻内容提炼 3-5 个即可。

2. **子模块标题**：如果原文可以分成相对独立的几个子模块，则提炼出模块标题。

3. **子模块内容**：如果原文可以分成相对独立的几个子模块，则提炼出模块核心内容，并注意：
   1）子模块内容不要超过 500 字，可以适当引用原文。
   2）所有信息，尤其是关键数字，**一定要来自于原文、保证真实准确**，秉持严肃的新闻态度，不要编造。
   3）提炼的内容中，重点的词语或句子，要标记为 highlights，简报中会用彩色加粗来突出。包括：关键数据、重要观点、核心结论、重要现象、重要人物/机构名称等，标记完整的语句，不要太细碎（注意，标记数量控制在每段3-8个重点）。
   4）提炼的内容中，引用的内容，即如果涉及到某个段落是援引自某位专家或某个机构，要标记为 quotes，简报中会用引用的样式来突出。
   5）提炼的内容中，如果涉及到关键数据，请列出对应的数据项描述，标记为 dataPoints，简报中会用无序列表来表示。

4. **子模块插图的提示词**：根据模块内容，我们后续会调用其他模型接口，生成一张手绘风格插图，请你根据子模块的内容，撰写插图生成的提示词，注意：
   1）插图生成提示词的模板：
   "A hand-drawn illustration of [some financial subject], featuring a line graph or chart showing [something], and using colored pencil style with blue, green, gold and red highlights. Add hand-drawn elements like [some icon] and [some sign]. Add annotations or labels in English like '[words or numbers]' if necessary. Keep a clean hand-drawn style suitable for a financial report. Attention, the background color must be #f5f2e8."

   请依据此模板和该段落的内容，填充方括号内的内容，灵活生成适配的提示词。注意，提示词要用英文。
   2）提示词中需要在插图展示出来的文字或数字，**一定要来自于原文、保证真实准确**，秉持严肃的新闻态度，不要编造。

## JSON 输出格式：
{
  "articleTitle": "文章标题（如果原文有标题则采用原标题）",
  "publishDate": "发布日期（格式：YYYY年MM月DD日，如无明确日期可用今日）",
  "keywords": ["关键词1", "关键词2", "关键词3"], // 3-5个关键词
  "sections": [
    {
      "sectionTitle": "子模块标题",
      "sectionContent": {
        "mainText": "主要内容段落（不超过500字）",
        "highlights": [
          {
            "text": "重点内容文字（来自原文）",
            "type": "red|blue|green|yellow"
          }
        ],
        "quotes": ["专家观点或官方声明的引用内容"],
        "dataPoints": ["具体数字、百分比或统计信息"]
      },
      "imagePrompt": "基于模板生成的英文插图提示词"
    }
  ]
}

## 用户输入的新闻内容：
{NEWS_CONTENT}

请严格按照上述要求提炼信息，确保所有数据真实准确，来源于原文。`,

    // Nano Banana 图片生成提示词模板
    IMAGE_GENERATION: `
Generate a professional, clean illustration for a financial news report section.
Style: Modern, minimalist, business-oriented
Content: {IMAGE_PROMPT}
Requirements: High quality, suitable for news article, no text overlay, professional color scheme
`
};

// ==================== 示例文章配置 ====================
// 使用配置文件中的示例文章，如果配置文件不存在则使用默认配置
const EXAMPLE_ARTICLES = (typeof EXAMPLE_ARTICLES_CONFIG !== 'undefined')
    ? EXAMPLE_ARTICLES_CONFIG
    : [
        {
            title: "美联储降息预期升温，美股三大指数集体上涨",
            url: "https://example.com/fed-rate-cut-expectations"
        },
        {
            title: "中国8月CPI同比上涨0.6%，核心CPI保持稳定",
            url: "https://example.com/china-cpi-august"
        },
        {
            title: "特斯拉Q3交付量超预期，股价盘后大涨8%",
            url: "https://example.com/tesla-q3-delivery"
        },
        {
            title: "欧洲央行维持利率不变，关注通胀走势",
            url: "https://example.com/ecb-rate-decision"
        }
    ];

// ==================== API 接口函数 ====================

// 1. 爬取新闻内容
async function fetchNewsContent(newsUrl) {
    try {
        console.log('开始爬取新闻内容:', newsUrl);

        // 构建请求头
        const useProxy = !!API_CONFIG.UNIFUNS.useProxy;
        const apiKey = (API_CONFIG.UNIFUNS.apiKey || '').trim();
        // 仅在不使用代理时才需要前端提供密钥，避免在浏览器泄露
        if (!useProxy) {
            if (!apiKey) {
                throw new Error('未配置 Unifuns API 密钥');
            }
            if (!apiKey.startsWith('sk-')) {
                console.warn('提示：当前API密钥似乎不是以 "sk-" 开头，可能不适用于该接口。请确认使用的是 Web-Reader 对应的密钥。');
            }
        }
        const myHeaders = new Headers();
        // 仅在不使用代理时从前端发送鉴权头，避免泄露密钥
        if (!useProxy) {
            myHeaders.append("Authorization", `Bearer ${apiKey}`);
        }
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Accept", "application/json");

        // 构建请求体
        const raw = JSON.stringify({
            url: newsUrl,
            format: "markdown",
            liteMode: true,
            includeImages: false
        });

        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: raw,
            redirect: 'follow'
        };

        console.log('发送请求到Unifuns API...');
        // 仅输出必要信息，避免泄露敏感数据
        // 固定使用国际 .ai 端点 + 代理，保证稳定与安全
        API_CONFIG.UNIFUNS.endpoint = API_CONFIG.UNIFUNS.endpointAI;
        API_CONFIG.UNIFUNS.useProxy = true;

        // 为稳妥起见，采用 query 方式把 url 传给代理，避免某些网关丢失 body
        const qs = new URLSearchParams({ url: newsUrl }).toString();
        const targetUrl = `${API_CONFIG.UNIFUNS.proxyEndpoint}?${qs}`;
        console.log('请求URL:', targetUrl);
        console.log('请求体:', raw);

        // 统一通过代理转发（body 仍带上 format/liteMode 等）
        let response = await fetch(targetUrl, requestOptions);

        if (!response.ok) {
            let errText = '';
            try { errText = await response.text(); } catch {}
            console.error('Unifuns错误响应体:', errText);
            // 明确只调用一次：不做任何直连/备用重试，避免重复计费
            throw new Error(`爬取失败: ${response.status} ${response.statusText}`);
        }

        const result = await response.text();
        // 简化日志，避免打印全文
        console.log('Unifuns API 返回（长度）:', result ? result.length : 0);

        // 尝试解析JSON响应
        let parsedResult;
        try {
            parsedResult = JSON.parse(result);
            console.log('解析后的JSON数据:', parsedResult);

            // 根据实际API响应结构返回内容
            // 可能需要根据实际响应格式调整这里的字段名
            return parsedResult.data || parsedResult.content || parsedResult;

        } catch (parseError) {
            console.log('响应不是JSON格式，直接返回文本内容');
            return result;
        }

    } catch (error) {
        console.error('爬取新闻内容失败:', error);
        throw new Error(`无法获取新闻内容: ${error.message}`);
    }
}

// 2. 提炼新闻内容
async function extractNewsContent(newsContent) {
    try {
        console.log('开始提炼新闻内容');

        // 构建提示词（将爬取的正文替换进模板）
        const prompt = PROMPTS.CONTENT_EXTRACTION.replace('{NEWS_CONTENT}', newsContent);

        // 仅做控制台输出，不接入渲染：调用 302.ai OpenAI 兼容端点
        const myHeaders = new Headers();
        myHeaders.append('Accept', 'application/json');
        myHeaders.append('Content-Type', 'application/json');

        // 根据是否使用代理决定是否添加 Authorization 头
        if (!API_CONFIG.GEMINI.useProxy && API_CONFIG.GEMINI.apiKey) {
            myHeaders.append('Authorization', `Bearer ${API_CONFIG.GEMINI.apiKey}`);
        }

        const raw = JSON.stringify({
            model: 'gemini-2.5-flash',
            messages: [
                { role: 'user', content: prompt }
            ]
        });

        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: raw,
            redirect: 'follow'
        };

        const endpoint = API_CONFIG.GEMINI.endpoint || 'https://api.302.ai/v1/chat/completions';
        console.log('[Gemini] 请求 endpoint:', endpoint);
        console.log('[Gemini] 使用代理:', API_CONFIG.GEMINI.useProxy);
        const resp = await fetch(endpoint, requestOptions);
        const text = await resp.text();

        // 为避免控制台噪音，这里不再输出 Gemini 原始返回（text）

        // 尝试按 OpenAI 风格解析，并将“内层 JSON 提炼结果”透出给上游（增强鲁棒性）
        let parsedForUpstream = { sections: [] };
        const tryParseLooseJson = (s) => {
            if (typeof s !== 'string') return null;
            const trimmed = s.trim();
            // 1) 去除 ```json ... ``` 或 ``` ... ``` 代码围栏
            const fenceMatch = trimmed.match(/```(?:json)?\n([\s\S]*?)```/i);
            const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
            try { return JSON.parse(candidate); } catch {}
            // 2) 粗暴截取第一个 { 到最后一个 } 的子串再尝试
            const first = candidate.indexOf('{');
            const last = candidate.lastIndexOf('}');
            if (first !== -1 && last !== -1 && last > first) {
                const slice = candidate.slice(first, last + 1);
                try { return JSON.parse(slice); } catch {}
            }
            return null;
        };

        try {
            const json = JSON.parse(text);
            console.log('=== Gemini JSON 解析成功 ===');
            console.log(json);
            let content = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;

            // 某些实现里 content 可能是数组（多段文本），尝试拼接为字符串
            if (Array.isArray(content)) {
                content = content.map(part => (typeof part === 'string' ? part : (part && (part.text || part.content || '')))).join('\n');
            }

            if (typeof content === 'string') {
                const parsed = tryParseLooseJson(content);
                if (parsed && typeof parsed === 'object') {
                    console.log('=== Gemini 内层 JSON（提炼结果）===');
                    console.log(parsed);
                    parsedForUpstream = parsed;
                } else {
                    console.log('=== Gemini 内层文本（未能解析为 JSON）===');
                    console.log(content);
                }
            } else if (content && typeof content === 'object' && content.sections) {
                // 少见：直接就是结构化对象
                parsedForUpstream = content;
            }
        } catch (e) {
            console.warn('[Gemini] 返回不是 JSON，已原样打印');
        }

        // 日志：返回给上游的 sections 数
        console.log('[Gemini] 提炼结果用于生成插图的 sections 数量 =', Array.isArray(parsedForUpstream.sections) ? parsedForUpstream.sections.length : 0);

        // 返回“用于后续 generateImages 的提炼结构”，页面渲染不改
        return parsedForUpstream;

    } catch (error) {
        console.error('提炼新闻内容失败:', error);
        // 不阻塞后续流程，返回空对象
        return {};
    }
}
// ==================== Nano Banana 接口接入（仅控制台输出） ====================
function buildFinalImagePrompt(imagePromptFromGemini) {
  const suffix = " Additional requirements: background color must be #f5f2e8; hand-drawn colored pencil style with rich visual elements; include multiple charts, graphs, or infographics; add various financial icons like trending arrows, currency symbols, building silhouettes, and market indicators; use vibrant blue, green, gold, and red highlights; include small English annotations and data labels from the article; add decorative elements like grid lines, geometric shapes, and subtle patterns; create a visually engaging but professional financial illustration; no watermarks; no real faces; balanced composition with good visual hierarchy.";
  return `${imagePromptFromGemini} ${suffix}`;
}

async function callNanoBanana(imagePromptFromGemini, retryCount = 0) {
  try {
    const endpoint = API_CONFIG.NANO_BANANA.endpoint;
    const apiKey = (API_CONFIG.NANO_BANANA.apiKey || '').trim();

    // 如果不使用代理且缺少密钥，则跳过调用
    if (!API_CONFIG.NANO_BANANA.useProxy && (!endpoint || !apiKey)) {
      console.warn('[NanoBanana] endpoint 或 apiKey 未配置，跳过调用');
      return { title: '', imageUrl: '' };
    }

    const prompt = buildFinalImagePrompt(imagePromptFromGemini);

    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');

    // 根据是否使用代理决定是否添加 Authorization 头
    if (!API_CONFIG.NANO_BANANA.useProxy && apiKey) {
        myHeaders.append('Authorization', `Bearer ${apiKey}`);
    }

    const raw = JSON.stringify({
      contents: [{ parts: [{ text: prompt }]}],
      generationConfig: { responseModalities: ['TEXT','IMAGE'] }
    });

    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow',
      signal: controller.signal
    };

    console.log('[NanoBanana] 请求 endpoint:', endpoint, retryCount > 0 ? `(重试 ${retryCount})` : '');
    console.log('[NanoBanana] 使用代理:', API_CONFIG.NANO_BANANA.useProxy);
    console.log('[NanoBanana] 请求体 prompt 预览:', prompt.slice(0, 180) + (prompt.length>180?'…':''));

    const resp = await fetch(endpoint, requestOptions);
    clearTimeout(timeoutId);

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }

    const text = await resp.text();
    // 不再打印原始返回全文，避免噪音和泄露；如需调试可临时开启

    // 解析出图片 URL（根据实际返回结构尝试多种字段）
    let imageUrl = '';
    try {
      const json = JSON.parse(text);
      // 常见平铺字段
      imageUrl = json.imageUrl || json.url || (json.data && json.data[0] && json.data[0].url) || '';
      // 302 Google 路由返回：candidates[0].content.parts[0].url
      if (!imageUrl && Array.isArray(json.candidates) && json.candidates[0] && json.candidates[0].content && Array.isArray(json.candidates[0].content.parts)) {
        const parts = json.candidates[0].content.parts;
        const urlPart = parts.find(p => typeof p.url === 'string' && p.url);
        if (urlPart) imageUrl = urlPart.url;
      }
      // 如仍未命中，打印结构帮助定位
      if (!imageUrl && json.candidates && json.candidates[0]) {
        // 调试需要时可打印 json.candidates[0]
      }
    } catch (e) {
      console.warn('[NanoBanana] 返回非 JSON 或解析失败，已原样打印');
    }

    console.log('[NanoBanana] 解析出的 imageUrl:', imageUrl);
    return { title: '', imageUrl: imageUrl || '' };
  } catch (e) {
    console.error('[NanoBanana] 调用失败:', e.message || e);

    // 重试逻辑：仅允许 1 次重试，且只在网络错误或超时时触发
    if (retryCount < 1 && (e.name === 'AbortError' || e.message.includes('Failed to fetch') || e.message.includes('ERR_CONNECTION'))) {
      console.log('[NanoBanana] 超时/网络错误，准备重试一次...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      return callNanoBanana(imagePromptFromGemini, retryCount + 1);
    }

    return { title: '', imageUrl: '' };
  }
}


// 3. 生成插图
async function generateImages(sections) {
    try {
        console.log('开始生成插图（仅控制台输出，不改渲染）');

        if (!Array.isArray(sections) || sections.length === 0) {
            console.warn('[NanoBanana] sections 为空或非数组，跳过生成');
            return sections || [];
        }

        const totalImages = sections.length;
        const imageUrls = [];

        // 逐个生成插图以显示进度
        for (let index = 0; index < sections.length; index++) {
            const section = sections[index];
            const promptFromGemini = section && section.imagePrompt;

            if (!promptFromGemini) {
                console.warn(`[NanoBanana] 第${index + 1}个缺少 imagePrompt，跳过`);
                imageUrls.push(null);
                continue;
            }

            // 更新进度显示
            const currentProgress = index + 1;
            updateActivityDetails(`正在生成插图 ${currentProgress}/${totalImages}`, `为模块"${section.sectionTitle || section.title || '未知模块'}"生成配套图表...`);

            try {
                const { imageUrl } = await callNanoBanana(promptFromGemini);
                console.log(`[NanoBanana] 第${index + 1}个模块`, 'title=', section.sectionTitle || '', 'imageUrl=', imageUrl);
                imageUrls.push(imageUrl);
            } catch (error) {
                console.error(`[NanoBanana] 第${index + 1}个模块插图生成失败:`, error);
                imageUrls.push(null);
            }
        }

        console.log('[NanoBanana] 生成结果汇总:', imageUrls);

        // 写回到各自的 section，确保顺序一致；失败则置空，不使用占位图
        sections.forEach((section, index) => {
            section.imageUrl = imageUrls[index] || '';
        });

        return sections;

    } catch (error) {
        console.error('生成插图失败:', error);
        // 不中断上层流程，返回原数据
        return sections || [];
    }
}

// ==================== 核心功能函数 ====================


// ==================== 日期编辑功能 ====================
function initDateEditor() {
    const displayDate = document.getElementById('display-date');
    const editBtn = document.getElementById('edit-date-btn');
    const datePicker = document.getElementById('date-picker');

    editBtn.addEventListener('click', () => {
        displayDate.classList.add('hidden');
        editBtn.classList.add('hidden');
        datePicker.classList.remove('hidden');
        datePicker.focus();
    });

    datePicker.addEventListener('change', () => {
        const selectedDate = new Date(datePicker.value);
        const formattedDate = formatChineseDate(selectedDate);
        displayDate.textContent = formattedDate;

        displayDate.classList.remove('hidden');
        editBtn.classList.remove('hidden');
        datePicker.classList.add('hidden');
    });

    datePicker.addEventListener('blur', () => {
        displayDate.classList.remove('hidden');
        editBtn.classList.remove('hidden');
        datePicker.classList.add('hidden');
    });
}

function formatChineseDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
}

// ==================== 示例文章功能 ====================
function initExampleArticles() {
    const container = document.getElementById('example-articles');

    EXAMPLE_ARTICLES.forEach(article => {
        const item = document.createElement('div');
        item.className = 'example-item';

        item.innerHTML = `
            <div class="example-title">${article.title}</div>
            <div class="example-actions">
                <button class="example-btn use-btn" data-url="${article.url}">
                    📝 使用
                </button>
                <a href="${article.url}" target="_blank" class="example-btn view-btn">
                    🔗 查看原文
                </a>
            </div>
        `;

        // 点击标题或使用按钮填入链接
        const useBtn = item.querySelector('.use-btn');
        const title = item.querySelector('.example-title');

        [useBtn, title].forEach(element => {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                const urlInput = document.getElementById('news-url');
                urlInput.value = article.url;
                urlInput.focus();
            });
        });

        container.appendChild(item);
    });
}

// ==================== 二维码生成功能 ====================
// 动态加载脚本
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve(true);
        s.onerror = () => reject(new Error('Failed to load ' + src));
        document.head.appendChild(s);
    });
}

async function ensureQRCodeLib() {
    if (typeof QRCode !== 'undefined') return 'ready';
    const candidates = [
        'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
        'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    ];
    for (const url of candidates) {
        try {
            await loadScript(url);
            if (typeof QRCode !== 'undefined') return 'ready';
        } catch (e) {
            console.warn('[QRCode] 备用地址加载失败:', url);
        }
    }
    return 'failed';
}

function generateQRCode(url) {
    const canvas = document.getElementById('qr-canvas');
    const qrSection = document.getElementById('qr-section');

    if (!url || !canvas) {
        console.warn('二维码生成失败: URL或canvas元素不存在');
        return;
    }

    // 如果库未加载，尝试动态加载后再生成
    (async () => {
        if (typeof QRCode === 'undefined') {
            console.warn('QRCode库未加载，尝试动态加载...');
            const ok = await ensureQRCodeLib();
            if (ok !== 'ready') {
                console.error('二维码生成失败: QRCode库未加载');
                return;
            }
        }

        try {
            if (typeof QRCode.toCanvas === 'function') {
                QRCode.toCanvas(canvas, url, {
                    width: 120,
                    height: 120,
                    margin: 1,
                    color: { dark: '#333333', light: '#00000000' }
                }, (error) => {
                    if (error) {
                        console.error('二维码生成失败:', error);
                    } else {
                        qrSection.classList.remove('hidden');
                    }
                });
            } else if (typeof QRCode === 'function') {
                // qrcodejs 版本
                const container = document.querySelector('.qr-code-container');
                container.innerHTML = '';
                const div = document.createElement('div');
                container.appendChild(div);
                /* global QRCode */
                new QRCode(div, {
                    text: url,
                    width: 120,
                    height: 120,
                    colorDark: '#333333',
                    colorLight: '#00000000',
                    correctLevel: QRCode.CorrectLevel.M
                });
                qrSection.classList.remove('hidden');
            } else {
                console.error('二维码生成失败: 未检测到可用的QRCode接口');
            }
        } catch (error) {
            console.error('二维码生成异常:', error);
        }
    })();
}

// ==================== UI 控制函数 ====================

// 显示输入弹窗
function showInputModal() {
    const modal = document.getElementById('input-modal');
    modal.classList.remove('hidden');
    document.getElementById('news-url').focus();
}

// 隐藏输入弹窗
function hideInputModal() {
    const modal = document.getElementById('input-modal');
    modal.classList.add('hidden');
    document.getElementById('news-url').value = '';
}

// 显示加载状态
function showLoading(title, description, progress = 0, step = 0, activityText = '', activityDetails = '') {
    const loading = document.getElementById('loading-overlay');
    document.getElementById('loading-title').textContent = title;
    document.getElementById('loading-description').textContent = description;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `${progress}%`;

    // 更新步骤指示器
    updateStepIndicators(step);

    // 更新当前活动
    if (activityText) {
        document.querySelector('.activity-text').textContent = activityText;
        document.querySelector('.activity-details').textContent = activityDetails;
    }

    loading.classList.remove('hidden');
}

// 更新步骤指示器
function updateStepIndicators(currentStep) {
    const steps = document.querySelectorAll('.step-item');
    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed');

        if (stepNumber < currentStep) {
            step.classList.add('completed');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
        }
    });
}

// 更新活动详情（用于插图生成进度）
function updateActivityDetails(activityText, activityDetails) {
    const activityTextElement = document.querySelector('.activity-text');
    const activityDetailsElement = document.querySelector('.activity-details');

    if (activityTextElement && activityText) {
        activityTextElement.textContent = activityText;
    }
    if (activityDetailsElement && activityDetails) {
        activityDetailsElement.textContent = activityDetails;
    }
}

// 隐藏加载状态
function hideLoading() {
    const loading = document.getElementById('loading-overlay');
    loading.classList.add('hidden');
}

// 显示错误信息
function showError(message) {
    hideLoading();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    const container = document.getElementById('report-container');
    container.insertBefore(errorDiv, container.firstChild);

    // 3秒后自动移除错误信息
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

// ==================== 内容渲染函数 ====================

// 渲染简报内容
function renderReport(data) {
    // 更新标题和日期
    document.querySelector('.main-title').textContent = data.articleTitle;
    document.querySelector('.date').textContent = data.publishDate;

    // 更新关键词导航
    const nav = document.querySelector('.nav');
    nav.innerHTML = '';
    data.keywords.forEach((keyword, index) => {
        const link = document.createElement('a');
        link.href = `#section-${index}`;
        link.textContent = keyword;
        nav.appendChild(link);
    });

    // 清空现有sections
    const existingSections = document.querySelectorAll('.section');
    existingSections.forEach(section => section.remove());

    // 渲染新的sections
    const container = document.getElementById('report-container');
    const qrSection = document.getElementById('qr-section');
    data.sections.forEach((sectionData, index) => {
        const sectionElement = createSectionElement(sectionData, index);
        if (qrSection) {
            container.insertBefore(sectionElement, qrSection);
        } else {
            container.appendChild(sectionElement);
        }
    });

    // 图标已全局移除：不再调用 updateIcons

    // 重新绑定平滑滚动
    bindSmoothScroll();
}

// 创建section元素
function createSectionElement(sectionData, index) {
    const section = document.createElement('section');
    section.id = `section-${index}`;
    section.className = 'section';

    // 创建标题（移除所有图标，统一左对齐）
    const title = document.createElement('h2');
    title.className = 'section-title';

    const titleText = document.createElement('span');
    titleText.className = 'section-title-text';
    titleText.textContent = sectionData.sectionTitle;

    title.appendChild(titleText);

    // 创建内容区域
    const content = document.createElement('div');
    content.className = 'content';

    // 添加主要文本
    if (sectionData.sectionContent.mainText) {
        const mainPara = document.createElement('p');
        const sanitized = sanitizeMarkdown(sectionData.sectionContent.mainText);
        mainPara.innerHTML = processTextWithHighlights(
            sanitized,
            sectionData.sectionContent.highlights || []
        );
        content.appendChild(mainPara);
    }

    // 添加引用内容
    if (sectionData.sectionContent.quotes && sectionData.sectionContent.quotes.length > 0) {
        sectionData.sectionContent.quotes.forEach(quote => {
            const quoteDiv = document.createElement('div');
            quoteDiv.className = 'key-point';
            const quotePara = document.createElement('p');
            quotePara.textContent = quote;
            quoteDiv.appendChild(quotePara);
            content.appendChild(quoteDiv);
        });
    }

    // 添加数据点 - 双排胶囊布局
    if (sectionData.sectionContent.dataPoints && sectionData.sectionContent.dataPoints.length > 0) {
        const dataContainer = document.createElement('div');
        dataContainer.className = 'data-points-container';

        sectionData.sectionContent.dataPoints.forEach(dataPoint => {
            const dataDiv = document.createElement('div');
            dataDiv.className = 'data-point';
            dataDiv.textContent = dataPoint;
            dataContainer.appendChild(dataDiv);
        });

        content.appendChild(dataContainer);
    }

    // 添加图片（失败不占位）：确保 onload/onerror 稳健触发，并处理缓存瞬时完成的场景
    if (sectionData.imageUrl) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';

        const img = new Image();
        // 尽可能启用跨域图片加载，便于后续截图（需要目标服务器允许 CORS）
        img.crossOrigin = 'anonymous';
        console.log('[Images] 准备加载:', sectionData.imageUrl);
        img.decoding = 'async';
        img.loading = 'eager';
        img.alt = `${sectionData.sectionTitle}相关图表`;
        img.style.display = 'none';

        const onSuccess = () => {
            try {
                img.style.display = '';
                if (!imageContainer.parentNode) content.appendChild(imageContainer);
                if (!img.parentNode) imageContainer.appendChild(img);
                console.log('[Images] 加载成功:', img.src);
            } catch (e) { /* no-op */ }
        };
        const onError = () => {
            try {
                console.warn('[Images] 加载失败，已跳过:', sectionData.imageUrl);
                imageContainer.remove();
            } catch (e) { /* no-op */ }
        };

        img.addEventListener('load', onSuccess, { once: true });
        img.addEventListener('error', onError, { once: true });

        // 先设置 src，再兜底处理“立即完成（缓存命中）”的情况
        img.src = sectionData.imageUrl;
        if (img.complete && img.naturalWidth > 0) {
            onSuccess();
        }
    }

    section.appendChild(title);
    section.appendChild(content);

    return section;
}

// 文本预处理：移除 Markdown 粗体/斜体标记与残留星号
function sanitizeMarkdown(str = '') {
    if (typeof str !== 'string') return '';
    let s = String(str);
    // 去除 **bold**、*italic*、__bold__、_italic_
    s = s.replace(/\*\*(.*?)\*\*/g, '$1')
         .replace(/\*(.*?)\*/g, '$1')
         .replace(/__(.*?)__/g, '$1')
         .replace(/_(.*?)_/g, '$1');
    // 清理成串星号（如 **、***）
    s = s.replace(/\*{2,}/g, '');
    return s;
}

function escapeRegExp(str = '') {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// === 相似度辅助：归一化与编辑距离 ===
function normalizeForSimilarity(s = '') {
  return String(s)
    .replace(/<[^>]*>/g, '') // 去掉 HTML 标签
    .replace(/[\s，。,\.；;：:、\-——()\[\]“”"‘’《》<>·…]/g, '') // 去空白与常见中英文标点
    .toLowerCase();
}

function levenshtein(a = '', b = '') {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1,         // 删除
        dp[j - 1] + 1,     // 插入
        prev + cost        // 替换/匹配
      );
      prev = tmp;
    }
  }
  return dp[n];
}

function similarityRatio(a = '', b = '') {
  const A = normalizeForSimilarity(a);
  const B = normalizeForSimilarity(b);
  if (!A.length && !B.length) return 1;
  if (!A.length || !B.length) return 0;
  const dist = levenshtein(A, B);
  const maxLen = Math.max(A.length, B.length);
  return 1 - dist / maxLen;
}


// 处理文本中的高亮内容（占位符法，避免相互污染）
function processTextWithHighlights(text, highlights) {
    let processed = sanitizeMarkdown(text);
    const basePlainForSim = processed.replace(/<[^>]*>/g, '');
    if (!Array.isArray(highlights) || highlights.length === 0) return processed;

    const mappings = [];
    let tokenSeq = 0;

    const tryReplaceWithRegex = (pattern, cls, idx) => {
        const regex = new RegExp(pattern, 'g');
        let localCount = 0;
        let replacedAny = false;
        processed = processed.replace(regex, (match) => {
            if (localCount >= 8) return match; // 每条高亮最多替换 8 处
            const token = `@@H${idx}_${tokenSeq++}@@`;
            mappings.push({ token, replacement: `<span class="${cls}">${match}</span>` });
            localCount++;
            replacedAny = true;
            return token;
        });
        return replacedAny;
    };

    highlights.forEach((h, idx) => {
        const raw = (h && h.text) || '';
        const clean = sanitizeMarkdown(raw).trim();
        if (!clean) return;

        const cls = `highlight highlight-${h.type || 'red'}`;

        // 1) 首选：近乎精确匹配（仅放宽空白差异）
        const strictPattern = escapeRegExp(clean).replace(/\s+/g, '\\s*');
        let matched = tryReplaceWithRegex(strictPattern, cls, idx);

        // 2) 兜底：如果严格匹配不到，则按中文逗号/顿号/句号等切片，
        //    选取最长片段(长度>=4)进行匹配，提升容错（应对同义改写、插词等）
        if (!matched) {
            const fragments = clean
                .split(/[，。,\.；;：:、\s\-——\(\)\[\]“”"‘’]+/)
                .map(s => s.trim())
                .filter(Boolean)
                .sort((a, b) => b.length - a.length);

            for (const frag of fragments) {
                if (frag.length < 4) break; // 过短片段不高亮，避免噪声
                const fragPattern = escapeRegExp(frag).replace(/\s+/g, '\\s*');
                if (tryReplaceWithRegex(fragPattern, cls, idx)) {
                    matched = true;
                    break;
                }
            }
        }

        // 3) 相似度兜底：在全文候选句中寻找与 highlight 最相近的句子，
        //    若相似度 >= 0.95，则视为匹配成功并高亮该候选句
        if (!matched) {
            const targetNorm = normalizeForSimilarity(clean);
            if (targetNorm.length >= 6) { // 太短的文本相似度不稳定，避免误报
                const candidates = basePlainForSim
                    .split(/[。！？!?；;：:\n]+/)
                    .map(s => s.trim())
                    .filter(Boolean)
                    .sort((a, b) => b.length - a.length); // 先长后短，提升命中稳定性
                let best = { score: 0, sent: null };
                for (const sent of candidates) {
                    const score = similarityRatio(sent, clean);
                    if (score > best.score) best = { score, sent };
                    if (best.score >= 0.995) break; // 极高相似度，提前结束
                }
                if (best.sent && best.score >= 0.95) {
                    const candPattern = escapeRegExp(best.sent).replace(/\s+/g, '\\s*');
                    matched = tryReplaceWithRegex(candPattern, cls, idx) || matched;
                }
            }
        }
    });

    // 统一回填占位符
    mappings.forEach(({ token, replacement }) => {
        processed = processed.split(token).join(replacement);
    });

    // 收尾：若仍残留星号，再清一次（不影响 HTML）
    processed = processed.replace(/\*{2,}/g, '');
    return processed;
}

function downloadImage() {
    const node = document.getElementById('report-container');

    // 检测设备类型
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    console.log('设备检测:', { isMobile, userAgent: navigator.userAgent });

    // 获取实际尺寸
    const computedStyle = window.getComputedStyle(node);
    const actualWidth = node.scrollWidth;
    const actualHeight = node.scrollHeight;

    console.log('容器尺寸:', {
        scrollWidth: actualWidth,
        scrollHeight: actualHeight,
        clientWidth: node.clientWidth,
        clientHeight: node.clientHeight,
        offsetWidth: node.offsetWidth,
        offsetHeight: node.offsetHeight,
        isMobile: isMobile
    });

    // 移动端使用更保守的设置
    const options = isMobile ? {
        quality: 0.7,
        width: Math.min(actualWidth, 1000),
        height: actualHeight,
        bgcolor: '#f5f2e8',
        pixelRatio: 1,
        cacheBust: true,
        imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        filter: function(node) {
            try {
                // 跳过含有跨域背景图的元素
                const cs = node.nodeType === 1 ? window.getComputedStyle(node) : null;
                if (cs && cs.backgroundImage && /url\(/.test(cs.backgroundImage) && /^url\((?!['"]?data:)/.test(cs.backgroundImage)) return false;
                // 跳过跨域 <img>
                if (node.tagName === 'IMG') {
                    const src = node.getAttribute('src') || '';
                    if (src && !/^data:|^blob:|^\//.test(src) && !src.includes(window.location.host)) return false;
                }
            } catch(e) {}
            return true;
        }
    } : {
        quality: 1.0,
        width: actualWidth,
        height: actualHeight,
        style: {
            margin: '0',
            padding: computedStyle.padding,
            boxSizing: 'border-box'
        },
        bgcolor: '#f5f2e8'
    };

    // 添加超时处理
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('下载超时')), isMobile ? 12000 : 30000);
    });

    Promise.race([
        domtoimage.toPng(node, options),
        timeoutPromise
    ])
        .then(function (dataUrl) {
            console.log('图片生成成功，数据长度:', dataUrl.length);

            if (isMobile) {
                // 移动端使用不同的下载方式
                try {
                    // 方式1：尝试直接下载
                    const link = document.createElement('a');
                    link.download = '财经时事资讯简报-' + new Date().toISOString().slice(0, 10) + '.png';
                    link.href = dataUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (e) {
                    console.warn('移动端直接下载失败，尝试新窗口方式:', e);
                    // 方式2：新窗口打开图片
                    const newWindow = window.open();
                    newWindow.document.write(`
                        <html>
                            <head><title>财经简报</title></head>
                            <body style="margin:0;padding:20px;text-align:center;">
                                <p>长按图片保存到相册</p>
                                <img src="${dataUrl}" style="max-width:100%;height:auto;" alt="财经简报"/>
                            </body>
                        </html>
                    `);
                }
            } else {
                // 桌面端使用标准下载方式
                const link = document.createElement('a');
                link.download = '财经时事资讯简报-' + new Date().toISOString().slice(0, 10) + '.png';
                link.href = dataUrl;
                link.click();
            }
        })
        .catch(async function (error) {
            console.error('下载图片时出错:', error);

            // 尝试兜底方案：html-to-image（按需动态加载，不引入 html2canvas）
            try {
                console.log('[fallback] 使用 html-to-image 重试...');
                const { toPng } = await import('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/+esm');
                const htiOptions = {
                    backgroundColor: '#f5f2e8',
                    pixelRatio: isMobile ? 1 : (window.devicePixelRatio || 1),
                    cacheBust: true,
                    imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                    filter: (options && options.filter) ? options.filter : undefined,
                    width: options.width,
                    height: options.height,
                    style: options.style
                };
                const dataUrl = await toPng(node, htiOptions);

                const loadingDiv = document.getElementById('download-loading');
                if (loadingDiv) loadingDiv.remove();

                if (isMobile) {
                    // 新窗口展示，长按保存
                    const w = window.open('', '_blank');
                    if (w) {
                        w.document.write(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>财经简报</title></head><body style="margin:0;padding:20px;text-align:center;background:#f0f0f0"><div style="background:#fff;padding:12px;border-radius:8px;margin-bottom:12px;">长按下方图片保存到相册</div><img src="${dataUrl}" style="max-width:100%;height:auto;border-radius:8px;" alt="财经简报"/></body></html>`);
                        w.document.close();
                        return;
                    }
                } else {
                    const link = document.createElement('a');
                    link.download = '财经时事资讯简报-' + new Date().toISOString().slice(0, 10) + '.png';
                    link.href = dataUrl;
                    link.click();
                    return;
                }
            } catch (fallbackErr) {
                console.error('[fallback] html-to-image 也失败:', fallbackErr);
            }

            if (isMobile) {
                alert('移动端图片生成失败，建议：\n1. 尝试刷新页面后重试\n2. 使用桌面浏览器访问\n3. 截屏保存页面内容');
            } else {
                alert('下载图片时出错，请重试');
            }
        });
}

// ==================== 主要生成流程 ====================

// 生成简报的主函数
async function generateReport(newsUrl) {
    try {
        // 步骤1: 爬取新闻内容
        showLoading(
            '正在获取新闻内容...',
            '正在从指定链接爬取新闻内容',
            10,
            1,
            '连接到新闻源',
            '正在建立连接并获取页面内容...'
        );
        const newsContent = await fetchNewsContent(newsUrl);

        // 步骤2: 提炼内容
        showLoading(
            '正在分析内容...',
            '使用AI分析新闻内容并提取关键信息',
            30,
            2,
            'AI智能分析中',
            '正在提取关键信息、生成摘要和结构化数据...'
        );
        const extractedData = await extractNewsContent(newsContent);

        // 步骤3: 生成插图
        showLoading(
            '正在生成插图...',
            '为每个模块生成相关插图',
            60,
            3,
            '创作专业插图',
            `正在为 ${extractedData.sections?.length || 0} 个模块生成配套图表...`
        );
        const sectionsWithImages = await generateImages(extractedData.sections);
        extractedData.sections = sectionsWithImages;

        // 步骤4: 渲染内容
        showLoading(
            '正在生成简报...',
            '渲染最终的简报页面',
            90,
            4,
            '渲染简报页面',
            '正在组装内容、应用样式并生成二维码...'
        );
        renderReport(extractedData);

        // 生成二维码
        generateQRCode(newsUrl);

        // 完成
        showLoading(
            '生成完成!',
            '简报已成功生成',
            100,
            4,
            '简报生成完成',
            '所有内容已准备就绪，您可以开始阅读了！'
        );
        setTimeout(() => {
            hideLoading();
        }, 1500);

    } catch (error) {
        console.error('生成简报失败:', error);
        showError(error.message);
    }
}

// ==================== 事件绑定 ====================

// 绑定平滑滚动
function bindSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化日期编辑功能
    initDateEditor();

    // 初始化示例文章
    initExampleArticles();

    // 绑定平滑滚动
    bindSmoothScroll();

    // 绑定生成按钮事件
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', showInputModal);
    }

    // 绑定弹窗事件
    const modal = document.getElementById('input-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const confirmBtn = document.getElementById('confirm-btn');
    const newsUrlInput = document.getElementById('news-url');



    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideInputModal);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', async function() {
            const newsUrl = newsUrlInput.value.trim();
            if (!newsUrl) {
                alert('请输入新闻链接');
                return;
            }

            // 简单的URL验证
            try {
                new URL(newsUrl);
            } catch {
                alert('请输入有效的URL链接');
                return;
            }

            hideInputModal();
            await generateReport(newsUrl);
        });
    }

    // 支持回车键确认
    if (newsUrlInput) {
        newsUrlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                confirmBtn.click();
            }
        });
    }

    // 点击遮罩层关闭弹窗
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideInputModal();
            }
        });
    }
});

// ==================== 移动端调试工具 ====================
// 移动端加载 Eruda 调试工具
(function() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && window.location.search.includes('debug=1')) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/eruda@3.0.1/eruda.min.js';
        script.onload = function() {
            eruda.init();
            console.log('移动端调试工具已启用');
        };
        document.head.appendChild(script);
    }
})();

// ==================== 统一代理适配（运行时配置） ====================
// 页面加载完成后，根据环境自动配置API端点
(function() {
    const currentEnv = ENV_CONFIG.getEnvironment();
    const proxy = API_CONFIG?.UNIFUNS?.proxyEndpoint;

    // 输出当前环境信息（便于调试）
    console.log(`[环境] 当前环境: ${currentEnv}`);
    console.log(`[环境] 代理端点: ${proxy}`);

    // 注意：目前只有 Unifuns 使用代理，Gemini 和 Nano Banana 暂时直连
    // 等后端 multi_handler.py 完善 Gemini/NB 代理后，可启用以下代码：

    /*
    if (proxy) {
        // 将 Gemini 和 Nano Banana 的请求都指向统一代理
        API_CONFIG.GEMINI.endpoint = proxy + '?service=gemini';
        API_CONFIG.GEMINI.useProxy = true;
        API_CONFIG.GEMINI.apiKey = ''; // 清空前端密钥

        API_CONFIG.NANO_BANANA.endpoint = proxy + '?service=image';
        API_CONFIG.NANO_BANANA.useProxy = true;
        API_CONFIG.NANO_BANANA.apiKey = ''; // 清空前端密钥

        console.log(`[环境] Gemini端点: ${API_CONFIG.GEMINI.endpoint}`);
        console.log(`[环境] NanoBanana端点: ${API_CONFIG.NANO_BANANA.endpoint}`);
    }
    */

    console.log(`[环境] Gemini直连: ${API_CONFIG.GEMINI.endpoint}`);
    console.log(`[环境] NanoBanana直连: ${API_CONFIG.NANO_BANANA.endpoint}`);
})();
