/**
 * SPR-005 ECG foundation validation runner.
 * Usage: npx tsx scripts/spr005-validate.ts
 */

import { runEcgFoundationValidation } from "../src/lib/enterprise-interface-configuration-grants";

const result = runEcgFoundationValidation();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) {
  process.exit(1);
}
