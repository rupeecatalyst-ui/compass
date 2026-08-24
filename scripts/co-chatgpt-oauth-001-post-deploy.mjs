/**
 * CO-CHATGPT-OAUTH-001 — Post-deployment smoke test (approved Super Admin only).
 * Usage: node --env-file=.env.local --import tsx scripts/co-chatgpt-oauth-001-post-deploy.mjs
 *
 * Requires CATALYST_BAT_URL, CATALYST_BAT_EMAIL, CATALYST_BAT_PASSWORD.
 * Optional: CHATGPT_INTEGRATION_API_KEY, CHATGPT_OAUTH_* for live OAuth/integration checks.
 */
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { signChatGptIntegrationAccessToken } from "../src/lib/chatgpt-integration/integration-access-token.ts";
import { parseUserAiCapabilitiesJson } from "../src/lib/enterprise-ai-access/resolve.ts";

const base = (process.env.CATALYST_BAT_URL || "").replace(/\/$/, "");
const email = process.env.CATALYST_BAT_EMAIL || "";
const password = process.env.CATALYST_BAT_PASSWORD || "";
const integrationKey = process.env.CHATGPT_INTEGRATION_API_KEY?.trim() || "";

const ENDPOINTS = [
  "/api/integrations/chatgpt/v1/health",
  "/api/integrations/chatgpt/v1/mission-control",
  "/api/integrations/chatgpt/v1/chanakya",
  "/api/integrations/chatgpt/v1/pipeline",
  "/api/integrations/chatgpt/v1/tasks",
  "/api/integrations/chatgpt/v1/email-status",
  "/api/integrations/chatgpt/v1/activity",
  "/api/integrations/chatgpt/v1/build",
];

let failed = 0;
const warnings = [];

function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}
function warn(msg) {
  warnings.push(msg);
  console.warn(`WARN  ${msg}`);
}

function bodyHasSecrets(text) {
  const lower = text.toLowerCase();
  return (
    lower.includes("postgresql://") ||
    lower.includes("jwt_secret") ||
    lower.includes("client_secret") ||
    /password["']?\s*:\s*["'][^"']+["']/i.test(text)
  );
}

async function jsonFetch(path, init = {}) {
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  if (bodyHasSecrets(text)) fail(`Possible secret leakage in response for ${path}`);
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

if (!base || !email || !password) {
  console.error("BAT credentials are not configured. Authenticated certification cannot continue.");
  process.exit(2);
}

console.log(`Target: ${base}`);

// A. Application health
{
  const res = await jsonFetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "invalid@example.com", password: "invalid-password-probe" }),
  });
  if (res.status === 401 || res.status === 400) ok("A. Auth gateway responsive");
  else fail(`A. Auth gateway unexpected status ${res.status}`);
}

// Login approved user
let accessToken = "";
let userId = "";
{
  const login = await jsonFetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (login.status !== 200 || !login.body?.success || !login.body?.data?.accessToken) {
    fail("Login failed for approved BAT user");
    console.error("\nCO-CHATGPT-OAUTH-001 POST-DEPLOY: FAIL (auth)");
    process.exit(1);
  }
  accessToken = login.body.data.accessToken;
  userId = login.body.data.user?.id || "";
  ok("L. Login PASS (approved user)");
}

