/**
 * Runtime Validation & Performance suite for CO-AI-116.
 */
import { runEaiValidationPerformanceSuite } from "../src/lib/enterprise-ai-platform/validation-performance/readiness.ts";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const result = await runEaiValidationPerformanceSuite();
console.log(JSON.stringify({
  passed: result.passed,
  errors: result.errors,
  warnings: result.warnings,
  details: result.details,
  report: result.report,
}, null, 2));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs", "co-ai-116");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "CO-AI-116-PERFORMANCE-SNAPSHOT.json"),
  JSON.stringify(result.report, null, 2),
);

if (!result.passed) {
  console.error("CO-AI-116 Validation & Performance FAILED");
  process.exit(1);
}
console.log("CO-AI-116 Validation & Performance PASSED");
