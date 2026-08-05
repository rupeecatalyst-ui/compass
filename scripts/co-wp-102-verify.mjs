/**
 * CO-WP-102 — static verify (Partner gateway + WP App foundation).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wpWeb = path.resolve(root, "..", "Wealth Partner App", "web");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function readWp(rel) {
  return fs.readFileSync(path.join(wpWeb, rel), "utf8");
}

assert.match(read("src/app/api/partner/health/route.ts"), /partnerAuthService\.health/);
assert.match(read("src/app/api/partner/auth/login/route.ts"), /partnerAuthService\.login/);
assert.match(read("src/app/api/partner/auth/me/route.ts"), /requirePartnerAccessToken/);
assert.match(read("server/services/partner-gateway/partner-token.service.ts"), /PARTNER_TOKEN_AUDIENCE/);
assert.match(read("src/types/enterprise-partner-gateway.ts"), /wealth_partner_app/);
assert.match(read("server/services/partner-gateway/partner-binding.service.ts"), /resolvePartnerBindingForUser/);
assert.match(read("src/lib/api/partner-route-utils.ts"), /requirePartnerAccessToken/);
assert.doesNotMatch(read("src/lib/api/partner-route-utils.ts"), /wealth-partner-registry/);

assert.ok(fs.existsSync(path.join(wpWeb, "src/lib/enterprise-api.ts")));
assert.ok(fs.existsSync(path.join(wpWeb, "src/lib/partner-session.ts")));
assert.ok(!fs.existsSync(path.join(wpWeb, "src/lib/prototype-store.ts")));
assert.ok(!fs.existsSync(path.join(wpWeb, "src/lib/demo-data.ts")));
assert.ok(!fs.existsSync(path.join(wpWeb, "src/screens/OpportunityCreateScreen.tsx")));

const login = readWp("src/screens/LoginScreen.tsx");
assert.match(login, /loginPartner/);
assert.doesNotMatch(login, /partner@demo\.com/);
assert.doesNotMatch(login, /setAuthed/);

const api = readWp("src/lib/enterprise-api.ts");
assert.match(api, /\/api\/partner\//);
assert.doesNotMatch(api, /\/api\/admin\//);
assert.doesNotMatch(api, /wealth-partner-registry/);

const unavailable = readWp("src/screens/EnterpriseUnavailable.tsx");
assert.match(unavailable, /Enterprise Services are currently unavailable/);
assert.match(unavailable, /Retry Connection/);

console.log("CO-WP-102 verify: PASS");
