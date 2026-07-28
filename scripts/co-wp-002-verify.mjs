/**
 * CO-WP-002 — structural verify for error mapping + create path.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function mustExist(rel) {
  const p = resolve(root, rel);
  if (!existsSync(p)) throw new Error(`Missing: ${rel}`);
  return readFileSync(p, "utf8");
}

function mustInclude(content, needle, label) {
  if (!content.includes(needle)) throw new Error(`${label}: missing "${needle}"`);
}

const routeUtils = mustExist(
  "src/app/api/wealth-partner-registry/_lib/route-utils.ts",
);
mustInclude(routeUtils, "WEALTH_PARTNER_SCHEMA_REQUIRED", "route-utils");
mustInclude(routeUtils, "Contact already converted", "route-utils");
mustInclude(routeUtils, "logWealthPartnerError", "route-utils");
mustInclude(routeUtils, "Unable to save Wealth Partner", "route-utils");

const client = mustExist("src/lib/enterprise-wealth-partner-registry/index.ts");
mustInclude(client, "wealth-partner-registry:client", "client");
mustInclude(client, "status: res.status", "client");

const service = mustExist(
  "server/services/wealth-partner-registry/wealth-partner-registry.service.ts",
);
mustInclude(service, "Wealth Partner Type is required", "service");
mustInclude(service, "Contact already converted into a Wealth Partner", "service");

const partnersRoute = mustExist(
  "src/app/api/wealth-partner-registry/partners/route.ts",
);
mustInclude(partnersRoute, "create request", "partners route");

const repo = mustExist(
  "server/repositories/wealth-partner-registry/wealth-partner-registry.repository.ts",
);
mustInclude(repo, "$transaction", "repository");

console.log("CO-WP-002 verify OK — create failure diagnostics + schema path.");
