/**
 * Runtime Consultation Intelligence readiness runner for CO-AI-108.
 */
import { runEaiConsultationIntelligenceReadiness } from "../src/lib/enterprise-ai-platform/consultation-intelligence/readiness.ts";

const result = await runEaiConsultationIntelligenceReadiness();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) {
  console.error("CO-AI-108 Consultation Intelligence readiness FAILED");
  process.exit(1);
}
console.log("CO-AI-108 Consultation Intelligence readiness PASSED");
