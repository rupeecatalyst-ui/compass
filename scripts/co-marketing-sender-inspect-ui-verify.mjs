/**
 * Read-only Inspect Sender UI — authenticated GET ?fromAddress= only.
 * Does not call production. Does not list or seed senders.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
const ts = (rel) => pathToFileURL(resolve(root, rel)).href;

const panel = read("src/components/catalyst-one/admin/marketing/marketing-sender-inspect-panel.tsx");
const settings = read("src/components/catalyst-one/admin/marketing/marketing-settings-panel.tsx");
const page = read("src/app/(dashboard)/admin/marketing/sender-inspect/page.tsx");
const nav = read("src/constants/enterprise-marketing-engine/navigation.ts");
const routes = read("src/constants/routes.ts");
const constants = read("src/constants/enterprise-marketing-engine/sender-deliverability.ts");
const pkg = read("package.json");

assert.ok(pkg.includes("verify:co-marketing-sender-inspect-ui"));
assert.ok(constants.includes('MARKETING_SENDER_INSPECT_FROM_ADDRESS = "opportunities@rupeecatalyst.com"'));
assert.ok(constants.includes("marketingSenderInspectPath"));
assert.ok(routes.includes('ADMIN_MARKETING_SENDER_INSPECT: "/admin/marketing/sender-inspect"'));
assert.ok(nav.includes('id: "sender-inspect"'));
assert.ok(page.includes("MarketingSenderInspectPanel"));
assert.ok(!page.includes("MarketingSettingsPanel"));

assert.ok(panel.includes("authenticatedJsonFetch"));
assert.ok(panel.includes("marketingSenderInspectPath"));
assert.ok(panel.includes("SENDER_MANAGE"));
assert.ok(panel.includes("Inspect Sender"));
assert.doesNotMatch(panel, /authenticatedJsonFetch\("\/api\/admin\/marketing\/sender-identities"\)/);
assert.doesNotMatch(panel, /deliverability/);
assert.doesNotMatch(panel, /method:\s*"POST"/);
assert.doesNotMatch(panel, /seedIfOrganizationEmpty/);
assert.ok(!settings.includes("marketingSenderInspectPath"));
assert.ok(!settings.includes("sender-inspect"));

const constMod = await import(ts("src/constants/enterprise-marketing-engine/sender-deliverability.ts"));
assert.equal(constMod.MARKETING_SENDER_INSPECT_FROM_ADDRESS, "opportunities@rupeecatalyst.com");
assert.equal(
  constMod.marketingSenderInspectPath(),
  "/api/admin/marketing/sender-identities?fromAddress=opportunities%40rupeecatalyst.com",
);

console.log("PASS co-marketing-sender-inspect-ui-verify");
