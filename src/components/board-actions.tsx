"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";

const BOARD_STEPS = [
  { text: "正在并发检索全网信源 (HN / GitHub / Bilibili)..." },
  { text: "正在去重聚类、提取核心事件..." },
  { text: "DeepSeek 评估热度与真实性中..." },
  { text: "正在生成 Top 5 结构化看板..." },
];

export function BoardActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/board/generate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        setMsg(data.message || "生成失败");
      }
    } catch (e) {
      setMsg("请求失败，请稍后重试。");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <MultiStepLoader loadingStates={BOARD_STEPS} loading={loading} loop duration={2200} />
      <Button
        onClick={generate}
        disabled={loading}
        className="h-9 border border-[var(--color-mint-border)] bg-[var(--color-mint-dim)] px-4 text-[var(--color-mint-bright)] hover:bg-[var(--color-mint-dim)]"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "生成中..." : "立即刷新看板"}
      </Button>
      {msg ? <p className="text-xs text-amber-300/80">{msg}</p> : null}
    </div>
  );
}
