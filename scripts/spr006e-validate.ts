/**
 * SPR-006E Enterprise Experience Intelligence validation runner.
 * Usage: npx tsx scripts/spr006e-validate.ts
 */

import { runEeiFoundationValidation } from "../src/lib/enterprise-experience-intelligence";

const result = runEeiFoundationValidation();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) {
  process.exit(1);
}
