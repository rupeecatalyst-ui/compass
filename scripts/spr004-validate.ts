/**
 * SPR-004 EWOE foundation validation runner.
 * Usage: npx tsx scripts/spr004-validate.ts
 */

import { runEwoeFoundationValidation } from "../src/lib/enterprise-workflow-orchestration-engine";

const result = runEwoeFoundationValidation();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) {
  process.exit(1);
}
