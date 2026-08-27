/**
 * CO-CHATGPT-GPT-ACTION-001 — GPT Action lane + OpenAPI compatibility verification.
 * Usage: node --import tsx scripts/co-chatgpt-gpt-action-001-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import { authenticateChatGptIntegration } from "../src/lib/chatgpt-integration/auth.ts";
import { CHATGPT_GPT_ACTION_BASE } from "../src/lib/chatgpt-integration/constants.ts";
import { signChatGptIntegrationAccessToken } from "../src/lib/chatgpt-integration/integration-access-token.ts";
import { signAccessToken } from "../server/services/token.service.ts";
import { CHATGPT_INTEGRATION_TOKEN_AUDIENCE } from "../src/types/chatgpt-integration-oauth.ts";

const CHATGPT_GPT_ACTION_SLUGS = [
  "health",
  "mission-control",
  "chanakya",
  "pipeline",
  "tasks",
  "email-status",
  "activity",
  "build",
  "enterprise-read",
];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

process.env.JWT_SECRET =
  process.env.JWT_SECRET || "verify-gpt-action-jwt-secret-at-least-32-characters";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "verify-gpt-action-refresh-secret-32-chars";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7";
process.env.CHATGPT_OAUTH_CLIENT_ID = process.env.CHATGPT_OAUTH_CLIENT_ID || "verify-client";
process.env.CHATGPT_OAUTH_CLIENT_SECRET =
  process.env.CHATGPT_OAUTH_CLIENT_SECRET || "verify-client-secret-value-long";
process.env.CHATGPT_OAUTH_REDIRECT_URIS =
  process.env.CHATGPT_OAUTH_REDIRECT_URIS || "https://chat.openai.com/aip/oauth/callback";
process.env.CHATGPT_INTEGRATION_API_KEY = "verify-dual-auth-key";

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}

const openapiPath = "docs/co-chatgpt-integration/CO-CHATGPT-GPT-ACTION.openapi.yaml";
if (!fs.existsSync(path.join(root, openapiPath))) fail("Missing GPT Action OpenAPI");
else ok(openapiPath);

const openapi = read(openapiPath);
const serverMatches = openapi.match(/^\s*- url:/gm) ?? [];
if (serverMatches.length !== 1) fail(`Expected 1 server, found ${serverMatches.length}`);
else ok("OpenAPI single production server");

if (openapi.includes("localhost")) fail("OpenAPI must not include localhost");
else ok("OpenAPI excludes localhost");

if (openapi.includes("ChatGptIntegrationApiKey")) fail("OpenAPI must not include API key scheme");
else ok("OpenAPI OAuth-only security scheme");

if (openapi.includes("/oauth/authorize:") || openapi.includes("/oauth/token:")) {
  fail("OpenAPI must not expose OAuth paths as business actions");
} else ok("OpenAPI excludes OAuth plumbing paths");

if (openapi.includes("authorizationUrl:") && openapi.includes("tokenUrl:")) {
  ok("OpenAPI OAuth flow URLs in securitySchemes only");
} else fail("OpenAPI missing OAuth flow URLs in securitySchemes");

for (const slug of CHATGPT_GPT_ACTION_SLUGS) {
  const needle = `${CHATGPT_GPT_ACTION_BASE}/${slug}:`;
  if (!openapi.includes(needle)) fail(`OpenAPI missing ${needle}`);
  else ok(`OpenAPI path ${slug}`);
}

const routePath = "src/app/api/integrations/chatgpt/v1/gpt-action/[slug]/route.ts";
if (!fs.existsSync(path.join(root, routePath))) fail("Missing gpt-action dynamic route");
else ok(routePath);

const gptHandler = read("src/lib/chatgpt-integration/gpt-action-route-handler.ts");
if (gptHandler.includes("isChatGptOAuthConfigured")) {
  ok("GPT Action handler requires OAuth configuration");
} else fail("GPT Action handler must gate on OAuth config");

if (
  gptHandler.includes("authenticateChatGptIntegrationUser") &&
  !gptHandler.includes("authenticateChatGptIntegration(")
) {
  ok("GPT Action handler OAuth-only (no API key gate)");
} else fail("GPT Action handler must not require API key");

if (
  read("src/lib/chatgpt-integration/route-handler.ts").includes("authenticateChatGptIntegration")
) {
  ok("Dual-auth v1 handler unchanged (API key still required)");
} else fail("Dual-auth handler missing API key gate");

// Dual-auth still requires API key without bearer
const dualMissing = authenticateChatGptIntegration(new Request("http://local/test"));
if (dualMissing.ok || dualMissing.code !== "MISSING_KEY") {
  fail("Dual-auth lane must still require API key");
} else ok("Dual-auth v1 still requires X-ChatGPT-Integration-Key");

// Integration token shape
const integrationToken = signChatGptIntegrationAccessToken({
  userId: "user-verify",
  email: "admin@example.com",
  role: "SUPER_ADMIN",
  organizationId: "org-verify",
  scopes: ["chatgpt:read", "chatgpt:chanakya"],
});
const decoded = jwt.decode(integrationToken, { complete: true });
if (decoded?.payload?.aud !== CHATGPT_INTEGRATION_TOKEN_AUDIENCE) {
  fail("Integration token audience mismatch");
} else ok("Integration token audience catalyst_one_chatgpt");

const employeeToken = signAccessToken({
  userId: "user-verify",
  email: "admin@example.com",
  role: "SUPER_ADMIN",
});
if (employeeToken === integrationToken) fail("Employee and integration tokens must differ");
else ok("Employee JWT distinct from integration JWT");

if (failed) {
  console.error(`\nCO-CHATGPT-GPT-ACTION-001 verify: FAIL (${failed})`);
  process.exit(1);
}

console.log("\nCO-CHATGPT-GPT-ACTION-001 verify: PASS");
