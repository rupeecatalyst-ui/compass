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

const { runChanakyaSingleEntryProof } = await import(
  "../src/lib/opportunity-assessment/chanakya-single-entry-proof.ts"
);
await runChanakyaSingleEntryProof();
assert.equal(databaseAttempts, 0);
