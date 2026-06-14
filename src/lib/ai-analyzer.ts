import OpenAI from "openai";
import { RawHotTopic } from "./fetchers";

// 通过 OpenRouter 接入 DeepSeek 系列模型
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://hot-monitor.ai",
    "X-Title": "WKR Hot Monitor",
  },
});

// 标准清洗用模型（快、结构化输出稳定）
const STANDARD_MODEL = process.env.DEEPSEEK_MODEL || "deepseek/deepseek-chat";
// 深度推理裁判用模型
const REASONING_MODEL =
  process.env.DEEPSEEK_REASONING_MODEL || "deepseek/deepseek-r1";

function hasKey() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn("⚠️ OPENROUTER_API_KEY 未配置。");
    return false;
  }
  return true;
}

/** 从模型输出中稳健提取 JSON（兼容 markdown 代码块 / 推理前缀） */
function extractJSON<T = unknown>(raw: string | null): T | null {
  if (!raw) return null;
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  try {
    return JSON.parse(text) as T;
  } catch {
    const firstObj = text.indexOf("{");
    const firstArr = text.indexOf("[");
    const start =
      firstArr === -1
        ? firstObj
        : firstObj === -1
          ? firstArr
          : Math.min(firstObj, firstArr);
    if (start === -1) return null;
    const openChar = text[start];
    const closeChar = openChar === "{" ? "}" : "]";
    const end = text.lastIndexOf(closeChar);
    if (end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1)) as T;
    } catch (e) {
      console.error("无法解析模型 JSON 输出:", e);
      return null;
    }
  }
}

// ====================================================
// 关键词监控 + AI 防伪裁判（功能二，单模型版本）
// ====================================================
export interface KeywordAnalysis {
  isTrueHotTopic: boolean;
  confidenceScore: number;
  title: string;
  summary: string;
  analysis?: string;
  sources: string[];
}

export async function analyzeHotTopics(
  keyword: string,
  rawData: RawHotTopic[],
): Promise<KeywordAnalysis | null> {
  if (!hasKey()) return null;

  const payload = JSON.stringify(rawData.slice(0, 30));

  const completion = await openai.chat.completions.create({
    model: REASONING_MODEL,
    messages: [
      {
        role: "system",
        content: `你是资深科技情报分析师与"AI 防伪裁判"。针对关键词"${keyword}"的多源抓取数据进行判别。
裁判准则：
1. 信源权威度：是否有官方域名、Arxiv 论文、GitHub 源码或主流技术媒体支撑。
2. 反炒作过滤：剔除"炸裂""震惊""超越一切"等缺乏数据支撑的极端营销词。
3. 多源印证：海内外来源能否形成逻辑闭环；单一可疑来源判为低可信。
合并讨论同一事件的多条来源为一个热点。

仅输出 JSON（无 markdown）：
{
  "isTrueHotTopic": boolean,
  "confidenceScore": number,   // 0.0-1.0
  "title": string,             // <=20 字
  "summary": string,           // <=100 字 一句话核心
  "analysis": string,          // <=80 字 判定理由
  "sources": string[]          // 佐证 URL
}`,
      },
      {
        role: "user",
        content: `以下是抓取到的原始数据 JSON：\n\n${payload}`,
      },
    ],
    temperature: 0.2,
  });

  return extractJSON<KeywordAnalysis>(completion.choices[0]?.message?.content);
}

// ====================================================
// 功能一：每日 10:00 公共热点看板（聚类 + Top 5 排序）
// ====================================================
export interface BoardTopic {
  rank: number;
  title: string;
  summary: string;
  evolution: string;
  analysis: string;
  sources: string[];
  confidence: number;
}

export async function generateDailyBoard(
  rawData: RawHotTopic[],
): Promise<BoardTopic[]> {
  if (!hasKey() || rawData.length === 0) return [];

  const payload = JSON.stringify(rawData.slice(0, 60));

  const completion = await openai.chat.completions.create({
    model: STANDARD_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `你是 AI 行业主编。从过去 24 小时全网多源数据（HackerNews / GitHub / Bilibili 等）中，提炼**最具含金量的 Top 5 AI 进展**。
要求：
- 去重、聚类：同一事件的不同来源合并为一条。
- 按"热度 × 真实性"排序，rank=1 为最确凿的头条。
- 过滤营销炒作与未经证实的传闻。
- evolution 用一两句话描述事件演进脉络/背景。
- confidence 表示 AI 对其真实性与重要性的综合置信度 (0.0-1.0)。

仅输出 JSON 对象：
{
  "topics": [
    {
      "rank": 1,
      "title": "<=24字 标题",
      "summary": "<=120字 摘要",
      "evolution": "<=120字 演进脉络",
      "analysis": "<=80字 价值/真实性判定",
      "sources": ["url", ...],
      "confidence": 0.0
    }
  ]
}
最多 5 条，按 rank 升序。`,
      },
      {
        role: "user",
        content: `原始聚合数据 JSON：\n\n${payload}`,
      },
    ],
    temperature: 0.3,
  });

  const parsed = extractJSON<{ topics?: BoardTopic[] }>(
    completion.choices[0]?.message?.content,
  );
  return (parsed?.topics || []).slice(0, 5);
}

// ====================================================
// 功能三：领域周期性深挖简报
// ====================================================
export interface BriefingSection {
  title: string;
  description: string;
}
export interface DomainBriefingResult {
  title: string;
  summary: string;
  sections: BriefingSection[];
}

export async function generateDomainBriefing(
  domainName: string,
  rawData: RawHotTopic[],
  periodLabel: string,
): Promise<DomainBriefingResult | null> {
  if (!hasKey()) return null;

  const payload = JSON.stringify(rawData.slice(0, 60));

  const completion = await openai.chat.completions.create({
    model: STANDARD_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `你是"${domainName}"领域的资深分析师。基于过去 ${periodLabel} 该领域收集到的行业碎片、技术讨论与代码提交记录，撰写一份**结构化深度简报**。
要求：
- 提炼洞察而非罗列新闻；剔除营销噪声。
- 分 3-5 个章节 (sections)，每节有小标题与 2-4 句深度见解。
- 章节建议涵盖：核心进展、技术趋势、值得关注的项目/论文、潜在影响等。

仅输出 JSON 对象：
{
  "title": "简报标题",
  "summary": "<=120字 一句话概览",
  "sections": [
    { "title": "章节标题", "description": "深度见解，可换行" }
  ]
}`,
      },
      {
        role: "user",
        content: `该领域近期原始数据 JSON：\n\n${payload}`,
      },
    ],
    temperature: 0.4,
  });

  return extractJSON<DomainBriefingResult>(
    completion.choices[0]?.message?.content,
  );
}
