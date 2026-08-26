/**
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 — verification.
 * Usage: node --import tsx scripts/co-chanakya-enterprise-read-context-002-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  redactCustomerContactPiiForAiContext,
  assertNoCustomerContactPiiInAiContext,
  CHANAKYA_CONTACT_PII_REDACTION_MARKER,
} from "../src/lib/chanakya-enterprise-read-context/redact-pii.ts";
import {
  recordChanakyaEnterpriseReadAudit,
  listChanakyaEnterpriseReadAudit,
  resetChanakyaEnterpriseReadAuditForTests,
} from "../src/lib/chanakya-enterprise-read-context/audit.ts";
import {
  issueOAuthRefreshToken,
  consumeOAuthRefreshToken,
  resetChatGptOAuthStoreForTests,
  issueAuthorizationCode,
  consumeAuthorizationCode,
} from "../src/lib/chatgpt-integration/oauth-store.ts";
import {
  signChatGptIntegrationAccessToken,
  verifyChatGptIntegrationAccessToken,
} from "../src/lib/chatgpt-integration/integration-access-token.ts";
import { CHATGPT_INTEGRATION_ALLOWED_ENDPOINTS } from "../src/lib/chatgpt-integration/constants.ts";
import { oauthScopesForEndpoint } from "../src/lib/chatgpt-integration/oauth-scopes.ts";
import { CHATGPT_OAUTH_SCOPES } from "../src/types/chatgpt-integration-oauth.ts";
import {
  CHANAKYA_ENTERPRISE_READ_DOMAINS,
  CHANAKYA_ENTERPRISE_READ_MODES,
} from "../src/types/chanakya-enterprise-read-context.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

process.env.JWT_SECRET =
  process.env.JWT_SECRET || "verify-cer-002-jwt-secret-at-least-32-characters";

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}

// --- Privacy redaction ---
{
  const sample = {
    id: "opp_1",
    primaryContactName: "Asha Sharma",
    primaryContactMobile: "9876543210",
    primaryContactEmail: "asha@example.com",
    nested: {
      mobile: "9111111111",
      email: "x@y.com",
      cityLabel: "Pune",
    },
    emailStatus: "ok",
  };
  const redacted = redactCustomerContactPiiForAiContext(sample);
  if (redacted.primaryContactMobile || redacted.primaryContactEmail) {
    fail("primaryContact mobile/email must be omitted");
  } else ok("Omits primaryContact mobile/email");
  if (redacted.nested?.mobile || redacted.nested?.email) {
    fail("nested mobile/email must be omitted");
  } else ok("Omits nested mobile/email");
  if (redacted.nested?.cityLabel !== "Pune") fail("cityLabel must survive");
  else ok("Non-PII fields preserved");
  if (redacted.emailStatus !== "ok") fail("emailStatus operational field must survive");
  else ok("Operational emailStatus preserved");

  try {
    assertNoCustomerContactPiiInAiContext(redacted);
    ok("assertNoCustomerContactPiiInAiContext accepts redacted payload");
  } catch {
    fail("assertNoCustomerContactPiiInAiContext rejected clean payload");
  }

  try {
    assertNoCustomerContactPiiInAiContext(sample);
    fail("assertNoCustomerContactPiiInAiContext must reject raw PII");
  } catch {
    ok("assertNoCustomerContactPiiInAiContext rejects raw PII");
  }

  if (CHANAKYA_CONTACT_PII_REDACTION_MARKER !== "[REDACTED]") {
    fail("redaction marker constant");
  } else ok("Redaction marker constant present");
}

// --- Contracts / modes ---
{
  if (CHANAKYA_ENTERPRISE_READ_MODES.length !== 5) fail("modes count");
  else ok("Read modes: summary/opportunity/domain/enterprise/transaction");
  if (!CHANAKYA_ENTERPRISE_READ_MODES.includes("transaction")) {
    fail("transaction mode missing");
  } else ok("transaction mode present");
  if (CHANAKYA_ENTERPRISE_READ_DOMAINS.length < 9) fail("domain contracts incomplete");
  else ok(`Domain contracts (${CHANAKYA_ENTERPRISE_READ_DOMAINS.length})`);
  if (!CHANAKYA_ENTERPRISE_READ_DOMAINS.includes("productLender")) {
    fail("productLender domain missing");
  } else ok("productLender domain present");
}

// --- Audit (no PII) ---
{
  resetChanakyaEnterpriseReadAuditForTests();
  recordChanakyaEnterpriseReadAudit({
    correlationId: "corr_test",
    mode: "summary",
    domains: ["executive"],
    organizationId: "org_test",
    outcome: "success",
    summary: "test",
    entityScope: "OPP-TEST",
    actorUserId: "user_1",
  });
  const events = listChanakyaEnterpriseReadAudit(5);
  if (events.length !== 1) fail("audit event not recorded");
  else ok("Enterprise read audit recorded");
  const json = JSON.stringify(events[0]);
  if (/9876543210|asha@example/.test(json)) fail("audit leaked PII");
  else ok("Audit payload free of sample PII");
}

// --- OAuth refresh ---
{
  resetChatGptOAuthStoreForTests();
  const { refreshToken, record } = issueOAuthRefreshToken({
    userId: "u1",
    organizationId: "org1",
    scopes: [CHATGPT_OAUTH_SCOPES.READ, CHATGPT_OAUTH_SCOPES.CHANAKYA],
    clientId: "client_a",
  });
  if (!refreshToken.startsWith("cgo_rt_")) fail("refresh token format");
  else ok("Issues opaque refresh token");
  if (record.tokenHash === refreshToken) fail("must store hash not plaintext");
  else ok("Stores hashed refresh token only");

  const consumed = consumeOAuthRefreshToken(refreshToken, "client_a");
  if (!consumed || consumed.userId !== "u1") fail("refresh consume failed");
  else ok("Consumes valid refresh token");

  const wrongClient = consumeOAuthRefreshToken(refreshToken, "other");
  if (wrongClient) fail("refresh must reject wrong client");
  else ok("Rejects refresh for wrong client_id");

  const access = signChatGptIntegrationAccessToken({
    userId: "u1",
    email: "employee@rupeecatalyst.com",
    role: "SUPER_ADMIN",
    organizationId: "org1",
    scopes: [CHATGPT_OAUTH_SCOPES.READ, CHATGPT_OAUTH_SCOPES.CHANAKYA],
  });
  const payload = verifyChatGptIntegrationAccessToken(access);
  if (payload.userId !== "u1") fail("access token verify");
  else ok("Access token still signs/verifies after refresh work");

  // Auth code path still works
  const code = issueAuthorizationCode({
    userId: "u1",
    organizationId: "org1",
    scopes: [CHATGPT_OAUTH_SCOPES.READ],
    redirectUri: "https://chat.openai.com/aip/oauth/callback",
    codeChallenge: "abc",
    codeChallengeMethod: "S256",
    clientId: "client_a",
  });
  const used = consumeAuthorizationCode(code.code);
  if (!used) fail("authorization code path broken");
  else ok("Authorization code path intact");
}

// --- GPT Action surface read-only + enterprise-read ---
{
  const gptEndpointsSrc = read("src/lib/chatgpt-integration/gpt-action-endpoints.ts");
  if (!/"enterprise-read"/.test(gptEndpointsSrc)) {
    fail("enterprise-read GPT Action slug missing");
  } else ok("GPT Action slug enterprise-read registered");

  if (
    !CHATGPT_INTEGRATION_ALLOWED_ENDPOINTS.includes(
      "/api/integrations/chatgpt/v1/enterprise-read",
    )
  ) {
    fail("canonical enterprise-read endpoint missing");
  } else ok("Canonical enterprise-read endpoint allowlisted");

  const scopes = oauthScopesForEndpoint(
    "/api/integrations/chatgpt/v1/enterprise-read",
  );
  if (
    !scopes.includes(CHATGPT_OAUTH_SCOPES.READ) ||
    !scopes.includes(CHATGPT_OAUTH_SCOPES.CHANAKYA)
  ) {
    fail("enterprise-read scopes incomplete");
  } else ok("enterprise-read requires chatgpt:read + chatgpt:chanakya");

  const routeSrc = read("src/app/api/chanakya/enterprise-read-context/route.ts");
  if (!/METHOD_NOT_ALLOWED/.test(routeSrc) || !/export async function POST/.test(routeSrc)) {
    fail("employee enterprise-read-context must reject mutations");
  } else ok("Employee enterprise-read-context rejects mutations");

  const gptHandler = read("src/lib/chatgpt-integration/gpt-action-route-handler.ts");
  if (!/Only GET is permitted/.test(gptHandler)) {
    fail("GPT Action handler missing read-only enforcement");
  } else ok("GPT Action handler enforces GET-only");

  // Flag: no mutation operations in GPT Action OpenAPI paths (POST business actions)
  const gptOpenapi = read("docs/co-chatgpt-integration/CO-CHATGPT-GPT-ACTION.openapi.yaml");
  if (!/enterprise-read/.test(gptOpenapi)) fail("GPT Action OpenAPI missing enterprise-read");
  else ok("GPT Action OpenAPI documents enterprise-read");
  const mutationOps = gptOpenapi.match(/^\s+(post|put|patch|delete):/gim) || [];
  if (mutationOps.length > 0) {
    fail(`GPT Action OpenAPI exposes mutation verbs: ${mutationOps.join(",")}`);
  } else ok("GPT Action OpenAPI has no mutation verbs (GET-only)");

  const v1Openapi = read("docs/co-chatgpt-integration/CO-CHATGPT-INTEGRATION-V1.openapi.yaml");
  if (!/refresh_token/.test(v1Openapi)) fail("V1 OpenAPI missing refresh_token");
  else ok("V1 OpenAPI documents refresh_token grant");
  if (!/\/api\/integrations\/chatgpt\/v1\/enterprise-read/.test(v1Openapi)) {
    fail("V1 OpenAPI missing enterprise-read path");
  } else ok("V1 OpenAPI documents enterprise-read");
}

// --- Source presence ---
{
  const required = [
    "src/types/chanakya-enterprise-read-context.ts",
    "src/lib/chanakya-enterprise-read-context/compile.ts",
    "src/lib/chanakya-enterprise-read-context/opportunity-360.ts",
    "src/lib/chanakya-enterprise-read-context/deal-360.ts",
    "src/lib/chanakya-enterprise-read-context/transaction-attention.ts",
    "src/lib/chanakya-enterprise-read-context/redact-pii.ts",
    "src/app/api/chanakya/enterprise-read-context/route.ts",
    "src/app/api/integrations/chatgpt/v1/enterprise-read/route.ts",
    "server/services/chatgpt-integration/compose-enterprise-read.ts",
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(root, rel))) fail(`missing ${rel}`);
    else ok(`Present ${rel}`);
  }

  const compileSrc = read("src/lib/chanakya-enterprise-read-context/compile.ts");
  if (!/assembleChanakyaDeal360/.test(compileSrc)) fail("compile missing Deal 360");
  else ok("Compiler wires Deal 360");
  if (!/buildTransactionAttentionContext/.test(compileSrc)) {
    fail("compile missing transaction attention");
  } else ok("Compiler wires transaction attention");
  if (
    !/mode === "domain"/.test(compileSrc) ||
    !/!request\.opportunityRef/.test(compileSrc)
  ) {
    fail("domain mode must allow portfolio compile without opportunityRef");
  } else ok("Domain mode supports portfolio (no opportunityRef required)");

  const gather = read("src/lib/chanakya-credit-proposal/gather-context.ts");
  if (!/redactCustomerContactPiiForAiContext/.test(gather)) {
    fail("credit proposal gather-context must redact contact PII");
  } else ok("Credit proposal gather-context applies contact PII redaction");
}

if (failed > 0) {
  console.error(`\nCO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 verify FAILED (${failed})`);
  process.exit(1);
}
console.log("\nCO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 verify PASS");
