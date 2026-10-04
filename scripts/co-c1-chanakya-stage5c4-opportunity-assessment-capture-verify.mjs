// Stage 5C4 — database-free Opportunity Assessment capture/API proof.
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

const { runStage5c4Proof } = await import("../src/lib/opportunity-assessment/stage5c4-proof.ts");
await runStage5c4Proof();
assert.equal(databaseAttempts, 0);
console.log(`STAGE5C4_PROOF complete. cwd=${fileURLToPath(new URL("..", import.meta.url))}`);
