import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 列出领域深挖简报，可按 domainId 过滤
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get("domainId");

    const briefings = await prisma.domainBriefing.findMany({
      where: domainId ? { domainId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { domain: { select: { name: true, intervalHours: true } } },
    });

    return NextResponse.json({
      briefings: briefings.map((b) => ({
        ...b,
        sections: safeParse(b.content),
      })),
    });
  } catch (e) {
    console.error("获取简报失败:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function safeParse(value: string): { title: string; description: string }[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
