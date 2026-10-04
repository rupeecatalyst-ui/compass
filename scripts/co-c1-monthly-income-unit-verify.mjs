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

const { runMonthlyIncomeUnitProof } = await import(
  "../src/lib/lead-information/monthly-income-unit-proof.ts"
);
runMonthlyIncomeUnitProof();
assert.equal(databaseAttempts, 0);
console.log("monthly-income-unit: PASS");
