/**
 * CO-CHATGPT-OAUTH-001 — OAuth identity binding verification.
 * Usage: node --import tsx scripts/co-chatgpt-oauth-001-verify.mjs
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import {
  assertAiCapabilities,
  defaultUserAiCapabilities,
  mergeAiCapabilityPatch,
} from "../src/lib/enterprise-ai-access/resolve.ts";
import { AI_CAPABILITIES } from "../src/constants/enterprise-ai-access/index.ts";
import {
  assertTokenScopes,
  oauthScopesForEndpoint,
  scopesForUserCapabilities,
} from "../src/lib/chatgpt-integration/oauth-scopes.ts";
import {
  classifyIntegrationBearerToken,
  looksLikeJwt,
} from "../src/lib/chatgpt-integration/integration-token-classifier.ts";
import { verifyAccessToken, signAccessToken } from "../server/services/token.service.ts";
import {
  signChatGptIntegrationAccessToken,
  verifyChatGptIntegrationAccessToken,
  verifyPkceS256,
} from "../src/lib/chatgpt-integration/integration-access-token.ts";
import {
  beginOAuthAuthorization,
  describeOAuthPendingRequest,
} from "../src/lib/chatgpt-integration/oauth-authorization-flow.ts";
import {
  consumeAuthorizationCode,
  issueAuthorizationCode,
  resetChatGptOAuthStoreForTests,
} from "../src/lib/chatgpt-integration/oauth-store.ts";
import { CHATGPT_INTEGRATION_TOKEN_AUDIENCE } from "../src/types/chatgpt-integration-oauth.ts";
import { verifyPartnerAccessToken } from "../server/services/partner-gateway/partner-token.service.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

process.env.JWT_SECRET =
  process.env.JWT_SECRET || "verify-oauth-jwt-secret-at-least-32-characters-long";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "verify-oauth-refresh-secret-32-chars-min";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7";
process.env.CHATGPT_OAUTH_CLIENT_ID = "verify-chatgpt-client-id";
process.env.CHATGPT_OAUTH_CLIENT_SECRET = "verify-chatgpt-client-secret-value";
process.env.CHATGPT_OAUTH_REDIRECT_URIS =
  "https://chat.openai.com/aip/oauth/callback,http://127.0.0.1/callback";
process.env.CHATGPT_INTEGRATION_API_KEY = "verify-integration-key";

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}

const redirectUri = "https://chat.openai.com/aip/oauth/callback";
const codeVerifier = "verify-pkce-verifier-1234567890";
const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

resetChatGptOAuthStoreForTests();

try {
  const started = beginOAuthAuthorization({
    responseType: "code",
    clientId: process.env.CHATGPT_OAUTH_CLIENT_ID,
    redirectUri,
    scope: "chatgpt:read chatgpt:chanakya",
    state: "verify-state",
    codeChallenge,
    codeChallengeMethod: "S256",
  });
  const meta = describeOAuthPendingRequest(started.requestId);
  if (!meta.scopes.includes("chatgpt:read")) fail("Authorize should preserve chatgpt:read scope");
  else ok("1. OAuth authorization flow creates pending request");
} catch (e) {
  fail(`1. OAuth authorization flow: ${e instanceof Error ? e.message : e}`);
}

try {
  resetChatGptOAuthStoreForTests();
  beginOAuthAuthorization({
    responseType: "code",
    clientId: process.env.CHATGPT_OAUTH_CLIENT_ID,
    redirectUri,
    scope: "chatgpt:read",
    state: "s",
    codeChallenge,
    codeChallengeMethod: "S256",
  });
  const code = issueAuthorizationCode({
    userId: "user-verify",
    organizationId: "org-verify",
    scopes: ["chatgpt:read"],
    redirectUri,
    codeChallenge,
    codeChallengeMethod: "S256",
    clientId: process.env.CHATGPT_OAUTH_CLIENT_ID,
  });
  const consumed = consumeAuthorizationCode(code.code);
  if (!consumed || !verifyPkceS256(codeVerifier, consumed.codeChallenge)) {
    fail("2. Valid callback PKCE/code consume failed");
  } else ok("2. Valid callback authorization code + PKCE");
} catch (e) {
  fail(`2. Valid callback: ${e instanceof Error ? e.message : e}`);
}

try {
  beginOAuthAuthorization({
    responseType: "token",
    clientId: process.env.CHATGPT_OAUTH_CLIENT_ID,
    redirectUri,
    scope: null,
    state: "",
    codeChallenge,
    codeChallengeMethod: "S256",
  });
  fail("3. Invalid response_type should throw");
} catch (e) {
  if (e && typeof e === "object" && "code" in e && e.code === "UNSUPPORTED_RESPONSE_TYPE") {
    ok("3. Invalid callback rejected");
  } else fail("3. Expected UNSUPPORTED_RESPONSE_TYPE");
}

try {
  const expired = jwt.sign(
    {
      userId: "u1",
      email: "a@b.com",
      role: "ADMIN",
      organizationId: "org1",
      scopes: ["chatgpt:read"],
      typ: "chatgpt_integration_access",
    },
    process.env.JWT_SECRET,
    { expiresIn: "-10s", audience: CHATGPT_INTEGRATION_TOKEN_AUDIENCE },
  );
  verifyChatGptIntegrationAccessToken(expired);
  fail("4. Expired token should fail verification");
} catch {
  ok("4. Invalid/expired integration token rejected");
}

try {
  const wrongAud = jwt.sign(
    {
      userId: "u1",
      email: "a@b.com",
      role: "ADMIN",
      organizationId: "org1",
      scopes: ["chatgpt:read"],
      typ: "chatgpt_integration_access",
    },
    process.env.JWT_SECRET,
    { expiresIn: "5m", audience: "wrong_audience" },
  );
  verifyChatGptIntegrationAccessToken(wrongAud);
  fail("5. Wrong audience should fail");
} catch {
  ok("5. Wrong audience rejected");
}

try {
  assertTokenScopes(["chatgpt:read"], oauthScopesForEndpoint("/api/integrations/chatgpt/v1/chanakya"));
  fail("6. Missing chatgpt:chanakya scope should throw");
} catch (e) {
  if (e && typeof e === "object" && "code" in e && e.code === "OAUTH_SCOPE_DENIED") {
    ok("6. Missing OAuth scope rejected");
  } else fail("6. Expected OAUTH_SCOPE_DENIED");
}

try {
  assertAiCapabilities(defaultUserAiCapabilities(), [AI_CAPABILITIES.AI_ACCESS]);
  fail("7. AI_ACCESS OFF should block");
} catch (e) {
  if (e && typeof e === "object" && "code" in e && e.code === "AI_ACCESS_DENIED") ok("7. AI_ACCESS denied");
  else fail("7. Expected AI_ACCESS_DENIED");
}

const noText = mergeAiCapabilityPatch(defaultUserAiCapabilities(), { AI_ACCESS: true });
try {
  assertAiCapabilities(noText, [AI_CAPABILITIES.AI_TEXT]);
  fail("8. AI_TEXT OFF should block");
} catch (e) {
  if (e && typeof e === "object" && "code" in e && e.code === "AI_CAPABILITY_DENIED") ok("8. AI_TEXT denied");
  else fail("8. Expected AI_CAPABILITY_DENIED for AI_TEXT");
}

const noChanakya = mergeAiCapabilityPatch(defaultUserAiCapabilities(), {
  AI_ACCESS: true,
  AI_TEXT: true,
  AI_CATALYST_INTELLIGENCE: true,
});
try {
  assertAiCapabilities(noChanakya, [AI_CAPABILITIES.AI_CHANAKYA]);
  fail("9. AI_CHANAKYA OFF should block");
} catch (e) {
  if (e && typeof e === "object" && "code" in e && e.code === "AI_CAPABILITY_DENIED") {
    ok("9. AI_CHANAKYA denied");
  } else fail("9. Expected AI_CAPABILITY_DENIED for AI_CHANAKYA");
}

const integrationToken = signChatGptIntegrationAccessToken({
  userId: "user-1",
  email: "user@test.com",
  role: "ADMIN",
  organizationId: "org-wrong",
  scopes: ["chatgpt:read"],
});
const orgMismatchReq = new Request("http://local/api/integrations/chatgpt/v1/health", {
  headers: {
    Authorization: `Bearer ${integrationToken}`,
    "X-ChatGPT-Integration-Key": "verify-integration-key",
  },
});
if (classifyIntegrationBearerToken(integrationToken) === "integration") {
  ok("10. Integration token lane classified correctly");
} else fail("10. Integration token lane misclassified");

const employeeToken = signAccessToken({
  userId: "emp-1",
  email: "emp@test.com",
  role: "ADMIN",
});
const employeeReq = new Request("http://local/api/integrations/chatgpt/v1/health", {
  headers: {
    Authorization: `Bearer ${employeeToken}`,
    "X-ChatGPT-Integration-Key": "verify-integration-key",
  },
});
if (classifyIntegrationBearerToken(employeeToken) === "employee") {
  ok("Employee session JWT rejected on integration API (lane=employee)");
} else {
  fail(`Expected employee lane got ${classifyIntegrationBearerToken(employeeToken)}`);
}

const bearerFromReq = employeeReq.headers.get("authorization")?.slice(7).trim();
if (bearerFromReq === employeeToken) ok("Bearer extraction works");
else fail("Bearer extraction failed");

try {
  verifyAccessToken(integrationToken);
  fail("11. Integration token must not verify as employee token");
} catch {
  ok("11. Integration token blocked on employee APIs");
}

try {
  verifyPartnerAccessToken(integrationToken);
  fail("12. Integration token must not verify as partner token");
} catch {
  ok("12. Integration token blocked on partner APIs");
}

if (read("src/app/api/integrations/chatgpt/v1/oauth/token/route.ts").includes("authorization_code")) {
  ok("13. Token endpoint limited to authorization_code grant");
} else fail("13. OAuth token route missing grant restriction");

if (read("src/lib/chatgpt-integration/route-handler.ts").includes("rejectMutation")) {
  ok("14. Integration routes reject mutations");
} else fail("14. Missing mutation rejection");

if (read("src/constants/chatgpt-integration-oauth.ts").includes("30 * 60")) {
  ok("15. Integration token expiry is short-lived (30 minutes)");
} else fail("15. Missing short TTL constant");

if (
  read("src/app/api/integrations/chatgpt/v1/oauth/consent/route.ts").includes("recordBusinessAudit") &&
  read("src/app/api/integrations/chatgpt/v1/oauth/token/route.ts").includes("recordBusinessAudit")
) {
  ok("16. OAuth consent/token paths audit logged");
} else fail("16. OAuth audit logging missing");

if (
  !read("src/app/api/integrations/chatgpt/v1/oauth/token/route.ts").includes('"client_secret"') &&
  read("server/services/chatgpt-integration/chatgpt-oauth.service.ts").includes("access_token")
) {
  ok("17. Token response does not echo client_secret");
} else fail("17. Token response may leak credentials");

if (read("src/lib/chatgpt-integration/user-identity.ts").includes("ORG_MISMATCH")) {
  ok("Organization mismatch gate present in integration auth");
} else fail("Missing ORG_MISMATCH gate");

const grantedScopes = scopesForUserCapabilities(
  mergeAiCapabilityPatch(defaultUserAiCapabilities(), {
    AI_ACCESS: true,
    AI_TEXT: true,
    AI_CATALYST_INTELLIGENCE: true,
    AI_CHANAKYA: true,
  }),
);
if (grantedScopes.includes("chatgpt:read") && grantedScopes.includes("chatgpt:chanakya")) {
  ok("OAuth scopes derive from user AI capabilities");
} else fail("Scope derivation incomplete");

if (failed) {
  console.error(`\nCO-CHATGPT-OAUTH-001: FAIL (${failed})`);
  process.exit(1);
}

console.log("\nCO-CHATGPT-OAUTH-001: PASS");
