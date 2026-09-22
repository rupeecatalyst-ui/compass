// Stage 5C2 — database-free Opportunity Assessment service proof.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

if (process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL_FORBIDDEN");
}

let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, {
  get() {
    databaseAttempts += 1;
    throw new Error("DATABASE_FORBIDDEN");
  },
});

const { runStage5c2Proof } = await import("../src/lib/opportunity-assessment/stage5c2-proof.ts");
await runStage5c2Proof();
assert.equal(databaseAttempts, 0);
console.log(`STAGE5C2_PROOF complete. cwd=${fileURLToPath(new URL("..", import.meta.url))}`);
