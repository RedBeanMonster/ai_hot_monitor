import cron from "node-cron";
import { runBoardGeneration, runDueDomainBriefings } from "@/lib/jobs";

const TZ = process.env.SCHEDULER_TZ || "Asia/Shanghai";
// 每日 10:00 生成公共看板
const BOARD_CRON = process.env.BOARD_CRON || "0 10 * * *";
// 每 15 分钟扫描一次到期领域
const DOMAIN_SCAN_CRON = process.env.DOMAIN_SCAN_CRON || "*/15 * * * *";

declare global {
  var __hotMonitorScheduler: boolean | undefined;
}

export function startScheduler() {
  if (globalThis.__hotMonitorScheduler) return;

  if (process.env.ENABLE_SCHEDULER === "false") {
    console.log("⏸️ [SCHEDULER] ENABLE_SCHEDULER=false，调度器未启动。");
    return;
  }

  if (!cron.validate(BOARD_CRON) || !cron.validate(DOMAIN_SCAN_CRON)) {
    console.error("❌ [SCHEDULER] cron 表达式非法，调度器未启动。");
    return;
  }

  globalThis.__hotMonitorScheduler = true;

  // 功能一：每日 10:00 公共热点看板
  cron.schedule(
    BOARD_CRON,
    async () => {
      console.log("⏰ [SCHEDULER] 触发每日看板生成...");
      await runBoardGeneration();
    },
    { timezone: TZ, name: "daily-board", noOverlap: true },
  );

  // 功能三：周期性扫描到期领域并生成简报
  cron.schedule(
    DOMAIN_SCAN_CRON,
    async () => {
      await runDueDomainBriefings();
    },
    { timezone: TZ, name: "domain-scan", noOverlap: true },
  );

  console.log(
    `✅ [SCHEDULER] 已启动 | TZ=${TZ} | 看板:"${BOARD_CRON}" | 领域扫描:"${DOMAIN_SCAN_CRON}"`,
  );
}
