declare global {
  // Prevent duplicate cron registration during dev HMR reloads.
  var __hotMonitorCronRegistered: boolean | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (globalThis.__hotMonitorCronRegistered) return;
  globalThis.__hotMonitorCronRegistered = true;

  // 仅在 Node 运行时按需加载调度器，避免污染 edge/build。
  const { startScheduler } = await import("@/lib/scheduler");
  startScheduler();
}
