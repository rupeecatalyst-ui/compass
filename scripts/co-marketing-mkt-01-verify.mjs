/**
 * CO-MARKETING-MKT-01 — Static verification for Enterprise Marketing Engine foundation.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const required = [
  "src/types/enterprise-marketing-engine.ts",
  "src/constants/enterprise-marketing-engine/index.ts",
  "src/constants/enterprise-marketing-engine/safety.ts",
  "src/constants/enterprise-marketing-engine/permissions.ts",
  "src/constants/enterprise-marketing-engine/lifecycle.ts",
  "src/constants/enterprise-marketing-engine/navigation.ts",
  "src/lib/enterprise-marketing-engine/index.ts",
  "src/lib/enterprise-marketing-engine/safety.ts",
  "src/lib/enterprise-marketing-engine/disabled-ports.ts",
  "src/lib/enterprise-marketing-engine/ports/index.ts",
  "src/lib/enterprise-marketing-engine/ports/data-source.port.ts",
  "src/lib/enterprise-marketing-engine/ports/email-channel.port.ts",
  "src/lib/enterprise-marketing-engine/ports/whatsapp-channel.port.ts",
  "src/lib/enterprise-marketing-engine/ports/digital-channel.port.ts",
  "src/lib/enterprise-marketing-engine/ports/campaign-execution.port.ts",
  "src/lib/enterprise-marketing-engine/ports/asset-storage.port.ts",
  "src/lib/enterprise-marketing-engine/ports/notification.port.ts",
  "src/lib/enterprise-marketing-engine/ports/routing.port.ts",
  "src/lib/enterprise-marketing-engine/ports/qualification-handoff.port.ts",
  "server/services/enterprise-marketing-engine/index.ts",
  "server/services/enterprise-marketing-engine/foundation.service.ts",
  "server/services/enterprise-marketing-engine/audit.ts",
  "src/app/api/admin/marketing/route.ts",
  "src/app/(dashboard)/admin/marketing/page.tsx",
  "src/app/(dashboard)/admin/marketing/campaigns/page.tsx",
  "src/app/(dashboard)/admin/marketing/audiences/page.tsx",
  "src/app/(dashboard)/admin/marketing/data-sources/page.tsx",
  "src/app/(dashboard)/admin/marketing/content/page.tsx",
  "src/app/(dashboard)/admin/marketing/assets/page.tsx",
  "src/app/(dashboard)/admin/marketing/engagement/page.tsx",
  "src/app/(dashboard)/admin/marketing/responses/page.tsx",
  "src/app/(dashboard)/admin/marketing/deliverability/page.tsx",
  "src/app/(dashboard)/admin/marketing/analytics/page.tsx",
  "src/app/(dashboard)/admin/marketing/settings/page.tsx",
  "src/components/catalyst-one/admin/marketing/marketing-command-center.tsx",
  "src/components/catalyst-one/admin/marketing/marketing-placeholder-panel.tsx",
  "src/components/catalyst-one/admin/marketing/marketing-module-nav.tsx",
  "docs/co-marketing-arch-001/CO-MARKETING-ARCH-001-ADR.md",
];

let ok = true;

for (const rel of required) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) {
    console.error(`MISSING: ${rel}`);
    ok = false;
  } else {
    console.log(`OK: ${rel}`);
  }
}

const safetyPath = resolve(root, "src/constants/enterprise-marketing-engine/safety.ts");
const safetySrc = readFileSync(safetyPath, "utf8");
for (const flag of [
  "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false",
  "ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED = false",
  "ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false",
]) {
  if (!safetySrc.includes(flag)) {
    console.error(`SAFETY FLAG MISSING OR ENABLED: ${flag}`);
    ok = false;
  } else {
    console.log(`OK safety: ${flag}`);
  }
}

const schemaPath = resolve(root, "prisma/schema.prisma");
const schema = readFileSync(schemaPath, "utf8");
const forbiddenModels = [
  "model MarketingCampaign",
  "model MarketingProspect",
  "model MarketingAudienceRow",
  "model Lead ",
];
for (const needle of forbiddenModels) {
  if (schema.includes(needle)) {
    console.error(`FORBIDDEN SCHEMA CONTENT: ${needle}`);
    ok = false;
  } else {
    console.log(`OK no schema: ${needle.trim()}`);
  }
}

const routesPath = resolve(root, "src/constants/routes.ts");
const routesSrc = readFileSync(routesPath, "utf8");
if (!routesSrc.includes('ADMIN_MARKETING: "/admin/marketing"')) {
  console.error("MISSING ROUTES.ADMIN_MARKETING");
  ok = false;
} else {
  console.log("OK routes: ADMIN_MARKETING");
}

const navPath = resolve(root, "src/config/navigation.ts");
const navSrc = readFileSync(navPath, "utf8");
if (!navSrc.includes("Marketing Command Center")) {
  console.error("MISSING nav: Marketing Command Center");
  ok = false;
} else {
  console.log("OK nav: Marketing Command Center");
}

// Must not wire Partner Marketing into EME foundation
const partnerMarketing = resolve(root, "server/services/partner-gateway/partner-marketing.service.ts");
if (existsSync(partnerMarketing)) {
  const partnerSrc = readFileSync(partnerMarketing, "utf8");
  if (partnerSrc.includes("enterprise-marketing-engine")) {
    console.error("ISOLATION BREACH: partner-marketing imports EME");
    ok = false;
  } else {
    console.log("OK isolation: partner-marketing untouched by EME");
  }
}

if (!ok) {
  console.error("CO-MARKETING-MKT-01 verify: FAIL");
  process.exit(1);
}
console.log("CO-MARKETING-MKT-01 verify: PASS");
