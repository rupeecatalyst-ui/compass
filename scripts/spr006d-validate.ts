/**
 * SPR-006D Enterprise Advisory Console validation runner.
 * Usage: npx tsx scripts/spr006d-validate.ts
 */

import { runEacFoundationValidation } from "../src/lib/enterprise-advisory-console";

const result = runEacFoundationValidation();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) {
  process.exit(1);
}
