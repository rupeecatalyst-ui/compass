/**
 * CO-CHATGPT-INTEGRATION-V1 — static + unit verification.
 * Usage: node --import tsx scripts/co-chatgpt-integration-v1-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  authenticateChatGptIntegration,
  extractChatGptIntegrationApiKey,
  isChatGptIntegrationConfigured,
} from "../src/lib/chatgpt-integration/auth.ts";
import {
  CHATGPT_INTEGRATION_ALLOWED_ENDPOINTS,
  CHATGPT_INTEGRATION_RATE_LIMIT_MAX_REQUESTS,
} from "../src/lib/chatgpt-integration/constants.ts";
import {
  checkChatGptIntegrationRateLimit,
  resetChatGptIntegrationRateLimitForTests,
} from "../src/lib/chatgpt-integration/rate-limit.ts";
import {
  assertNoSecretsInResponse,
  redactPersonName,
} from "../src/lib/chatgpt-integration/sanitize.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}

for (const endpoint of CHATGPT_INTEGRATION_ALLOWED_ENDPOINTS) {
  const slug = endpoint.split("/").pop();
  const routePath = `src/app/api/integrations/chatgpt/v1/${slug}/route.ts`;
  if (!fs.existsSync(path.join(root, routePath))) {
    fail(`Missing route file for ${endpoint}`);
  } else {
    const content = read(routePath);
    if (!content.includes("createChatGptIntegrationRouteHandlers")) {
      fail(`${routePath} missing shared handler`);
    } else {
      ok(`Route wired: ${endpoint}`);
    }
  }
}

if (fs.existsSync(path.join(root, "src/app/api/integrations/chatgpt/v1/[...path]/route.ts"))) {
  ok("Unknown-path catch-all returns 404");
} else {
  fail("Missing catch-all route for unknown integration paths");
}

if (read("src/lib/chatgpt-integration/auth.ts").includes("timingSafeEqual")) {
  ok("Auth uses timing-safe comparison");
} else {
  fail("Auth missing timingSafeEqual");
}

if (!read("src/lib/chatgpt-integration/org-context.ts").includes("resolvePilotOrganizationId")) {
  fail("Org context must use resolvePilotOrganizationId");
} else {
  ok("Organization scoping uses pilot org SSOT");
}

if (read(".env.example").includes("CHATGPT_INTEGRATION_API_KEY")) {
  ok(".env.example documents integration key env name");
} else {
  fail(".env.example missing CHATGPT_INTEGRATION_API_KEY");
}

if (fs.existsSync(path.join(root, "src/app/api/integrations/chatgpt/v1/oauth/authorize/route.ts"))) {
  ok("OAuth authorize endpoint present");
} else {
  fail("Missing OAuth authorize endpoint");
}

if (read("docs/co-chatgpt-integration/CO-CHATGPT-INTEGRATION-V1.openapi.yaml").includes("ChatGptIntegrationOAuth")) {
  ok("OpenAPI documents OAuth security scheme");
} else {
  fail("OpenAPI missing OAuth security scheme");
}

const prevKey = process.env.CHATGPT_INTEGRATION_API_KEY;
process.env.CHATGPT_INTEGRATION_API_KEY = "verify-primary-key,verify-rotation-key";

if (!isChatGptIntegrationConfigured()) fail("Expected configured when env key set");
else ok("Configured when env key present");

const missing = authenticateChatGptIntegration(new Request("http://local/test"));
if (missing.ok) fail("Missing key should fail auth");
else if (missing.code !== "MISSING_KEY") fail(`Expected MISSING_KEY got ${missing.code}`);
else ok("Missing API key rejected");

const invalid = authenticateChatGptIntegration(
  new Request("http://local/test", {
    headers: { "X-ChatGPT-Integration-Key": "wrong-key-value" },
  }),
);
if (invalid.ok) fail("Invalid key should fail auth");
else ok("Invalid API key rejected");

const validPrimary = authenticateChatGptIntegration(
  new Request("http://local/test", {
    headers: { "X-ChatGPT-Integration-Key": "verify-primary-key" },
  }),
);
if (!validPrimary.ok) fail("Primary key should authenticate");
else ok("Valid primary API key accepted");

const validRotation = authenticateChatGptIntegration(
  new Request("http://local/test", {
    headers: { "X-ChatGPT-Integration-Key": "verify-rotation-key" },
  }),
);
if (!validRotation.ok) fail("Rotation key should authenticate");
else ok("Valid rotation API key accepted");

if (
  extractChatGptIntegrationApiKey(
    new Request("http://local", { headers: { "X-ChatGPT-Integration-Key": "abc" } }),
  ) !== "abc"
) {
  fail("Integration key header extraction failed");
} else {
  ok("Integration key header extraction");
}

if (read("src/lib/chatgpt-integration/user-identity.ts").includes("verifyChatGptIntegrationAccessToken")) {
  ok("User OAuth integration token + AI capability gate present");
} else {
  fail("Missing OAuth integration token gate");
}

if (read("src/lib/chatgpt-integration/route-handler.ts").includes("authenticateChatGptIntegrationUser")) {
  ok("Route handler enforces user AI access");
} else {
  fail("Route handler missing user AI enforcement");
}

if (fs.existsSync(path.join(root, "src/app/api/admin/users/[userId]/ai-access/route.ts"))) {
  ok("Admin AI access API present");
} else {
  fail("Missing admin AI access API");
}

process.env.CHATGPT_INTEGRATION_API_KEY = "";
const notConfigured = authenticateChatGptIntegration(
  new Request("http://local/test", {
    headers: { "X-ChatGPT-Integration-Key": "anything" },
  }),
);
if (notConfigured.ok || notConfigured.code !== "NOT_CONFIGURED") {
  fail("Expected NOT_CONFIGURED when env unset");
} else {
  ok("Fail closed when integration key not configured");
}

process.env.CHATGPT_INTEGRATION_API_KEY = prevKey ?? "verify-primary-key,verify-rotation-key";

resetChatGptIntegrationRateLimitForTests();
const rlReq = (i) =>
  new Request(`http://local/test?n=${i}`, {
    headers: {
      "X-ChatGPT-Integration-Key": "verify-primary-key",
      "x-forwarded-for": "203.0.113.10",
    },
  });

let lastAllowed = null;
for (let i = 0; i < CHATGPT_INTEGRATION_RATE_LIMIT_MAX_REQUESTS; i += 1) {
  lastAllowed = checkChatGptIntegrationRateLimit(rlReq(i), "verify-primary-key");
  if (!lastAllowed.allowed) {
    fail(`Unexpected rate limit at request ${i + 1}`);
    break;
  }
}
if (lastAllowed?.allowed) {
  ok(`Rate limit allows ${CHATGPT_INTEGRATION_RATE_LIMIT_MAX_REQUESTS} requests/window`);
}
const blocked = checkChatGptIntegrationRateLimit(rlReq(999), "verify-primary-key");
if (blocked.allowed) fail("Expected rate limit block after window capacity");
else ok("Rate limit blocks excess requests");

resetChatGptIntegrationRateLimitForTests();

if (redactPersonName("Amit Sharma") !== "A. S.") fail("Name redaction unexpected");
else ok("PII name redaction");

try {
  assertNoSecretsInResponse({ ok: true, databaseUrl: "postgresql://user:pass@host/db" });
  fail("Secret guard should block postgres URLs");
} catch {
  ok("Secret guard blocks connection strings in responses");
}

try {
  assertNoSecretsInResponse({
    requestId: "req-1",
    organizationSlug: "rupee-catalyst",
    counts: { deals: 3 },
  });
  ok("Sanitized DTO passes secret guard");
} catch (e) {
  fail(`Sanitized DTO blocked unexpectedly: ${e instanceof Error ? e.message : e}`);
}

for (const endpoint of CHATGPT_INTEGRATION_ALLOWED_ENDPOINTS) {
  const slug = endpoint.split("/").pop();
  const routeFile = read(`src/app/api/integrations/chatgpt/v1/${slug}/route.ts`);
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    if (!routeFile.includes(method)) fail(`${slug} route missing ${method} rejection export`);
  }
}
ok("All integration routes export non-GET rejection handlers");

if (failed) {
  console.error(`\nCO-CHATGPT-INTEGRATION-V1: FAIL (${failed})`);
  process.exit(1);
}

console.log("\nCO-CHATGPT-INTEGRATION-V1: PASS");
