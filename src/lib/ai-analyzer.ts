import OpenAI from 'openai';
import { RawHotTopic } from './fetchers';

// Initialize OpenAI client pointing to OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://hot-monitor.ai", // Required by OpenRouter for ranking
    "X-Title": "WKR Hot Monitor", // Optional
  }
});

// ==============================
// Phase 3: AI Intelligence Engine
// ==============================
export async function analyzeHotTopics(keyword: string, rawData: RawHotTopic[]) {
  if (!process.env.OPENROUTER_API_KEY) {
      console.warn("⚠️ OPENROUTER_API_KEY is not configured.");
      return null;
  }

  const payload = JSON.stringify(rawData);

  const completion = await openai.chat.completions.create({
    // Use an intelligent model suitable for reasoning and classification
    model: "anthropic/claude-3.5-sonnet", // Or "openai/gpt-4o"
    messages: [
      {
        role: "system",
        content: `You are an expert tech news analyst and researcher. Your task is to examine recent online posts related to the keyword: "${keyword}".
Goal:
1. Filter out rumors, "clickbait", extreme emotion venting, and outdated news.
2. If multiple sources (e.g. HackerNews and Twitter) mention the same event, merge them into ONE hot topic.
3. Identify if any true "Industry Hot Topic" or "Breaking News" has occurred.

Format: Return pure JSON without markdown backticks.
Schema:
{
  "isTrueHotTopic": boolean,
  "confidenceScore": number, // 0.0 to 1.0. 1.0 means highly explosive, verified news.
  "title": string, // Max 20 chars
  "summary": string, // Max 100 chars, one sentence core insight.
  "sources": string[] // The URLs that corroborate this
}`
      },
      {
        role: "user",
        content: `Here is the scraped raw data from Twitter & HackerNews:\n\n${payload}`
      }
    ],
    temperature: 0.2, // Low temperature for factual analysis
  });

  const resultBody = completion.choices[0].message.content;
  try {
     return JSON.parse(resultBody || "{}");
  } catch(e) {
     console.error("AI did not return valid JSON:", resultBody);
     return null;
  }
}
