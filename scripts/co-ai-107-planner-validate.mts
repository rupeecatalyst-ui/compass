/**
 * Runtime Planner readiness runner for CO-AI-107.
 */
import { runEaiPlannerReadiness } from "../src/lib/enterprise-ai-platform/planner/readiness.ts";

const result = await runEaiPlannerReadiness();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) {
  console.error("CO-AI-107 Planner & Next Best Action readiness FAILED");
  process.exit(1);
}
console.log("CO-AI-107 Planner & Next Best Action readiness PASSED");
