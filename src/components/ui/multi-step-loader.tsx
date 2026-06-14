"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type LoadingState = { text: string };

const CheckIcon = ({ active }: { active: boolean }) => (
  <span
    className={cn(
      "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
      active
        ? "border-[var(--color-mint-border)] bg-[var(--color-mint-dim)]"
        : "border-white/10 bg-white/5",
    )}
  >
    <Check
      className={cn(
        "h-3 w-3",
        active ? "text-[var(--color-mint)]" : "text-zinc-600",
      )}
    />
  </span>
);

function LoaderCore({
  loadingStates,
  duration,
  loop,
}: {
  loadingStates: LoadingState[];
  duration: number;
  loop: boolean;
}) {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCurrentState((prev) =>
        loop
          ? prev === loadingStates.length - 1
            ? 0
            : prev + 1
          : Math.min(prev + 1, loadingStates.length - 1),
      );
    }, duration);
    return () => clearTimeout(timeout);
  }, [currentState, loop, loadingStates.length, duration]);

  return (
    <div className="space-y-3">
      {loadingStates.map((state, index) => {
        const done = index < currentState;
        const active = index === currentState;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: done || active ? 1 : 0.35 }}
            className="flex items-center gap-3"
          >
            {active && !done ? (
              <Loader2 className="h-5 w-5 animate-spin text-[var(--color-mint)]" />
            ) : (
              <CheckIcon active={done} />
            )}
            <span
              className={cn(
                "text-sm",
                active
                  ? "text-zinc-100"
                  : done
                    ? "text-zinc-400"
                    : "text-zinc-600",
              )}
            >
              {state.text}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export const MultiStepLoader = ({
  loadingStates,
  loading,
  duration = 1500,
  loop = false,
}: {
  loadingStates: LoadingState[];
  loading?: boolean;
  duration?: number;
  loop?: boolean;
}) => {
  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md"
        >
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-[min(92vw,420px)] rounded-2xl border border-[var(--color-mint-border)] bg-[#0f1115]/95 p-6 shadow-[0_0_60px_rgba(78,240,163,0.12)]">
            <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-mint-bright)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI 防伪流水线运行中
            </div>
            <LoaderCore
              loadingStates={loadingStates}
              duration={duration}
              loop={loop}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
