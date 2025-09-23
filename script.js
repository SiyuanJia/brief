// ENV_CONFIG / API_CONFIG 已拆分至 api.js（保持全局同名常量可用）
// ==================== 提示词模板 ====================
// PROMPTS 常量已拆分到 prompts.js（确保在 index.html 中先于 script.js 加载）

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
// fetchNewsContent 已拆分至 api.js（保持全局函数名不变）

// 2. 提炼新闻内容
// extractNewsContent 已拆分至 api.js（保持全局函数名不变）
// ==================== Nano Banana 接口接入（仅控制台输出） ====================
// buildFinalImagePrompt / callNanoBanana  																								 moved to api.js


// 3. 生成插图
// generateImages 已拆分至 api.js（保持全局函数名不变）

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
        const raw = sectionData.sectionContent.mainText;
        // 新版：直接解析 mainText 中的 [R]/[B]/[G]/[Y] 标签进行渲染
        mainPara.innerHTML = renderTextWithBracketTags(raw);
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

// === 新：将 mainText 中的 [R]/[B]/[G]/[Y] 标签渲染为带颜色的高亮 ===
function escapeHTMLBasic(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderTextWithBracketTags(text = '') {
  let s = String(text || '').replace(/\r\n/g, '\n');
  // 1) 基础转义，防止注入；我们的方括号标签不受影响
  s = escapeHTMLBasic(s);
  // 2) 标签映射
  const apply = (tag, cls) => {
    const re = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\/${tag}\\]`, 'g');
    s = s.replace(re, (_m, inner) => `<span class="highlight highlight-${cls}">${inner}</span>`);
  };
  apply('R', 'red');
  apply('B', 'blue');
  apply('G', 'green');
  apply('Y', 'yellow');
  // 3) 兜底：去除任何残留/不成对的标签
  s = s.replace(/\[(?:\/)?(?:R|B|G|Y)\]/g, '');
  return s;
}

// 暴露渲染函数供测试页面使用
if (typeof window !== 'undefined') {
  window.renderTextWithBracketTags = renderTextWithBracketTags;
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


// [LEGACY] 以下为历史遗留的“highlights 匹配 mainText”算法，现已停用；渲染改为解析 [R]/[B]/[G]/[Y] 内嵌标签

// 处理文本中的高亮内容（占位符法，避免相互污染）
function processTextWithHighlights(text, highlights) {
    let processed = sanitizeMarkdown(text);
    const basePlainForSim = processed.replace(/<[^>]*>/g, '');
    if (!Array.isArray(highlights) || highlights.length === 0) return processed;

    const mappings = [];
    let tokenSeq = 0;

    const tryReplaceWithRegex = (pattern, cls, idx, wrapSentence = true) => {
        // 优先将匹配扩展为“整句”边界，避免碎片化；必要时可关闭 wrapSentence
        const sentenceWrapped = wrapSentence
            ? `[^。！？!?；;:\n]*?(?:${pattern})[^。！？!?；;:\n]*?`
            : pattern;
        const regex = new RegExp(sentenceWrapped, 'g');
        let localCount = 0;
        let replacedAny = false;
        processed = processed.replace(regex, (match) => {
            if (localCount >= 2) return match; // 控制每条高亮最多替换 2 处
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

        // A) 先做“整句相似”匹配：尽量高亮完整句子
        let matched = false;
        {
            const candidates = basePlainForSim
                .split(/[。！？!?；;：:\n]+/)
                .map(s => s.trim())
                .filter(Boolean);
            let best = { score: 0, sent: null };
            for (const sent of candidates) {
                const score = similarityRatio(sent, clean);
                if (score > best.score) best = { score, sent };
                if (best.score >= 0.995) break; // 极高相似度，提前结束
            }
            const dynamicThreshold = clean.length >= 12 ? 0.85 : 0.80;
            if (best.sent && best.score >= dynamicThreshold) {
                const candPattern = escapeRegExp(best.sent).replace(/\s+/g, '\\s*');
                matched = tryReplaceWithRegex(candPattern, cls, idx, false) || matched; // 候选已是整句，无需再扩句
            }
        }

        // B) 若整句匹配不成功，尝试严格匹配（仅放宽空白差异）
        if (!matched) {
            const strictPattern = escapeRegExp(clean)
                .replace(/\s+/g, '\\s*')
                .replace(/["“”]/g, '[“”\"]?'); //   
            matched = tryReplaceWithRegex(strictPattern, cls, idx, true);
        }

        // C) 最后兜底：仅当文本较长时才做片段匹配，避免碎片化
        if (!matched && clean.length >= 14) {
            const fragments = clean
                .split(/[，。,\.；;：:、\s\-——\(\)\[\]“”"‘’]+/)
                .map(s => s.trim())
                .filter(Boolean)
                .sort((a, b) => b.length - a.length);
            for (const frag of fragments) {
                if (frag.length < 6) break; // 更高门槛，减少碎片化
                const fragPattern = escapeRegExp(frag).replace(/\s+/g, '\\s*');
                if (tryReplaceWithRegex(fragPattern, cls, idx)) { matched = true; break; }
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

// downloadImage 已拆分至 download.js（保持全局函数名不变）



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

