import app from "./app";
import { serverEnv } from "./config/env";

/**
 * Legacy Express API (ADR-014).
 * Authentication has migrated to Next.js Route Handlers under src/app/api/auth/*.
 * This server remains for non-auth endpoints until future migration sprints.
 */
const PORT = serverEnv.PORT;

app.listen(PORT, () => {
  console.log(`🧭 COMPASS Legacy API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${serverEnv.NODE_ENV}`);
  console.log(`   Auth gateway: Next.js Route Handlers (src/app/api/auth/*)`);
  if (!serverEnv.DATABASE_URL) {
    console.log("   ⚠️  No DATABASE_URL — using demo auth (admin@compass.com / Admin@123)");
  }
});
