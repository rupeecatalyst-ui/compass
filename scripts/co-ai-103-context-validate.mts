/**
 * Runtime Context Intelligence readiness runner for CO-AI-103.
 */
import { runEaiContextIntelligenceReadiness } from "../src/lib/enterprise-ai-platform/context-intelligence/readiness.ts";

const result = await runEaiContextIntelligenceReadiness();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) {
  console.error("CO-AI-103 Context Intelligence readiness FAILED");
  process.exit(1);
}
console.log("CO-AI-103 Context Intelligence readiness PASSED");
