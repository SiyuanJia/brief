// ==================== 环境与 API 配置（拆分） ====================
// 1) 环境配置
const ENV_CONFIG = {
  getEnvironment() {
    const hostname = window.location.hostname;
    if (hostname === 'siyuanjia.github.io' || hostname.includes('brief-prod')) {
      return 'production';
    }
    return 'development';
  },
  proxyEndpoints: {
    development: 'https://brief-pdondtcgjd.cn-hongkong.fcapp.run',
    production: 'https://brief-prod-skdpzkhhzk.cn-hongkong.fcapp.run'
  },
  getProxyEndpoint() {
    const env = this.getEnvironment();
    return this.proxyEndpoints[env];
  }
};

// 2) API 配置
const API_CONFIG = {
  UNIFUNS: {
    endpointAI: 'https://api.302.ai/unifuncs/api/web-reader/read',
    endpointCN: 'https://api.302ai.cn/unifuncs/api/web-reader/read',
    endpoint: 'https://api.302.ai/unifuncs/api/web-reader/read',
    region: 'ai',
    apiKey: '',
    useProxy: true,
    proxyEndpoint: ENV_CONFIG.getProxyEndpoint()
  },
  GEMINI: {
    endpoint: 'https://api.302.ai/v1/chat/completions',
    apiKey: 'sk-aE0CzP46qaMdvt1u1gcNZXBr0oDUWrzLaEJsjje8HBxnLJGA',
    useProxy: false
  },
  NANO_BANANA: {
    endpoint: 'https://api.302.ai/google/v1/models/gemini-2.5-flash-image-preview?response_format',
    apiKey: 'sk-l1k1WmtcTJOugQWCvkHFJUacCxdxIYyXwqss7yuGZLUHvwL3',
    useProxy: false
  }
};

