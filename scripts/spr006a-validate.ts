/**
 * SPR-006A EDE foundation validation runner.
 * Usage: npx tsx scripts/spr006a-validate.ts
 */

import { runEdeFoundationValidation } from "../src/lib/enterprise-decision-engine";

const result = runEdeFoundationValidation();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) {
  process.exit(1);
}
