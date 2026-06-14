import { prisma } from "@/lib/prisma";
import { aggregateBroad } from "@/lib/fetchers";
import { generateDailyBoard, generateDomainBriefing } from "@/lib/ai-analyzer";

// 公共看板的全网 AI 探针查询词（与用户关键词合并）
const SEED_QUERIES = [
  "AI",
  "LLM",
  "large language model",
  "open source model",
  "AI agent",
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function intervalLabel(hours: number): string {
  return hours >= 24 ? `${hours / 24} 天` : `${hours} 小时`;
}

export type JobResult = {
  success: boolean;
  message?: string;
  [key: string]: unknown;
};

// ====== 简单的进程内并发锁，避免 cron 与手动触发重叠运行 ======
let boardRunning = false;
const domainRunning = new Set<string>();

// ====================================================
// 每日公共热点看板生成
// ====================================================
export async function runBoardGeneration(): Promise<JobResult> {
  if (boardRunning) {
    return { success: false, message: "看板生成已在进行中，跳过本次触发。" };
  }
  boardRunning = true;
  try {
    console.log("📰 [BOARD] 开始生成每日公共热点看板...");

    const keywords = await prisma.keyword.findMany({
      where: { isActive: true },
      select: { text: true },
    });
    const queries = Array.from(
      new Set([...SEED_QUERIES, ...keywords.map((k) => k.text)]),
    ).slice(0, 8);

    const rawData = await aggregateBroad(queries, 36);
    console.log(`[BOARD] 聚合到 ${rawData.length} 条原始数据。`);
    if (rawData.length === 0) {
      return { success: false, message: "未抓取到原始数据，看板未更新。" };
    }

    const topics = await generateDailyBoard(rawData);
    if (topics.length === 0) {
      return { success: false, message: "AI 未能提炼出有效热点。" };
    }

    const boardDate = today();
    await prisma.dailyHotspot.deleteMany({ where: { boardDate } });
    await prisma.dailyHotspot.createMany({
      data: topics.map((t, idx) => ({
        boardDate,
        rank: t.rank ?? idx + 1,
        title: t.title,
        summary: t.summary,
        evolution: t.evolution || null,
        analysis: t.analysis || null,
        sources: JSON.stringify(t.sources || []),
        confidence: t.confidence ?? 0,
      })),
    });

    console.log(`✅ [BOARD] 看板已更新，共 ${topics.length} 条。`);
    return { success: true, boardDate, count: topics.length };
  } catch (e) {
    console.error("❌ [BOARD] 生成失败:", e);
    return { success: false, message: String(e) };
  } finally {
    boardRunning = false;
  }
}

// ====================================================
// 单个领域深挖简报生成
// ====================================================
export async function runDomainBriefing(domainId: string): Promise<JobResult> {
  if (domainRunning.has(domainId)) {
    return { success: false, message: "该领域简报正在生成中，跳过。" };
  }
  domainRunning.add(domainId);
  try {
    const domain = await prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) return { success: false, message: "领域不存在" };

    console.log(`🔬 [BRIEFING] 为「${domain.name}」生成深挖简报...`);

    const periodEnd = new Date();
    const periodStart = new Date(
      periodEnd.getTime() - domain.intervalHours * 3600_000,
    );

    const rawData = await aggregateBroad([domain.name], domain.intervalHours);
    if (rawData.length === 0) {
      // 仍更新 lastRunAt，避免到期领域反复空跑
      await prisma.domain.update({
        where: { id: domain.id },
        data: { lastRunAt: periodEnd },
      });
      return { success: false, message: "该领域近期未抓取到数据。" };
    }

    const result = await generateDomainBriefing(
      domain.name,
      rawData,
      intervalLabel(domain.intervalHours),
    );
    if (!result || !result.sections?.length) {
      return { success: false, message: "AI 未能生成有效简报。" };
    }

    const briefing = await prisma.domainBriefing.create({
      data: {
        domainId: domain.id,
        title: result.title,
        summary: result.summary,
        content: JSON.stringify(result.sections),
        sourceCount: rawData.length,
        periodStart,
        periodEnd,
      },
    });

    await prisma.domain.update({
      where: { id: domain.id },
      data: { lastRunAt: periodEnd },
    });

    console.log(`✅ [BRIEFING] 「${domain.name}」简报已生成。`);
    return { success: true, briefingId: briefing.id };
  } catch (e) {
    console.error("❌ [BRIEFING] 生成失败:", e);
    return { success: false, message: String(e) };
  } finally {
    domainRunning.delete(domainId);
  }
}

// ====================================================
// 扫描所有到期领域并依次生成简报（供 cron 调用）
// ====================================================
export async function runDueDomainBriefings(): Promise<JobResult> {
  const now = Date.now();
  const domains = await prisma.domain.findMany({ where: { isActive: true } });

  const due = domains.filter((d) => {
    if (!d.lastRunAt) return true;
    return now - d.lastRunAt.getTime() >= d.intervalHours * 3600_000;
  });

  if (due.length === 0) {
    return { success: true, message: "无到期领域。", triggered: 0 };
  }

  console.log(`⏰ [SCHEDULER] ${due.length} 个领域到期，开始依次生成简报...`);
  let ok = 0;
  for (const d of due) {
    const res = await runDomainBriefing(d.id);
    if (res.success) ok += 1;
  }
  return { success: true, triggered: due.length, generated: ok };
}
