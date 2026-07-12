/**
 * SPR-006B Decision Knowledge Framework validation runner.
 * Usage: npx tsx scripts/spr006b-validate.ts
 */

import { runEdeFoundationValidation } from "../src/lib/enterprise-decision-engine";

const result = runEdeFoundationValidation();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) {
  process.exit(1);
}
