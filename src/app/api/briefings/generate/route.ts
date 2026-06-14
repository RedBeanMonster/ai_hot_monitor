import { NextResponse } from "next/server";
import { runDomainBriefing } from "@/lib/jobs";

export const maxDuration = 300;

// 为指定领域生成一份深度简报
export async function POST(request: Request) {
  try {
    const { domainId } = await request.json();
    if (!domainId) {
      return NextResponse.json({ error: "domainId 必填" }, { status: 400 });
    }

    const result = await runDomainBriefing(domainId);
    return NextResponse.json(result, { status: result.success ? 200 : 200 });
  } catch (e) {
    console.error("❌ [BRIEFING] 请求失败:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
