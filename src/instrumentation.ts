export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
      const cron = require('node-cron');
      
      console.log("⚙️ [Init] Registering node-cron jobs (10:00 AM everyday).");
      
      // Rule: At 10:00 every day ("0 10 * * *")
      cron.schedule('0 10 * * *', async () => {
          console.log("⏰ [Cron] Triggering daily 10:00 AM hot-topic sync...");
          try {
              // Locally use localhost, you can tweak this endpoint locally or deploy via Vercel scheduled cron
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
              const res = await fetch(`${baseUrl}/api/sync`);
              const data = await res.json();
              console.log("⏰ [Cron] Daily Job Success:", data);
          } catch (e) {
              console.error("⏰ [Cron JS Error]", e);
          }
      });
  }
}
