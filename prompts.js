// ==================== 提示词模板（拆分） ====================
const PROMPTS = {
    // Gemini 内容提炼提示词（采用 [R]/[Y] 内嵌标记主通道）
    CONTENT_EXTRACTION: `
我们要做一份好看的时事资讯简报，请仔细阅读用户输入的新闻内容并做信息提炼，保持原文的框架结构，合理分割为2-6个子模块，提炼出文章标题、关键词和每个子模块的信息。注意，新闻内容中审校信息、评论点赞信息等无关信息，不用于提炼。

## 需要输出的内容如下：（用 JSON 格式返回）

1. 文章标题及关键词：如果原文有标题，则采用原标题；关键词根据新闻内容提炼 3-5 个即可。

2. 子模块标题：如果原文可以分成相对独立的几个子模块，则提炼出模块标题。

3. 子模块内容：请在“mainText”字段中输出含内嵌标记的 Markdown 文本（单字段即可），并遵循以下“重点标记规则”：
   - 使用方括号标签标注重点（主通道）：
     - [R]…[/R] → 红色（red）：关键结论、重要观点、核心结论、重要现象
     - [Y]…[/Y] → 黄色（yellow）：趋势、背景脉络、风险提示等（请克制标注）
   - 约束：
     1）尽量整句标记；
     2）数字/日期必须完整（含单位、小数点、百分号、bp、区间连字符、年月日）；
     3）严禁嵌套或交错标记（红色与黄色均不得嵌套/交错）；
     4）数量控制：每段总重点 2–5 条；红色最多 3 处；黄色最多 1–2 条；避免整段覆盖（单段被标记字符占比不超过 40%）；
     5）标记应包含句尾标点更自然。
   - 可保留普通 Markdown（标题/换行/列表等），但不要使用 ** 或 * 来强调重点（重点仅用方括号标签）。

4. 引用与数据项：
   - quotes：若该模块提到了专家观点或官方声明，必须用 quotes 标识，并尽量将相关内容提炼到该字段（引用原话或清晰转述）。
   - dataPoints：若该模块包含关键的经济数据或金融市场数据，尽量提炼为简洁条目，放入该字段（保持真实、标注单位/区间/同比环比等）。

5. 子模块插图的提示词：根据模块内容撰写英文提示词（后续会调用其他模型生成插图）。
   模板：
   "A hand-drawn illustration of [some financial subject], featuring a line graph or chart showing [something], and using colored pencil style with blue, green, gold and red highlights. Add hand-drawn elements like [some icon] and [some sign]. Add annotations or labels in English like '[words or numbers]' if necessary. Keep a clean hand-drawn style suitable for a financial report. Attention, the background color must be #f5f2e8."
   要求：Annotations or labels MUST be in English only (no Chinese)。提示词中的文字或数字必须真实来自原文。

## JSON 输出格式：
{
  "articleTitle": "文章标题（如果原文有标题则采用原标题）",
  "publishDate": "发布日期（格式：YYYY年MM月DD日，如无明确日期可用今日）",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "sections": [
    {
      "sectionTitle": "子模块标题",
      "sectionContent": {
        "mainText": "含 [R]/[Y] 内嵌标记的 Markdown 文本（不超过500字）",
        "quotes": ["专家观点或官方声明（如该模块有提到，必须提炼到此）"],
        "dataPoints": ["关键经济/金融市场数据的要点条目（如有尽量提炼，标注单位/区间/同比环比等）"],
        "highlights": [] // 过渡期可留空或镜像 mainText 内的标记，前端不依赖此字段
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

// 暴露到全局（可选）
if (typeof window !== 'undefined') {
  window.PROMPTS = PROMPTS;
}

