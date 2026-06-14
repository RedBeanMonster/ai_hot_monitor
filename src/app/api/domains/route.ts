import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_INTERVALS = [1, 6, 12, 24, 48];

export async function GET() {
  try {
    const domains = await prisma.domain.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { briefings: true } },
      },
    });
    return NextResponse.json({ domains });
  } catch (e) {
    console.error("获取领域失败:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, intervalHours } = await request.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "领域名称必填" }, { status: 400 });
    }
    const interval = ALLOWED_INTERVALS.includes(Number(intervalHours))
      ? Number(intervalHours)
      : 24;

    const domain = await prisma.domain.upsert({
      where: { name: name.trim() },
      update: { intervalHours: interval, isActive: true },
      create: { name: name.trim(), intervalHours: interval },
    });
    return NextResponse.json({ domain });
  } catch (e) {
    console.error("创建领域失败:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, intervalHours, isActive } = await request.json();
    if (!id) return NextResponse.json({ error: "id 必填" }, { status: 400 });

    const data: { intervalHours?: number; isActive?: boolean } = {};
    if (
      intervalHours !== undefined &&
      ALLOWED_INTERVALS.includes(Number(intervalHours))
    ) {
      data.intervalHours = Number(intervalHours);
    }
    if (typeof isActive === "boolean") data.isActive = isActive;

    const domain = await prisma.domain.update({ where: { id }, data });
    return NextResponse.json({ domain });
  } catch (e) {
    console.error("更新领域失败:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id 必填" }, { status: 400 });

    await prisma.domain.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("删除领域失败:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
