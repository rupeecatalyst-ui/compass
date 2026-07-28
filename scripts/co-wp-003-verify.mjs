/**
 * CO-WP-003 — structural verify for Network Intelligence.
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

mustExist(
  "server/services/wealth-partner-registry/network-intelligence.service.ts",
);
mustExist(
  "src/app/api/wealth-partner-registry/partners/[partnerId]/network-intelligence/route.ts",
);
mustExist(
  "src/components/catalyst-one/wealth-partner-registry/wealth-partner-network-intelligence.tsx",
);

const types = mustExist("src/types/enterprise-wealth-partner-registry.ts");
mustInclude(types, "WealthPartnerNetworkIntelligenceBundle", "types");
mustInclude(types, "WealthPartnerNetworkTreeNode", "types");

const constants = mustExist(
  "src/constants/enterprise-wealth-partner-registry/index.ts",
);
mustInclude(constants, "WEALTH_PARTNER_NETWORK_INTELLIGENCE_DEFINITION", "constants");
mustInclude(constants, "buildContactWorkspaceHref", "constants");

const client = mustExist("src/lib/enterprise-wealth-partner-registry/index.ts");
mustInclude(client, "getNetworkIntelligence", "client");

const workspace = mustExist(
  "src/components/catalyst-one/wealth-partner-registry/wealth-partner-workspace.tsx",
);
mustInclude(workspace, "WealthPartnerNetworkIntelligence", "workspace");

const service = mustExist(
  "server/services/wealth-partner-registry/network-intelligence.service.ts",
);
mustInclude(service, "buildWealthPartnerNetworkIntelligence", "service");
mustInclude(service, "rollUp", "service");
mustInclude(service, "Never writes", "service");

console.log("CO-WP-003 verify OK — Network Intelligence wired (read-only projection).");
