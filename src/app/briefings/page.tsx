"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, ScanSearch, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import {
  StickyScrollReveal,
  type StickySection,
} from "@/components/ui/sticky-scroll-reveal";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";

const INTERVALS = [1, 6, 12, 24, 48];

const BRIEFING_STEPS = [
  { text: "正在沉淀该领域全周期碎片信息..." },
  { text: "正在归并技术讨论与代码提交..." },
  { text: "DeepSeek 提炼深度洞察中..." },
  { text: "正在生成结构化深度简报..." },
];

type Domain = {
  id: string;
  name: string;
  intervalHours: number;
  isActive: boolean;
  lastRunAt: string | null;
  _count?: { briefings: number };
};

type Briefing = {
  id: string;
  title: string;
  summary: string;
  sections: StickySection[];
  sourceCount: number;
  createdAt: string;
  domain?: { name: string; intervalHours: number };
};

function intervalLabel(h: number) {
  return h >= 24 ? `${h / 24}天` : `${h}小时`;
}

export default function BriefingsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [selected, setSelected] = useState<Briefing | null>(null);
  const [name, setName] = useState("");
  const [interval, setIntervalValue] = useState(24);
  const [generating, setGenerating] = useState(false);

  const loadDomains = useCallback(async () => {
    const res = await fetch("/api/domains");
    const data = await res.json();
    setDomains(data.domains ?? []);
  }, []);

  const loadBriefings = useCallback(async () => {
    const res = await fetch("/api/briefings");
    const data = await res.json();
    const list: Briefing[] = data.briefings ?? [];
    setBriefings(list);
    setSelected((prev) => prev ?? list[0] ?? null);
  }, []);

  useEffect(() => {
    loadDomains();
    loadBriefings();
  }, [loadDomains, loadBriefings]);

  const addDomain = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, intervalHours: interval }),
    });
    setName("");
    loadDomains();
  };

  const removeDomain = async (id: string) => {
    await fetch(`/api/domains?id=${id}`, { method: "DELETE" });
    loadDomains();
  };

  const changeInterval = async (id: string, intervalHours: number) => {
    await fetch("/api/domains", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, intervalHours }),
    });
    loadDomains();
  };

  const generate = async (domainId: string) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/briefings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });
      const data = await res.json();
      if (data.success) {
        await loadBriefings();
        await loadDomains();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <MultiStepLoader
        loadingStates={BRIEFING_STEPS}
        loading={generating}
        loop
        duration={2400}
      />

      <section>
        <p className="mb-2 flex items-center gap-2 text-xs tracking-[0.24em] text-[var(--color-mint)] uppercase">
          <ScanSearch className="h-3.5 w-3.5" /> Domain Periodic Scanning
        </p>
        <h1 className="text-xl font-semibold text-zinc-50 md:text-2xl">
          领域周期性深挖简报
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-zinc-400">
          针对特定广义领域进行长周期数据积淀。到达指定周期后，由 DeepSeek 提炼一份极具洞察力的结构化深度简报。
        </p>
      </section>

      {/* 领域配置 */}
      <section className="rounded-2xl border border-[var(--color-mint-border)] bg-[var(--color-graphite-panel)]/70 p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDomain()}
            placeholder="新增领域，例如：AI编程 / 多模态生成"
            className="flex-1 rounded-lg border border-white/10 bg-[#0c0e11] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--color-mint-border)]"
          />
          <select
            value={interval}
            onChange={(e) => setIntervalValue(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-[#0c0e11] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[var(--color-mint-border)]"
          >
            {INTERVALS.map((h) => (
              <option key={h} value={h}>
                周期 {intervalLabel(h)}
              </option>
            ))}
          </select>
          <Button
            onClick={addDomain}
            className="h-9 border border-[var(--color-mint-border)] bg-[var(--color-mint-dim)] px-4 text-[var(--color-mint-bright)]"
          >
            <Plus className="mr-1 h-4 w-4" /> 添加领域
          </Button>
        </div>

        {domains.length === 0 ? (
          <p className="text-xs text-zinc-500">还没有配置领域。</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {domains.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#0c0e11] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">
                    {d.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    已生成 {d._count?.briefings ?? 0} 份 ·{" "}
                    {d.lastRunAt
                      ? `上次 ${new Date(d.lastRunAt).toLocaleDateString()}`
                      : "尚未生成"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={d.intervalHours}
                    onChange={(e) => changeInterval(d.id, Number(e.target.value))}
                    className="rounded-md border border-white/10 bg-[#0a0b0c] px-2 py-1 text-xs text-zinc-300 outline-none"
                  >
                    {INTERVALS.map((h) => (
                      <option key={h} value={h}>
                        {intervalLabel(h)}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => generate(d.id)}
                    disabled={generating}
                    className="h-7 border border-[var(--color-mint-border)] bg-[var(--color-mint-dim)] px-2.5 text-xs text-[var(--color-mint-bright)]"
                  >
                    生成
                  </Button>
                  <button
                    onClick={() => removeDomain(d.id)}
                    className="text-zinc-500 transition hover:text-rose-300"
                    aria-label={`remove-${d.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 简报阅读 */}
      {briefings.length === 0 ? (
        <CardSpotlight className="border-white/10 bg-[var(--color-graphite-panel)] p-10">
          <div className="relative z-20 flex flex-col items-center gap-3 text-center">
            <FileText className="h-8 w-8 text-[var(--color-mint)]" />
            <p className="text-sm text-zinc-300">
              暂无简报。配置领域后点击「生成」，即可获得结构化深度简报。
            </p>
          </div>
        </CardSpotlight>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* 简报列表 */}
          <aside className="flex flex-col gap-2">
            {briefings.map((b) => {
              const active = selected?.id === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelected(b)}
                  className={[
                    "rounded-xl border px-4 py-3 text-left transition",
                    active
                      ? "border-[var(--color-mint-border)] bg-[var(--color-mint-dim)]"
                      : "border-white/8 bg-[#0c0e11] hover:border-white/20",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--color-mint)]">
                      {b.domain?.name ?? "领域"}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-100">
                    {b.title}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500" suppressHydrationWarning>
                    {new Date(b.createdAt).toLocaleString()} · {b.sourceCount} 源
                  </p>
                </button>
              );
            })}
          </aside>

          {/* 选中简报正文 */}
          <div>
            {selected ? (
              <div className="rounded-2xl border border-white/8 bg-[var(--color-graphite-panel)]/50 p-6 md:p-8">
                <p className="text-xs tracking-[0.2em] text-[var(--color-mint)] uppercase">
                  {selected.domain?.name} ·{" "}
                  {selected.domain
                    ? intervalLabel(selected.domain.intervalHours)
                    : ""}{" "}
                  深度简报
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-50">
                  {selected.title}
                </h2>
                <p className="mt-3 border-l-2 border-[var(--color-mint-border)] pl-3 text-sm leading-6 text-zinc-300">
                  {selected.summary}
                </p>

                <div className="mt-8">
                  <StickyScrollReveal content={selected.sections} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
