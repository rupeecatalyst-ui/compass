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
    console.log(
      serverEnv.DEMO_AUTH_ENABLED
        ? "   ⚠️  No DATABASE_URL — demo auth enabled via DEMO_AUTH_* env (password not logged)."
        : "   ⚠️  No DATABASE_URL — demo auth disabled (set DEMO_AUTH_ENABLED + DEMO_AUTH_PASSWORD for local-only).",
    );
  }
});
