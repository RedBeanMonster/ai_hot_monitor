import Link from "next/link";
import { Flame, ExternalLink, Clock3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { BoardActions } from "@/components/board-actions";

export const dynamic = "force-dynamic";

type BoardTopic = {
  id: string;
  rank: number;
  title: string;
  summary: string;
  evolution: string | null;
  analysis: string | null;
  sources: string[];
  confidence: number;
};

async function getBoard(): Promise<{ boardDate: string | null; topics: BoardTopic[] }> {
  const latest = await prisma.dailyHotspot.findFirst({
    orderBy: { boardDate: "desc" },
    select: { boardDate: true },
  });
  if (!latest) return { boardDate: null, topics: [] };

  const rows = await prisma.dailyHotspot.findMany({
    where: { boardDate: latest.boardDate },
    orderBy: { rank: "asc" },
  });

  return {
    boardDate: latest.boardDate,
    topics: rows.map((r) => ({
      id: r.id,
      rank: r.rank,
      title: r.title,
      summary: r.summary,
      evolution: r.evolution,
      analysis: r.analysis,
      sources: parseSources(r.sources),
      confidence: r.confidence,
    })),
  };
}

function parseSources(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const { boardDate, topics } = await getBoard();

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="mb-2 flex items-center gap-2 text-xs tracking-[0.24em] text-[var(--color-mint)] uppercase">
            <Clock3 className="h-3.5 w-3.5" /> Daily 10:00 · Public Hotspot Board
          </p>
          <TextGenerateEffect
            words="每日 10:00 · 经 AI 验证的 Top 5 行业热点"
            className="text-zinc-50"
            duration={0.4}
          />
          <p className="mt-4 text-sm text-zinc-400">
            自动聚合过去 24 小时全网多源 AI 动态，经 DeepSeek 去重、聚类、防伪裁判后，呈现最具含金量的进展。
            {boardDate ? (
              <span className="ml-1 text-zinc-500">当前看板：{boardDate}</span>
            ) : null}
          </p>
        </div>
        <BoardActions />
      </section>

      {topics.length === 0 ? (
        <CardSpotlight className="border-white/10 bg-[var(--color-graphite-panel)] p-10">
          <div className="relative z-20 flex flex-col items-center gap-3 text-center">
            <Flame className="h-8 w-8 text-[var(--color-mint)]" />
            <p className="text-sm text-zinc-300">
              暂无看板数据。点击右上角「立即刷新看板」抓取并生成今日 Top 5。
            </p>
          </div>
        </CardSpotlight>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:auto-rows-[15rem] md:grid-cols-3">
          {topics.map((topic) => {
            const headline = topic.rank === 1;
            return (
              <CardSpotlight
                key={topic.id}
                radius={headline ? 420 : 280}
                className={[
                  "rounded-2xl border bg-[var(--color-graphite-panel)] p-6",
                  headline
                    ? "mint-breathe border-[var(--color-mint-border)] md:col-span-2 md:row-span-2"
                    : "border-white/10",
                ].join(" ")}
              >
                <div className="relative z-20 flex h-full flex-col">
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={[
                        "flex h-6 w-6 items-center justify-center rounded-md font-mono text-xs",
                        headline
                          ? "bg-[var(--color-mint)] text-[#0a0b0c]"
                          : "border border-white/10 text-[var(--color-mint)]",
                      ].join(" ")}
                    >
                      {topic.rank}
                    </span>
                    {headline ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-[var(--color-mint-bright)]">
                        <Flame className="h-3.5 w-3.5" /> 头条
                      </span>
                    ) : null}
                    <span className="ml-auto rounded-full border border-[var(--color-mint-border)] bg-[var(--color-mint-dim)] px-2 py-0.5 text-xs text-[var(--color-mint-bright)]">
                      {(topic.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <h3
                    className={[
                      "font-semibold text-zinc-50",
                      headline ? "text-xl md:text-2xl" : "text-base",
                    ].join(" ")}
                  >
                    {topic.title}
                  </h3>

                  <p
                    className={[
                      "mt-2 leading-6 text-zinc-300",
                      headline ? "text-sm" : "line-clamp-3 text-xs",
                    ].join(" ")}
                  >
                    {topic.summary}
                  </p>

                  {headline && topic.evolution ? (
                    <p className="mt-3 border-l-2 border-[var(--color-mint-border)] pl-3 text-xs leading-6 text-zinc-400">
                      <span className="text-[var(--color-mint)]">演进脉络 · </span>
                      {topic.evolution}
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                    {topic.sources.slice(0, headline ? 3 : 1).map((src, i) => (
                      <a
                        key={i}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[var(--color-mint)] transition hover:text-[var(--color-mint-bright)]"
                      >
                        <ExternalLink className="h-3 w-3" /> 信源 {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              </CardSpotlight>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-zinc-600">
        想追踪特定关键词？前往{" "}
        <Link href="/monitor" className="text-[var(--color-mint)] hover:underline">
          关键词监控
        </Link>{" "}
        ；需要长周期深度总结？查看{" "}
        <Link href="/briefings" className="text-[var(--color-mint)] hover:underline">
          领域深挖简报
        </Link>
        。
      </p>
    </main>
  );
}
