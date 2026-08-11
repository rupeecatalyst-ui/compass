/**
 * Runtime Explainability & Trust readiness runner for CO-AI-110.
 */
import { runEaiExplainabilityTrustReadiness } from "../src/lib/enterprise-ai-platform/explainability-trust/readiness.ts";

const result = await runEaiExplainabilityTrustReadiness();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) {
  console.error("CO-AI-110 Explainability & Trust readiness FAILED");
  process.exit(1);
}
console.log("CO-AI-110 Explainability & Trust readiness PASSED");
