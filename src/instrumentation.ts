declare global {
  // Prevent duplicate cron registration during dev HMR reloads.
  var __hotMonitorCronRegistered: boolean | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (globalThis.__hotMonitorCronRegistered) return;
  globalThis.__hotMonitorCronRegistered = true;
  console.log('⚙️ [Init] In-app cron disabled for stability. Trigger /api/sync manually or use platform cron.');
}
