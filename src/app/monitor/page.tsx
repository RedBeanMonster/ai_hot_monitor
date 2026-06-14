"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, Plus, RefreshCw, Sparkles, Trash2, Zap } from "lucide-react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Button } from "@/components/ui/button";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";

type Keyword = { id: string; text: string };
type Topic = {
  id: string;
  title: string;
  summary: string;
  url: string | null;
  source: string;
  confidence: number;
  createdAt: string;
  keyword?: Keyword | null;
};

type KeywordsResponse = { keywords?: Keyword[] };
type TopicsResponse = { topics?: Topic[] };
type CreateKeywordResponse = { keyword?: Keyword };

const SYNC_STEPS = [
  { text: "正在并发检索全网信源..." },
  { text: "正在调用多源数据进行交叉比对..." },
  { text: "DeepSeek 防伪裁判深度推理中..." },
  { text: "验证完成，正在写入热点..." },
];

export default function MonitorPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const previouslySeenIds = useRef<Set<string>>(new Set());

  const trackAndNotify = useCallback((incoming: Topic[]) => {
    for (const topic of incoming) {
      const isNew = !previouslySeenIds.current.has(topic.id);
      if (
        isNew &&
        previouslySeenIds.current.size > 0 &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification(`🔥 新热点: ${topic.keyword?.text ?? "AI"}`, {
          body: topic.title,
        });
      }
      previouslySeenIds.current.add(topic.id);
    }
  }, []);

  const fetchKeywords = useCallback(async () => {
    try {
      const res = await fetch("/api/keywords");
      const data: KeywordsResponse = await res.json();
      setKeywords(data.keywords ?? []);
    } catch (error) {
      console.error("Failed to fetch keywords:", error);
    }
  }, []);

  const fetchLatestTopics = useCallback(async () => {
    try {
      const res = await fetch("/api/hot-topics");
      const data: TopicsResponse = await res.json();
      const incoming = data.topics ?? [];
      trackAndNotify(incoming);
      setTopics(incoming);
    } catch (error) {
      console.error("Failed to fetch hot topics:", error);
    }
  }, [trackAndNotify]);

  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
    const timer = setInterval(
      () => setTime(new Date().toLocaleTimeString()),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    fetchKeywords();
    fetchLatestTopics();
    const syncTimer = setInterval(fetchLatestTopics, 300_000);
    return () => clearInterval(syncTimer);
  }, [fetchKeywords, fetchLatestTopics]);

  const triggerManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch("/api/sync");
      await fetchLatestTopics();
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const addKeyword = async () => {
    const text = newKeyword.trim();
    if (!text || keywords.some((keyword) => keyword.text === text)) return;
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data: CreateKeywordResponse = await res.json();
      if (!data.keyword) return;
      setKeywords((prev) => [data.keyword as Keyword, ...prev]);
      setNewKeyword("");
    } catch (error) {
      console.error("Failed to add keyword:", error);
    }
  };

  const removeKeyword = async (text: string) => {
    try {
      await fetch(`/api/keywords?text=${encodeURIComponent(text)}`, {
        method: "DELETE",
      });
      setKeywords((prev) => prev.filter((keyword) => keyword.text !== text));
    } catch (error) {
      console.error("Failed to remove keyword:", error);
    }
  };

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
      <MultiStepLoader
        loadingStates={SYNC_STEPS}
        loading={isSyncing}
        loop
        duration={1800}
      />

      <section className="rounded-2xl border border-[var(--color-mint-border)] bg-[var(--color-graphite-panel)]/70 p-5 backdrop-blur md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs tracking-[0.24em] text-[var(--color-mint)] uppercase">
              Keyword Monitor · 关键词雷达
            </p>
            <h1 className="text-xl font-semibold text-zinc-50 md:text-2xl">
              全天候监听你关心的技术方向
            </h1>
            <p className="mt-3 text-sm text-zinc-400">
              添加高敏感度关键词，系统持续拉取多源数据并由 DeepSeek 判断热点价值，命中后浏览器即时通知。
            </p>
          </div>

          <div className="flex min-w-[220px] flex-col items-start gap-3 md:items-end">
            <Button
              onClick={triggerManualSync}
              disabled={isSyncing}
              className="h-9 border border-[var(--color-mint-border)] bg-[var(--color-mint-dim)] px-4 text-[var(--color-mint-bright)] hover:bg-[var(--color-mint-dim)]"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "同步中..." : "立即同步热点"}
            </Button>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-[var(--color-mint)] shadow-[0_0_8px_var(--color-mint)]" />
              系统在线
            </div>
          </div>
        </div>
      </section>

      <BentoGrid className="max-w-none md:auto-rows-[16rem]">
        <BentoGridItem
          className="border-[var(--color-mint-border)] bg-[var(--color-graphite-panel)] md:col-span-2"
          icon={<Sparkles className="h-4 w-4 text-[var(--color-mint)]" />}
          title="关键词雷达"
          description="维护你关心的技术方向，系统会根据关键词持续拉取并判断热点价值。"
          header={
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(event) => setNewKeyword(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && addKeyword()}
                  placeholder="输入关键词，例如：agent memory, RAG..."
                  className="w-full rounded-lg border border-white/10 bg-[#0c0e11] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-[var(--color-mint-border)]"
                />
                <Button
                  onClick={addKeyword}
                  className="h-9 border border-[var(--color-mint-border)] bg-[var(--color-mint-dim)] px-3 text-[var(--color-mint-bright)]"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-24 space-y-2 overflow-y-auto pr-1">
                {keywords.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    还没有关键词，先添加你要追踪的技术主题。
                  </p>
                ) : (
                  keywords.map((keyword) => (
                    <div
                      key={keyword.id}
                      className="flex items-center justify-between rounded-md border border-white/8 bg-[#0c0e11] px-3 py-1.5 text-sm text-zinc-200"
                    >
                      <span className="text-[var(--color-mint)]">#{keyword.text}</span>
                      <button
                        onClick={() => removeKeyword(keyword.text)}
                        className="text-zinc-500 transition hover:text-rose-300"
                        aria-label={`remove-${keyword.text}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          }
        />

        <BentoGridItem
          className="border-[var(--color-mint-border)] bg-[var(--color-graphite-panel)]"
          icon={<Zap className="h-4 w-4 text-[var(--color-mint)]" />}
          title="热点强度"
          description={`${topics.length} 条最新热点，优先看高置信度条目。`}
          header={
            <div className="rounded-lg border border-white/8 bg-[#0c0e11] p-4">
              <p className="text-[11px] tracking-widest text-zinc-500 uppercase">
                hot topics
              </p>
              <p className="mt-2 text-3xl font-semibold text-[var(--color-mint-bright)]">
                {topics.length}
              </p>
            </div>
          }
        />

        <BentoGridItem
          className="border-[var(--color-mint-border)] bg-[var(--color-graphite-panel)]"
          icon={<Clock3 className="h-4 w-4 text-[var(--color-mint)]" />}
          title="实时状态"
          description="每 5 分钟自动刷新一次，也可以手动强制同步。"
          header={
            <div className="rounded-lg border border-white/8 bg-[#0c0e11] p-4">
              <p className="text-[11px] tracking-widest text-zinc-500 uppercase">
                current time
              </p>
              <p className="mt-2 text-xl font-medium text-zinc-100" suppressHydrationWarning>
                {time ?? "--:--:--"}
              </p>
            </div>
          }
        />
      </BentoGrid>

      <section className="rounded-2xl border border-[var(--color-mint-border)] bg-[var(--color-graphite-panel)]/70 p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3">
          <h2 className="text-lg font-semibold text-zinc-100 md:text-xl">
            热点流 / Latest Signals
          </h2>
          <span className="text-xs text-zinc-500">按时间倒序，自动聚焦高价值内容</span>
        </div>

        <div className="grid gap-4">
          {topics.length === 0 ? (
            <CardSpotlight className="border-white/10 bg-[#0c0e11] p-6">
              <p className="relative z-20 text-sm text-zinc-300">
                暂无热点数据，点击「立即同步热点」开始抓取。
              </p>
            </CardSpotlight>
          ) : (
            topics.map((topic) => (
              <CardSpotlight
                key={topic.id}
                className="border-white/10 bg-[#0c0e11] p-5 md:p-6"
                radius={280}
              >
                <div className="relative z-20 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-[var(--color-mint-border)] bg-[var(--color-mint-dim)] px-2 py-0.5 text-[var(--color-mint-bright)]">
                      #{topic.keyword?.text ?? "general"}
                    </span>
                    <span className="text-zinc-500" suppressHydrationWarning>
                      {new Date(topic.createdAt).toLocaleString()}
                    </span>
                    <span className="text-zinc-600">{topic.source}</span>
                    <span className="ml-auto rounded-full border border-[var(--color-mint-border)] bg-[var(--color-mint-dim)] px-2 py-0.5 text-[var(--color-mint-bright)]">
                      {(topic.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-zinc-100 md:text-lg">
                    {topic.title}
                  </h3>
                  <p className="text-sm leading-6 text-zinc-300">{topic.summary}</p>

                  {topic.url ? (
                    <a
                      href={topic.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-[var(--color-mint)] transition hover:text-[var(--color-mint-bright)]"
                    >
                      查看来源
                    </a>
                  ) : null}
                </div>
              </CardSpotlight>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
