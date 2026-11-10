/**
 * Marketing execution cron stays inactive until the existing pacing activation flag is on.
 * Fully mocked. No SMTP, customer delivery, or production mode change.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const executionRoute = readFileSync(
  join(root, "src/app/api/cron/marketing-execution/route.ts"),
  "utf8",
);
const executionHandler = readFileSync(
  join(root, "server/services/enterprise-marketing-engine/marketing-execution-cron.ts"),
  "utf8",
);
const pacingRoute = readFileSync(join(root, "src/app/api/cron/marketing-pacing/route.ts"), "utf8");
const activation = readFileSync(
  join(root, "src/lib/enterprise-marketing-engine/execution/cron-activation.ts"),
  "utf8",
);

assert.match(executionRoute, /isMarketingPacingCronActivated/);
assert.match(executionRoute, /runDueCampaigns/);
assert.match(executionHandler, /if \(!deps\.isActivated\(\)\)/);
assert.ok(executionHandler.indexOf("if (!deps.isActivated())") < executionHandler.indexOf("deps.runDue()"));
assert.match(pacingRoute, /isMarketingPacingCronActivated/);
assert.doesNotMatch(pacingRoute, /runDueCampaigns/);
assert.match(activation, /MARKETING_PACING_CRON_REGISTERED = false/);

const route = await import(
  pathToFileURL(resolve(root, "src/app/api/cron/marketing-execution/route.ts")).href
);
const handler = await import(
  pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/marketing-execution-cron.ts")).href
);
const cron = await import(
  pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/execution/cron-activation.ts")).href
);

assert.equal(cron.isMarketingPacingCronActivated(), false);

const real = await route.POST(new Request("http://localhost/api/cron/marketing-execution", { method: "POST" }));
const realBody = await real.json();
assert.equal(real.status, 403);
assert.equal(realBody.error.code, "CRON_NOT_ACTIVATED");

function harness(overrides = {}) {
  const calls = { runDue: 0, productionLive: 0 };
  const deps = {
    isActivated: () => false,
    productionLive: async () => {
      calls.productionLive += 1;
      return true;
    },
    runDue: async () => {
      calls.runDue += 1;
      return { processed: 0, results: [] };
    },
    readSecret: () => "expected-secret",
    nodeEnv: () => "production",
    executionEnabled: () => false,
    ...overrides,
  };
  return { calls, deps };
}

const inactive = harness();
const inactiveResponse = await handler.handleMarketingExecutionCron(
  new Request("http://localhost/api/cron/marketing-execution", {
    method: "POST",
    headers: { authorization: "Bearer expected-secret" },
  }),
  inactive.deps,
);
const inactiveBody = await inactiveResponse.json();
assert.equal(inactiveResponse.status, 403);
assert.equal(inactiveBody.error.code, "CRON_NOT_ACTIVATED");
assert.equal(inactive.calls.runDue, 0);
assert.equal(inactive.calls.productionLive, 0);

const badSecret = harness({ isActivated: () => true });
const badResponse = await handler.handleMarketingExecutionCron(
  new Request("http://localhost/api/cron/marketing-execution", {
    method: "POST",
    headers: { authorization: "Bearer wrong-secret" },
  }),
  badSecret.deps,
);
const badBody = await badResponse.json();
assert.equal(badResponse.status, 401);
assert.equal(badBody.error.code, "UNAUTHORIZED");
assert.equal(badSecret.calls.runDue, 0);

const missingSecret = harness({
  isActivated: () => true,
  readSecret: () => "",
  nodeEnv: () => "production",
});
const missingResponse = await handler.handleMarketingExecutionCron(
  new Request("http://localhost/api/cron/marketing-execution", { method: "POST" }),
  missingSecret.deps,
);
const missingBody = await missingResponse.json();
assert.equal(missingResponse.status, 503);
assert.equal(missingBody.error.code, "CRON_NOT_CONFIGURED");
assert.equal(missingSecret.calls.runDue, 0);

const authorised = harness({
  isActivated: () => true,
  productionLive: async () => true,
  executionEnabled: () => false,
});
const authorisedResponse = await handler.handleMarketingExecutionCron(
  new Request("http://localhost/api/cron/marketing-execution", {
    method: "POST",
    headers: { authorization: "Bearer expected-secret" },
  }),
  authorised.deps,
);
const authorisedBody = await authorisedResponse.json();
assert.equal(authorisedResponse.status, 200);
assert.equal(authorisedBody.success, true);
assert.equal(authorisedBody.data.liveSend, true);
assert.equal(authorisedBody.data.dryRun, false);
assert.equal(authorisedBody.data.processed, 0);
assert.equal(authorised.calls.runDue, 1);

console.log(
  JSON.stringify({
    ok: true,
    inactive: "CRON_NOT_ACTIVATED",
    invalidSecret: "UNAUTHORIZED",
    missingSecret: "CRON_NOT_CONFIGURED",
    authorisedMockedRunDue: 1,
    customerDelivery: false,
  }),
);
