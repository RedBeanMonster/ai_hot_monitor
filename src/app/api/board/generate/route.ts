import { NextResponse } from "next/server";
import { runBoardGeneration } from "@/lib/jobs";

export const maxDuration = 300;

// 生成 / 刷新当日公共热点看板（可由 cron 或手动触发）
export async function POST() {
  return run();
}
export async function GET() {
  return run();
}

async function run() {
  const result = await runBoardGeneration();
  return NextResponse.json(result, {
    status: result.success ? 200 : result.message?.includes("进行中") ? 409 : 200,
  });
}
