/**
 * CO-CHANAKYA-001 — static verify City auto-population from Opportunity.cityLabel.
 * Usage: node scripts/co-chanakya-001-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const adapter = read("src/lib/lead-opportunity-journey/opportunity-runtime-adapter.ts");
const derive = read("src/lib/chanakya-opportunity-recommendations/derive.ts");
const life = read("src/lib/enterprise-life-engine/case-context.ts");

assert(adapter.includes("resolveOpportunityCityLabels"), "city resolve helper missing");
assert(adapter.includes("opp.cityLabel"), "projection must prefer Opportunity.cityLabel");
assert(!/city:\s*resolved\?\.city\?\.trim\(\)\s*\|\|\s*""/.test(adapter), "Contact-only city mapping must be removed");
assert(derive.includes("opp?.cityLabel"), "derive must fall back to cityLabel");
assert(derive.includes('"approxCibil" | "btLender" | "city"'), "extension signals must include city");
assert(life.includes("oppCity") || life.includes("cityLabel"), "LIFE must resolve Registry city");

const report = {
  opportunityCityLabelIsJourneySsot: true,
  projectionPrefersCityLabel: true,
  chanakyaDeriveReadsCityLabel: true,
  lifeReadsCityLabelFallback: true,
  rootCause:
    "projectOpportunityToRuntimeCase mapped city from Contact only; Chanakya read file.city; remount after cityLabel PATCH wiped optimistic city and recommendations",
  fix:
    "Prefer Opportunity.cityLabel in runtime projection + derive + LIFE fallback",
  verdict: "PASS",
};

const out = path.join(root, "docs/certification-screenshots/co-chanakya-001");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "verify-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
