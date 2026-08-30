#!/usr/bin/env node
/**
 * Preview auth fix — gateway key vs journey Bearer, Vercel bypass header (engineering gate).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  readBearerJourneyToken,
  resolveCompassGatewayApiKey,
} from "../src/lib/compass-customer-gateway/gateway-headers.ts";
import {
  buildCatalystOneGatewayHeaders,
  resolveCatalystOneProtectionBypass,
} from "../compass/src/lib/catalyst-one-gateway/headers.ts";

const root = process.cwd();
const GATEWAY = "test-compass-gateway-key";
const JOURNEY = "test-journey-session-token";
const BYPASS = "test-vercel-protection-bypass";

function authorize(request, expected) {
  const provided = resolveCompassGatewayApiKey(request);
  if (!provided || provided !== expected) {
    return { ok: false, status: 401, code: "UNAUTHORIZED" };
  }
  return { ok: true, status: 200, provided };
}

const validKey = authorize(
  new Request("https://c1.example/api/compass/journey/config", {
    headers: { "x-compass-gateway-key": GATEWAY },
  }),
  GATEWAY,
);
assert.equal(validKey.status, 200);
assert.equal(validKey.provided, GATEWAY);

const missingKey = authorize(new Request("https://c1.example/api/compass/journey/config"), GATEWAY);
assert.equal(missingKey.status, 401);

const bearerOnly = authorize(
  new Request("https://c1.example/api/compass/journey/answers", {
    headers: { authorization: `Bearer ${JOURNEY}` },
  }),
  GATEWAY,
);
assert.equal(bearerOnly.status, 401);
assert.equal(
  resolveCompassGatewayApiKey(
    new Request("https://c1.example/", { headers: { authorization: `Bearer ${JOURNEY}` } }),
  ),
  null,
);

const coexistReq = new Request("https://c1.example/api/compass/journey/answers", {
  headers: {
    "x-compass-gateway-key": GATEWAY,
    authorization: `Bearer ${JOURNEY}`,
  },
});
const coexist = authorize(coexistReq, GATEWAY);
assert.equal(coexist.status, 200);
assert.equal(resolveCompassGatewayApiKey(coexistReq), GATEWAY);
assert.equal(readBearerJourneyToken(coexistReq), JOURNEY);

assert.equal(
  readBearerJourneyToken(
    new Request("https://c1.example/", { headers: { authorization: `Bearer ${JOURNEY}` } }),
  ),
  JOURNEY,
);
assert.equal(
  readBearerJourneyToken(
    new Request("https://c1.example/", { headers: { "x-compass-journey-token": JOURNEY } }),
  ),
  JOURNEY,
);
assert.equal(readBearerJourneyToken(new Request("https://c1.example/")), null);

const noBypass = buildCatalystOneGatewayHeaders({ gatewayKey: GATEWAY });
assert.equal(noBypass.get("x-compass-gateway-key"), GATEWAY);
assert.equal(noBypass.get("x-vercel-protection-bypass"), null);
assert.equal(noBypass.get("authorization"), null);

const withBypass = buildCatalystOneGatewayHeaders({
  gatewayKey: GATEWAY,
  protectionBypass: BYPASS,
  journeyToken: JOURNEY,
});
assert.equal(withBypass.get("x-compass-gateway-key"), GATEWAY);
assert.equal(withBypass.get("x-vercel-protection-bypass"), BYPASS);
assert.equal(withBypass.get("authorization"), `Bearer ${JOURNEY}`);

assert.equal(resolveCatalystOneProtectionBypass({}), null);
assert.equal(resolveCatalystOneProtectionBypass({ CATALYST_ONE_VERCEL_PROTECTION_BYPASS: "" }), null);
assert.equal(
  resolveCatalystOneProtectionBypass({ CATALYST_ONE_VERCEL_PROTECTION_BYPASS: ` ${BYPASS} ` }),
  BYPASS,
);

const gatewayHeadersSrc = readFileSync(join(root, "src/lib/compass-customer-gateway/gateway-headers.ts"), "utf8");
assert.match(gatewayHeadersSrc, /x-compass-gateway-key/);
assert.doesNotMatch(
  gatewayHeadersSrc.slice(
    gatewayHeadersSrc.indexOf("export function resolveCompassGatewayApiKey"),
    gatewayHeadersSrc.indexOf("export function readBearerJourneyToken"),
  ),
  /authorization/i,
);

const routeUtils = readFileSync(join(root, "src/lib/compass-customer-gateway/route-utils.ts"), "utf8");
assert.match(routeUtils, /resolveCompassGatewayApiKey/);
assert.match(routeUtils, /readBearerJourneyToken/);

const bffServer = readFileSync(join(root, "compass/src/lib/catalyst-one-gateway/server.ts"), "utf8");
assert.match(bffServer, /buildCatalystOneGatewayHeaders/);
assert.match(bffServer, /resolveCatalystOneProtectionBypass/);
assert.doesNotMatch(bffServer, /NEXT_PUBLIC_.*PROTECTION_BYPASS/);
assert.doesNotMatch(bffServer, /console\.(log|info|debug|error|warn)\([^)]*BYPASS/);

const bffHeaders = readFileSync(join(root, "compass/src/lib/catalyst-one-gateway/headers.ts"), "utf8");
assert.match(bffHeaders, /CATALYST_ONE_VERCEL_PROTECTION_BYPASS/);
assert.match(bffHeaders, /x-vercel-protection-bypass/);
assert.doesNotMatch(bffHeaders, /NEXT_PUBLIC_/);
assert.doesNotMatch(bffHeaders, /console\.(log|info|debug|error|warn)/);

console.log("CO-COMPASS-PREVIEW-AUTH-FIX verify: PASS");
