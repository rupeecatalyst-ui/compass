/**
 * Public campaign entry. No journey start and no email.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { campaignLandingRedirect, recallCampaignToken, rememberCampaignToken } from "../src/lib/campaign-entry.ts";
import { discoveryCopy } from "../src/config/home-loan-discovery.ts";

const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
};

assert.equal(campaignLandingRedirect("/home-loan", ""), null);
assert.equal(campaignLandingRedirect("/personal-loan", "?utm_source=google"), null);
assert.equal(
  campaignLandingRedirect("/home-loan", "?campaign=tok"),
  "/apply/home-loan?campaign=tok",
);
assert.equal(
  campaignLandingRedirect("/home-loan", "?product=home-loan-balance-transfer&campaign=tok"),
  "/apply/home-loan-balance-transfer?campaign=tok",
);
assert.equal(
  campaignLandingRedirect("/personal-loan", "?campaign=tok"),
  "/apply/personal-loan?campaign=tok",
);
assert.equal(campaignLandingRedirect("/apply/home-loan", "?campaign=tok"), null);
assert.equal(campaignLandingRedirect("/about", "?campaign=tok"), null);

rememberCampaignToken(storage, "home-loan", "tok");
assert.equal(recallCampaignToken(storage, "home-loan"), "tok");
assert.equal(recallCampaignToken(storage, "personal-loan"), null);

assert.equal(discoveryCopy.welcome.title, "Let's begin");

const applyPage = readFileSync(
  new URL("../src/app/apply/[productCode]/page.tsx", import.meta.url),
  "utf8",
);
assert.match(applyPage, /launchDiscovery\(productCode\)/);
const bridge = readFileSync(
  new URL("../src/components/home-loan-experience/discovery/discovery-launch-bridge.tsx", import.meta.url),
  "utf8",
);
assert.match(bridge, /campaignLandingRedirect/);
const client = readFileSync(new URL("../src/services/catalyst-one/client.ts", import.meta.url), "utf8");
assert.match(client, /rememberCampaignToken/);
assert.match(client, /recallCampaignToken/);

console.log("co-compass-campaign-entry-verify: pass");