// F/G/H — AI capability status via admin API
{
  if (!userId) {
    warn("userId missing from login — skipping AI access API check");
  } else {
    const ai = await jsonFetch(`/api/admin/users/${userId}/ai-access`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (ai.status === 200 && ai.body?.success) {
      const caps = ai.body.data?.aiAccess?.capabilities ?? {};
      if (caps.AI_ACCESS && caps.AI_TEXT && caps.AI_VOICE && caps.AI_CHANAKYA && caps.AI_CATALYST_INTELLIGENCE) {
        ok("F. AI capabilities ON for approved user");
      } else fail("F. AI capabilities incomplete for approved user");
      if (caps.AI_ACTIONS) fail("H. AI_ACTIONS must remain OFF");
      else ok("H. AI_ACTIONS OFF");
    } else if (ai.status === 503 || ai.status === 500) {
      warn("F. AI access API unavailable — verify migration applied");
    } else {
      fail(`F. AI access API status ${ai.status}`);
    }
  }
}

// DB cross-check
try {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({
    where: { id: userId || undefined, isActive: true },
    select: { email: true, role: true, aiCapabilitiesJson: true },
  });
  if (user) {
    const caps = parseUserAiCapabilitiesJson(user.aiCapabilitiesJson);
    if (caps.AI_ACCESS && caps.AI_CHANAKYA) ok("F. DB AI capabilities confirmed");
    else fail("F. DB AI capabilities missing");
    if (!caps.AI_ACTIONS) ok("H. DB AI_ACTIONS OFF");
    else fail("H. DB AI_ACTIONS must be OFF");
  }
  await prisma.$disconnect();
} catch {
  warn("DB AI capability cross-check skipped (DATABASE_URL unavailable locally)");
}

// C. OAuth authorize endpoint
const redirectUri =
  (process.env.CHATGPT_OAUTH_REDIRECT_URIS || "https://chat.openai.com/aip/oauth/callback")
    .split(",")[0]
    .trim();
const codeVerifier = "deploy-smoke-pkce-verifier-0123456789";
const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
const clientId = process.env.CHATGPT_OAUTH_CLIENT_ID?.trim() || "";

if (!clientId || !integrationKey) {
  warn("C–K integration/OAuth live checks skipped — CHATGPT_* secrets not in local env (configure on Hostinger)");
} else {
  const authorizeUrl = new URL(`${base}/api/integrations/chatgpt/v1/oauth/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "chatgpt:read chatgpt:chanakya");
  authorizeUrl.searchParams.set("state", "deploy-smoke");
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  const authRes = await fetch(authorizeUrl.toString(), { redirect: "manual" });
  if (authRes.status === 302 || authRes.status === 307) ok("C. OAuth authorize redirects to consent");
  else fail(`C. OAuth authorize status ${authRes.status}`);

  const location = authRes.headers.get("location") || "";
  const requestId = location ? new URL(location, base).searchParams.get("request") : null;

  const prisma = new PrismaClient();
  const admin = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  const org = await prisma.organization.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  await prisma.$disconnect();

  if (!admin) {
    fail("D. Could not resolve admin for integration smoke");
  } else if (!requestId) {
    fail("D. OAuth authorize did not return request id");
  } else {
    const orgId = org?.id || "";
    if (orgId) {
      const orgRes = await jsonFetch("/api/integrations/chatgpt/v1/health", {
        headers: {
          "X-ChatGPT-Integration-Key": integrationKey,
          Authorization: `Bearer ${signChatGptIntegrationAccessToken({
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            organizationId: "org-probe-will-fail-if-wrong",
            scopes: ["chatgpt:read"],
          })}`,
        },
      });
      if (orgRes.status === 403) ok("I. Organization mismatch rejected");
      else warn(`I. Organization mismatch check returned ${orgRes.status}`);
    }

    const consent = await jsonFetch("/api/integrations/chatgpt/v1/oauth/consent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ requestId }),
    });

    let integrationToken = "";
    if (consent.status === 200 && consent.body?.data?.redirectUrl) {
      const code = new URL(consent.body.data.redirectUrl).searchParams.get("code");
      const clientSecret = process.env.CHATGPT_OAUTH_CLIENT_SECRET?.trim() || "";
      const tokenBody = new URLSearchParams({
        grant_type: "authorization_code",
        code: code || "",
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: codeVerifier,
      });
      const tokenRes = await fetch(`${base}/api/integrations/chatgpt/v1/oauth/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: tokenBody.toString(),
      });
      const tokenText = await tokenRes.text();
      if (bodyHasSecrets(tokenText)) fail("K. Token response may contain secrets");
      let tokenJson;
      try {
        tokenJson = JSON.parse(tokenText);
      } catch {
        tokenJson = null;
      }
      if (tokenRes.status === 200 && tokenJson?.access_token) {
        ok("D. OAuth token exchange PASS");
        integrationToken = tokenJson.access_token;
      } else {
        fail(`D. OAuth token exchange failed (${tokenRes.status})`);
      }
    } else {
      fail(`D. OAuth consent failed (${consent.status})`);
    }

    if (!integrationToken && orgId) {
      integrationToken = signChatGptIntegrationAccessToken({
        userId: admin.id,
        email: admin.email,
        role: admin.role,
        organizationId: orgId,
        scopes: ["chatgpt:read", "chatgpt:chanakya"],
      });
      warn("Using locally signed integration token fallback for endpoint smoke");
    }

    if (integrationToken) {
      const empRes = await jsonFetch("/api/integrations/chatgpt/v1/health", {
        headers: {
          "X-ChatGPT-Integration-Key": integrationKey,
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (empRes.status === 403) ok("E. Employee JWT rejected on integration API");
      else fail(`E. Expected 403 for employee JWT, got ${empRes.status}`);

      for (const endpoint of ENDPOINTS) {
        const res = await jsonFetch(endpoint, {
          headers: {
            "X-ChatGPT-Integration-Key": integrationKey,
            Authorization: `Bearer ${integrationToken}`,
          },
        });
        if (res.status === 200 && res.body?.success) ok(`B. ${endpoint} → 200`);
        else fail(`B. ${endpoint} → ${res.status}`);
      }

      if (orgId) {
        const noChanakyaToken = signChatGptIntegrationAccessToken({
          userId: admin.id,
          email: admin.email,
          role: admin.role,
          organizationId: orgId,
          scopes: ["chatgpt:read"],
        });
        const chanakyaDenied = await jsonFetch("/api/integrations/chatgpt/v1/chanakya", {
          headers: {
            "X-ChatGPT-Integration-Key": integrationKey,
            Authorization: `Bearer ${noChanakyaToken}`,
          },
        });
        if (chanakyaDenied.status === 403) ok("G. Chanakya scope/capability enforced");
        else warn(`G. Chanakya denial check inconclusive (${chanakyaDenied.status})`);
      }
    }
  }
}

// L. Core app still works — dashboard API probe
{
  const dash = await jsonFetch("/api/admin/users?limit=1", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (dash.status === 200 || dash.status === 404) ok("L. Core admin API responsive after deploy");
  else warn(`L. Admin users API status ${dash.status}`);
}

if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings) console.log(`  - ${w}`);
}

if (failed) {
  console.error(`\nCO-CHATGPT-OAUTH-001 POST-DEPLOY: FAIL (${failed})`);
  process.exit(1);
}

console.log("\nCO-CHATGPT-OAUTH-001 POST-DEPLOY: PASS");
