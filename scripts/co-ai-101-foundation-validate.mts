/**
 * Runtime foundation validation runner for CO-AI-101.
 */
import { runEaiFoundationValidation } from "../src/lib/enterprise-ai-platform/foundation-validation.ts";

const result = await runEaiFoundationValidation();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) {
  console.error("CO-AI-101 foundation validation FAILED");
  process.exit(1);
}
console.log("CO-AI-101 foundation validation PASSED");
