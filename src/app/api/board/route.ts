import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 返回最新一期公共热点看板（Top 5）
export async function GET() {
  try {
    const latest = await prisma.dailyHotspot.findFirst({
      orderBy: { boardDate: "desc" },
      select: { boardDate: true },
    });

    if (!latest) {
      return NextResponse.json({ boardDate: null, topics: [] });
    }

    const rows = await prisma.dailyHotspot.findMany({
      where: { boardDate: latest.boardDate },
      orderBy: { rank: "asc" },
    });

    const topics = rows.map((r) => ({
      ...r,
      sources: safeParseArray(r.sources),
    }));

    return NextResponse.json({ boardDate: latest.boardDate, topics });
  } catch (e) {
    console.error("获取看板失败:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function safeParseArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
