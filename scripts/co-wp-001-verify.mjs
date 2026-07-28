/**
 * CO-WP-001 — structural verify (no DB writes / no production data mutation).
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

const schema = mustExist("prisma/schema.prisma");
mustInclude(schema, "model EnterpriseWealthPartner", "schema");
mustInclude(schema, "model EnterpriseWealthPartnerNetworkMember", "schema");
mustInclude(schema, "model EnterpriseWealthPartnerCommission", "schema");
mustInclude(schema, "enterprise_wealth_partners", "schema");

mustExist("prisma/migrations/20260728120000_co_wp_001_wealth_partner_registry/migration.sql");
mustExist("src/types/enterprise-wealth-partner-registry.ts");
mustExist("src/constants/enterprise-wealth-partner-registry/index.ts");
mustExist("server/services/wealth-partner-registry/wealth-partner-registry.service.ts");
mustExist("server/repositories/wealth-partner-registry/wealth-partner-registry.repository.ts");
mustExist("src/app/api/wealth-partner-registry/partners/route.ts");
mustExist("src/app/(dashboard)/wealth-partners/page.tsx");
mustExist("src/app/(dashboard)/wealth-partners/[partnerId]/workspace/page.tsx");
mustExist("src/components/catalyst-one/wealth-partner-registry/wealth-partner-workspace.tsx");

const routes = mustExist("src/constants/routes.ts");
mustInclude(routes, "WEALTH_PARTNERS", "routes");
mustInclude(routes, "ADMIN_WEALTH_PARTNER_REGISTRY", "routes");

const nav = mustExist("src/config/navigation.ts");
mustInclude(nav, "Wealth Partners", "navigation");
mustInclude(nav, "Wealth Partner Registry", "navigation");

const service = mustExist("server/services/wealth-partner-registry/wealth-partner-registry.service.ts");
mustInclude(service, "getBusinessSourcing", "service");
mustInclude(service, "sourceContactId", "service");
mustInclude(service, "WEALTH_PARTNER_DOCUMENTS_NOTE", "service");

const constants = mustExist("src/constants/enterprise-wealth-partner-registry/index.ts");
mustInclude(constants, "WEALTH_PARTNER_WORKSPACE_TABS", "constants");
mustInclude(constants, "chartered_accountant", "constants");

console.log("CO-WP-001 verify OK — Wealth Partner Registry + Workspace wired (additive).");
