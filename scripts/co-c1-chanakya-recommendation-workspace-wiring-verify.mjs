import assert from "node:assert/strict";

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

const { runChanakyaRecommendationWorkspaceWiringProof } = await import(
  "../src/lib/chanakya/chanakya-recommendation-workspace-wiring-proof.ts"
);
await runChanakyaRecommendationWorkspaceWiringProof();
assert.equal(databaseAttempts, 0);
assert.equal(process.env.DATABASE_URL ?? "", "");