// ==================== API 接口函数（拆分） ====================
// 1) 爬取新闻内容（Unifuns via 统一代理）
async function fetchNewsContent(newsUrl) {
  try {
    console.log('开始爬取新闻内容:', newsUrl);

    const useProxy = !!API_CONFIG.UNIFUNS.useProxy;
    const apiKey = (API_CONFIG.UNIFUNS.apiKey || '').trim();
    if (!useProxy) {
      if (!apiKey) throw new Error('未配置 Unifuns API 密钥');
      if (!apiKey.startsWith('sk-')) {
        console.warn('提示：当前API密钥似乎不是以 "sk-" 开头，可能不适用于该接口。');
      }
    }

    const myHeaders = new Headers();
    if (!useProxy) {
      myHeaders.append('Authorization', `Bearer ${apiKey}`);
    }
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append('Accept', 'application/json');

    const raw = JSON.stringify({
      url: newsUrl,
      format: 'markdown',
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
    API_CONFIG.UNIFUNS.endpoint = API_CONFIG.UNIFUNS.endpointAI;
    API_CONFIG.UNIFUNS.useProxy = true;

    const qs = new URLSearchParams({ url: newsUrl }).toString();
    const targetUrl = `${API_CONFIG.UNIFUNS.proxyEndpoint}?${qs}`;
    console.log('请求URL:', targetUrl);
    console.log('请求体:', raw);

    let response = await fetch(targetUrl, requestOptions);
    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch {}
      console.error('Unifuns错误响应体:', errText);
      throw new Error(`爬取失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.text();
    console.log('Unifuns API 返回（长度）:', result ? result.length : 0);

    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
      console.log('解析后的JSON数据:', parsedResult);
      return parsedResult.data || parsedResult.content || parsedResult;
    } catch {
      console.log('响应不是JSON格式，直接返回文本内容');
      return result;
    }
  } catch (error) {
    console.error('爬取新闻内容失败:', error);
    throw new Error(`无法获取新闻内容: ${error.message}`);
  }
}

// 2) 提炼新闻内容（Gemini via 302.ai）
async function extractNewsContent(newsContent) {
  try {
    console.log('开始提炼新闻内容');
    const prompt = PROMPTS.CONTENT_EXTRACTION.replace('{NEWS_CONTENT}', newsContent);

    const myHeaders = new Headers();
    myHeaders.append('Accept', 'application/json');
    myHeaders.append('Content-Type', 'application/json');
    if (!API_CONFIG.GEMINI.useProxy && API_CONFIG.GEMINI.apiKey) {
      myHeaders.append('Authorization', `Bearer ${API_CONFIG.GEMINI.apiKey}`);
    }

    const raw = JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }]
    });

    const requestOptions = { method: 'POST', headers: myHeaders, body: raw, redirect: 'follow' };
    const endpoint = API_CONFIG.GEMINI.endpoint || 'https://api.302.ai/v1/chat/completions';
    console.log('[Gemini] 请求 endpoint:', endpoint);
    console.log('[Gemini] 使用代理:', API_CONFIG.GEMINI.useProxy);

    const resp = await fetch(endpoint, requestOptions);
    const text = await resp.text();

    let parsedForUpstream = { sections: [] };
    const tryParseLooseJson = (s) => {
      if (typeof s !== 'string') return null;
      const trimmed = s.trim();
      const fenceMatch = trimmed.match(/```(?:json)?\n([\s\S]*?)```/i);
      const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
      try { return JSON.parse(candidate); } catch {}
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
        parsedForUpstream = content;
      }
    } catch {
      console.warn('[Gemini] 返回不是 JSON，已原样打印');
    }

    console.log('[Gemini] 提炼结果用于生成插图的 sections 数量 =', Array.isArray(parsedForUpstream.sections) ? parsedForUpstream.sections.length : 0);
    return parsedForUpstream;
  } catch (error) {
    console.error('提炼新闻内容失败:', error);
    return {};
  }
}

// 3) NanoBanana 图片生成（302.ai Google 路由）
function buildFinalImagePrompt(imagePromptFromGemini) {
  const suffix = " Additional requirements: background color must be #f5f2e8; hand-drawn colored pencil style with rich visual elements; include multiple charts, graphs, or infographics; add various financial icons like trending arrows, currency symbols, building silhouettes, and market indicators; use vibrant blue, green, gold, and red highlights; include small English annotations and data labels from the article; add decorative elements like grid lines, geometric shapes, and subtle patterns; create a visually engaging but professional financial illustration; no watermarks; no real faces; balanced composition with good visual hierarchy.";
  return `${imagePromptFromGemini} ${suffix}`;
}

async function callNanoBanana(imagePromptFromGemini, retryCount = 0) {
  try {
    const endpoint = API_CONFIG.NANO_BANANA.endpoint;
    const apiKey = (API_CONFIG.NANO_BANANA.apiKey || '').trim();
    if (!API_CONFIG.NANO_BANANA.useProxy && (!endpoint || !apiKey)) {
      console.warn('[NanoBanana] endpoint 或 apiKey 未配置，跳过调用');
      return { title: '', imageUrl: '' };
    }

    const prompt = buildFinalImagePrompt(imagePromptFromGemini);
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    if (!API_CONFIG.NANO_BANANA.useProxy && apiKey) {
      myHeaders.append('Authorization', `Bearer ${apiKey}`);
    }

    const raw = JSON.stringify({
      contents: [{ parts: [{ text: prompt }]}],
      generationConfig: { responseModalities: ['TEXT','IMAGE'] }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const requestOptions = { method: 'POST', headers: myHeaders, body: raw, redirect: 'follow', signal: controller.signal };
    console.log('[NanoBanana] 请求 endpoint:', endpoint, retryCount > 0 ? `(重试 ${retryCount})` : '');
    console.log('[NanoBanana] 使用代理:', API_CONFIG.NANO_BANANA.useProxy);
    console.log('[NanoBanana] 请求体 prompt 预览:', prompt.slice(0, 180) + (prompt.length>180?'…':''));

    const resp = await fetch(endpoint, requestOptions);
    clearTimeout(timeoutId);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

    const text = await resp.text();
    let imageUrl = '';
    try {
      const json = JSON.parse(text);
      imageUrl = json.imageUrl || json.url || (json.data && json.data[0] && json.data[0].url) || '';
      if (!imageUrl && Array.isArray(json.candidates) && json.candidates[0] && json.candidates[0].content && Array.isArray(json.candidates[0].content.parts)) {
        const parts = json.candidates[0].content.parts;
        const urlPart = parts.find(p => typeof p.url === 'string' && p.url);
        if (urlPart) imageUrl = urlPart.url;
      }
    } catch {
      console.warn('[NanoBanana] 返回非 JSON 或解析失败，已原样打印');
    }

    console.log('[NanoBanana] 解析出的 imageUrl:', imageUrl);
    return { title: '', imageUrl: imageUrl || '' };
  } catch (e) {
    console.error('[NanoBanana] 调用失败:', e.message || e);
    if (retryCount < 1 && (e.name === 'AbortError' || e.message.includes('Failed to fetch') || e.message.includes('ERR_CONNECTION'))) {
      console.log('[NanoBanana] 超时/网络错误，准备重试一次...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      return callNanoBanana(imagePromptFromGemini, retryCount + 1);
    }
    return { title: '', imageUrl: '' };
  }
}

async function generateImages(sections) {
  try {
    console.log('开始生成插图（仅控制台输出，不改渲染）');
    if (!Array.isArray(sections) || sections.length === 0) {
      console.warn('[NanoBanana] sections 为空或非数组，跳过生成');
      return sections || [];
    }

    const totalImages = sections.length;
    const imageUrls = [];
    for (let index = 0; index < sections.length; index++) {
      const section = sections[index];
      const promptFromGemini = section && section.imagePrompt;
      if (!promptFromGemini) {
        console.warn(`[NanoBanana] 第${index + 1}个缺少 imagePrompt，跳过`);
        imageUrls.push(null);
        continue;
      }
      const currentProgress = index + 1;
      if (typeof updateActivityDetails === 'function') {
        updateActivityDetails(`正在生成插图 ${currentProgress}/${totalImages}`, `为模块"${section.sectionTitle || section.title || '未知模块'}"生成配套图表...`);
      }
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
    sections.forEach((section, index) => { section.imageUrl = imageUrls[index] || ''; });
    return sections;
  } catch (error) {
    console.error('生成插图失败:', error);
    return sections || [];
  }
}

// 运行时环境输出与（可选）代理重定向
(function() {
  const currentEnv = ENV_CONFIG.getEnvironment();
  const proxy = API_CONFIG?.UNIFUNS?.proxyEndpoint;
  console.log(`[环境] 当前环境: ${currentEnv}`);
  console.log(`[环境] 代理端点: ${proxy}`);
  console.log(`[环境] Gemini直连: ${API_CONFIG.GEMINI.endpoint}`);
  console.log(`[环境] NanoBanana直连: ${API_CONFIG.NANO_BANANA.endpoint}`);
})();

// 暴露到全局
if (typeof window !== 'undefined') {
  window.ENV_CONFIG = ENV_CONFIG;
  window.API_CONFIG = API_CONFIG;
  window.fetchNewsContent = fetchNewsContent;
  window.extractNewsContent = extractNewsContent;
  window.callNanoBanana = callNanoBanana;
  window.generateImages = generateImages;
}

