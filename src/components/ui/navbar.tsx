"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, ScanSearch, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "公共看板", sub: "10:00 Board", icon: Newspaper },
  { href: "/monitor", label: "关键词监控", sub: "Monitor", icon: Radar },
  { href: "/briefings", label: "领域深挖", sub: "Briefings", icon: ScanSearch },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0b0c]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-mint-border)] bg-[var(--color-mint-dim)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-mint)] shadow-[0_0_10px_var(--color-mint)]" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide text-zinc-100">
              WKR<span className="mint-text"> HOT</span>
            </p>
            <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
              AI Monitor
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-[var(--color-mint-dim)] text-[var(--color-mint-bright)]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
