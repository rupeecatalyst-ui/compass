import app from "./app";
import { serverEnv } from "./config/env";

const PORT = serverEnv.PORT;

app.listen(PORT, () => {
  console.log(`🧭 COMPASS API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${serverEnv.NODE_ENV}`);
  if (!serverEnv.DATABASE_URL) {
    console.log("   ⚠️  No DATABASE_URL — using demo auth (admin@compass.dev / Compass@123)");
  }
});
