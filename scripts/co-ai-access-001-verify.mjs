/**
 * CO-AI-ACCESS-001 — AI permission model verification.
 * Usage: node --import tsx scripts/co-ai-access-001-verify.mjs
 */
import {
  AI_CAPABILITIES,
  canGrantAiAccess,
} from "../src/constants/enterprise-ai-access/index.ts";
import {
  assertAiCapabilities,
  defaultUserAiCapabilities,
  hasAiCapability,
  mergeAiCapabilityPatch,
  parseUserAiCapabilitiesJson,
} from "../src/lib/enterprise-ai-access/resolve.ts";
import { rejectSpoofedUserIdentity } from "../src/lib/chatgpt-integration/spoof-guard.ts";

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}

const defaults = defaultUserAiCapabilities();
if (Object.values(defaults).some(Boolean)) fail("Defaults must all be OFF");
else ok("New user defaults all AI capabilities OFF");

const superAdminRoleParsed = parseUserAiCapabilitiesJson({});
if (superAdminRoleParsed.AI_ACCESS) fail("Existing user JSON {} must not grant AI access");
else ok("Existing user without AI JSON remains OFF");

const patched = mergeAiCapabilityPatch(defaults, {
  AI_ACCESS: true,
  AI_TEXT: true,
  AI_CHANAKYA: true,
});
if (!patched.AI_ACCESS || !patched.AI_TEXT || !patched.AI_CHANAKYA) {
  fail("Patch should enable granted capabilities");
} else ok("Admin patch enables explicit capabilities");

if (patched.AI_ACTIONS) fail("AI_ACTIONS must remain OFF in V1");
else ok("AI_ACTIONS forced OFF");

const withActionsInDb = parseUserAiCapabilitiesJson({ AI_ACCESS: true, AI_ACTIONS: true });
if (withActionsInDb.AI_ACTIONS) fail("Stored AI_ACTIONS true must be ignored");
else ok("AI_ACTIONS always unavailable even if stored");

try {
  assertAiCapabilities(defaults, [AI_CAPABILITIES.AI_CATALYST_INTELLIGENCE]);
  fail("AI_ACCESS OFF should block");
} catch (e) {
  if (e && typeof e === "object" && "code" in e && e.code === "AI_ACCESS_DENIED") ok("AI_ACCESS OFF blocks");
  else fail("Expected AI_ACCESS_DENIED");
}

const chanakyaOff = mergeAiCapabilityPatch(defaults, {
  AI_ACCESS: true,
  AI_TEXT: true,
  AI_CATALYST_INTELLIGENCE: true,
});
try {
  assertAiCapabilities(chanakyaOff, [AI_CAPABILITIES.AI_CHANAKYA]);
  fail("AI_CHANAKYA OFF should block chanakya endpoint");
} catch (e) {
  if (e && typeof e === "object" && "code" in e && e.code === "AI_CAPABILITY_DENIED") {
    ok("AI_CHANAKYA OFF blocks Chanakya capability");
  } else fail("Expected AI_CAPABILITY_DENIED for Chanakya");
}

const textOnly = mergeAiCapabilityPatch(defaults, {
  AI_ACCESS: true,
  AI_TEXT: true,
  AI_CATALYST_INTELLIGENCE: true,
});
if (hasAiCapability(textOnly, AI_CAPABILITIES.AI_VOICE)) fail("AI_TEXT must not grant AI_VOICE");
else ok("AI_TEXT independent from AI_VOICE");

const voiceOnly = mergeAiCapabilityPatch(defaults, {
  AI_ACCESS: true,
  AI_VOICE: true,
  AI_CATALYST_INTELLIGENCE: true,
});
if (hasAiCapability(voiceOnly, AI_CAPABILITIES.AI_TEXT)) fail("AI_VOICE must not grant AI_TEXT");
else ok("AI_VOICE independent from AI_TEXT");

if (canGrantAiAccess("SUPER_ADMIN") && canGrantAiAccess("ADMIN")) ok("Admins can grant AI access");
else fail("SUPER_ADMIN/ADMIN must grant AI access");

if (!canGrantAiAccess("VIEWER") && !canGrantAiAccess("ANALYST") && !canGrantAiAccess("MANAGER")) {
  ok("Non-admin roles cannot grant AI access");
} else fail("VIEWER/ANALYST/MANAGER must not grant AI access");

const spoofQuery = rejectSpoofedUserIdentity(new Request("http://local/x?userId=abc"));
if (spoofQuery?.code === "IDENTITY_SPOOFING_REJECTED") {
  ok("userId query param rejected");
} else fail("userId query spoof not rejected");

const spoofHeader = rejectSpoofedUserIdentity(
  new Request("http://local/x", { headers: { "x-user-id": "abc" } }),
);
if (spoofHeader?.code === "IDENTITY_SPOOFING_REJECTED") {
  ok("userId header rejected");
} else fail("userId header spoof not rejected");

if (failed) {
  console.error(`\nCO-AI-ACCESS-001: FAIL (${failed})`);
  process.exit(1);
}

console.log("\nCO-AI-ACCESS-001: PASS");
