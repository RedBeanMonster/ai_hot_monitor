"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { cn } from "@/lib/utils";

export type StickySection = {
  title: string;
  description: string;
};

export const StickyScrollReveal = ({
  content,
  className,
}: {
  content: StickySection[];
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const idx = Math.min(
      content.length - 1,
      Math.max(0, Math.floor(latest * content.length)),
    );
    setActive(idx);
  });

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
        {/* 左侧：随滚动高亮的章节导航 */}
        <div className="md:sticky md:top-24 md:h-[calc(100vh-8rem)] md:self-start">
          <div className="flex h-full flex-col justify-center gap-3">
            {content.map((section, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 transition-all duration-300",
                  index === active
                    ? "opacity-100"
                    : "translate-x-[-4px] opacity-30",
                )}
              >
                <span className="font-mono text-xs text-[var(--color-mint)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-semibold text-zinc-100 md:text-xl">
                  {section.title}
                </h3>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：逐段显现的深度见解 */}
        <div className="flex flex-col gap-10 py-6">
          {content.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ margin: "-30% 0px -30% 0px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="rounded-2xl border border-white/8 bg-[var(--color-graphite-panel)]/70 p-6"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-mint)] shadow-[0_0_8px_var(--color-mint)]" />
                <span className="text-xs tracking-[0.2em] text-[var(--color-mint)] uppercase">
                  Section {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mb-3 text-lg font-semibold text-zinc-100 md:text-xl">
                {section.title}
              </h3>
              <p className="text-sm leading-7 whitespace-pre-line text-zinc-300">
                {section.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
