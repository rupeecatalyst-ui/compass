import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const cols = await p.$queryRawUnsafe(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'enterprise_opportunities'
    ORDER BY ordinal_position
  `);
  console.log("COLUMNS:\n" + cols.map((c) => c.column_name).join("\n"));

  const rows = await p.$queryRawUnsafe(`
    SELECT *
    FROM enterprise_opportunities
    WHERE opportunity_number = 'OPP-2026-000043'
    LIMIT 1
  `);
  const row = rows[0];
  if (!row) {
    console.log("OPP_NOT_FOUND");
  } else {
    const lean = { ...row };
    // truncate large json
    for (const k of Object.keys(lean)) {
      const v = lean[k];
      if (v && typeof v === "object") {
        lean[k] = JSON.parse(JSON.stringify(v));
      }
    }
    console.log("OPP", JSON.stringify(lean, null, 2));
  }
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
