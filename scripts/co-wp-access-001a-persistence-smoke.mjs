import { prisma } from "../server/lib/prisma.ts";
import { partnerEntitlementsService } from "../server/services/partner-entitlements/index.ts";

const templates = await partnerEntitlementsService.ensureSystemTemplates();
const counts = {
  templates: await prisma.partnerEntitlementTemplate.count(),
  profiles: await prisma.partnerEntitlementProfile.count(),
  overrides: await prisma.partnerTransactionEntitlement.count(),
  audits: await prisma.partnerEntitlementAudit.count(),
};
console.log(
  JSON.stringify(
    {
      seededTemplates: templates.map((t) => t.code),
      counts,
      persistenceOk: counts.templates >= 3 && counts.audits >= 1,
    },
    null,
    2,
  ),
);
await prisma.$disconnect();
