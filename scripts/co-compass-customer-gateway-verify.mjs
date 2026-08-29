#!/usr/bin/env node
/**
 * CO-COMPASS-CUSTOMER-GATEWAY-001 — boundary verifier (engineering gate).
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relPath) {
  const full = join(root, relPath);
  assert.ok(existsSync(full), `Missing file: ${relPath}`);
  return readFileSync(full, "utf8");
}

const compassClient = read("compass/src/services/catalyst-one/client.ts");
const compassIntelligenceRoute = read("compass/src/app/api/discovery/intelligence/route.ts");
const compassBorrowNav = read("compass/src/config/borrow-navigation.ts");
const compassSite = read("compass/src/config/site.ts");
const compassLayout = read("compass/src/app/layout.tsx");
const advantageService = read("server/services/compass-customer-gateway/compass-advantage.service.ts");
const journeyService = read("server/services/compass-customer-gateway/compass-journey.service.ts");
const recommendationsService = read(
  "server/services/compass-customer-gateway/compass-recommendations.service.ts",
);
const gatewayRoutes = [
  "src/app/api/compass/journey/config/route.ts",
  "src/app/api/compass/journey/start/route.ts",
  "src/app/api/compass/journey/answers/route.ts",
  "src/app/api/compass/journey/analyze/route.ts",
  "src/app/api/compass/journey/lod/route.ts",
  "src/app/api/compass/journey/documents/route.ts",
  "src/app/api/compass/journey/submit/route.ts",
];
for (const route of gatewayRoutes) {
  assert.ok(existsSync(join(root, route)), `Missing gateway route: ${route}`);
}

const compassJourneyRoutes = [
  "compass/src/app/api/journey/config/route.ts",
  "compass/src/app/api/journey/start/route.ts",
  "compass/src/app/api/journey/answers/route.ts",
  "compass/src/app/api/journey/analyze/route.ts",
  "compass/src/app/api/journey/lod/route.ts",
  "compass/src/app/api/journey/documents/route.ts",
  "compass/src/app/api/journey/submit/route.ts",
];
for (const route of compassJourneyRoutes) {
  assert.ok(existsSync(join(root, route)), `Missing COMPASS BFF route: ${route}`);
}

assert.doesNotMatch(compassClient, /buildLenders|computeAdvantageAmount/);
assert.match(compassClient, /\/api\/journey\/analyze/);
assert.match(compassClient, /uploadCompassDocuments/);
assert.match(compassClient, /submitCompassApplication/);
assert.match(compassClient, /fetchCompassLod/);
assert.match(read("compass/src/config/compass-lending-products.ts"), /home-loan-balance-transfer/);
assert.match(read("compass/src/config/home-loan-discovery.ts"), /"documents"/);
assert.match(read("compass/src/config/home-loan-discovery.ts"), /"review"/);
assert.match(read("compass/src/config/home-loan-discovery.ts"), /"confirmation"/);
assert.ok(existsSync(join(root, "compass/src/components/home-loan-experience/discovery/discovery-documents-step.tsx")));
assert.ok(existsSync(join(root, "compass/src/components/home-loan-experience/discovery/discovery-review-step.tsx")));
assert.ok(existsSync(join(root, "compass/src/components/home-loan-experience/discovery/discovery-confirmation-step.tsx")));
assert.match(read("compass/src/components/home-loan-experience/discovery/discovery-lenders-step.tsx"), /goNext/);
assert.doesNotMatch(read("compass/src/components/home-loan-experience/discovery/discovery-lenders-step.tsx"), /activateSarathi/);
assert.match(read("src/constants/compass-customer-gateway/product-registry.ts"), /HOME_LOAN_BT/);
assert.match(read("src/constants/compass-customer-gateway/product-registry.ts"), /HOME_LOAN/);
assert.match(compassIntelligenceRoute, /410|retired|gateway/i);
assert.match(compassBorrowNav, /future:\s*true/);
assert.match(compassBorrowNav, /ROUTES\.PERSONAL_LOAN/);
assert.match(read("src/constants/compass-customer-gateway/product-registry.ts"), /PERSONAL_LOAN/);
assert.match(read("src/constants/compass-customer-gateway/product-registry.ts"), /WORKING_CAPITAL_SECURED/);
assert.match(compassSite, /98219 84181/);
assert.match(compassSite, /champion@rupeecatalyst.com/);
assert.doesNotMatch(compassLayout, /localhost:3001/);
assert.match(advantageService, /not_available/);
assert.match(advantageService, /status:\s*"not_available"/);
assert.doesNotMatch(advantageService, /0\.0045|0\.0055|150000|ltvFactor|incomeFactor|baseRate/);
assert.match(journeyService, /website_compass/);
assert.match(journeyService, /projectCompassRecommendations/);
assert.match(journeyService, /projectCompassLod/);
assert.match(journeyService, /customer_portal|CUSTOMER_PORTAL_UPLOAD_SOURCE/);
assert.match(recommendationsService, /deriveChanakyaOpportunityRecommendationsFromOptions/);
assert.match(read("server/services/compass-customer-gateway/compass-journey-config.service.ts"), /resolveVisibleIdcSections/);
assert.match(read("server/services/compass-customer-gateway/compass-operational-handoff.service.ts"), /generateTasksForBusinessEvent/);
assert.match(read("compass/src/config/legal.ts"), /Privacy Policy/);
assert.match(read("compass/src/config/legal.ts"), /journeyConsent/);
assert.match(read("compass/src/config/legal.ts"), /Terms and Conditions/);
assert.match(read("compass/src/config/legal.ts"), /Disclaimer/);
assert.ok(existsSync(join(root, "compass/src/app/privacy/page.tsx")));
assert.ok(existsSync(join(root, "compass/src/app/terms/page.tsx")));
assert.ok(existsSync(join(root, "compass/src/app/disclaimer/page.tsx")));
assert.match(read("compass/src/components/homepage/shared/animated-counter.tsx"), /displayValue|initial/);

console.log("CO-COMPASS-CUSTOMER-GATEWAY-001 verify: PASS");
