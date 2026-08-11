/**
 * Runtime Voice Engine readiness runner for CO-AI-113.
 */
import { runEaiVoiceEngineReadiness } from "../src/lib/enterprise-ai-platform/voice/readiness.ts";

const result = await runEaiVoiceEngineReadiness();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) {
  console.error("CO-AI-113 Voice Engine readiness FAILED");
  process.exit(1);
}
console.log("CO-AI-113 Voice Engine readiness PASSED");
