/**
 * Runtime FDI readiness runner for CO-AI-105.
 */
import { runEaiFinancialDecisionIntelligenceReadiness } from "../src/lib/enterprise-ai-platform/financial-decision-intelligence/readiness.ts";

const result = await runEaiFinancialDecisionIntelligenceReadiness();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) {
  console.error("CO-AI-105 Financial Decision Intelligence readiness FAILED");
  process.exit(1);
}
console.log("CO-AI-105 Financial Decision Intelligence readiness PASSED");
