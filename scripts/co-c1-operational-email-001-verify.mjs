#!/usr/bin/env node
/**
 * CO-C1-OPERATIONAL-EMAIL-001 — Operational Email Configuration activation gate.
 * Engineering gate only — does NOT grant Business Certification.
 * Confirms ECC reuse, canonical routes/nav, Marketing separation, production OFF.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel) {
  if (!existsSync(join(root, rel))) failures.push(`Missing: ${rel}`);
}

function mustContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (!text.includes(needle)) failures.push(`${label ?? rel}: expected "${needle}"`);
}

function mustNotContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (text.includes(needle)) failures.push(`${label ?? rel}: must not contain "${needle}"`);
}

mustExist("src/app/(dashboard)/organization/communication/page.tsx");
mustExist("src/app/(dashboard)/organization/communication/email/page.tsx");
mustExist(
  "src/components/catalyst-one/admin/enterprise-communication/enterprise-communication-center-admin.tsx",
);
mustExist(
  "src/components/catalyst-one/admin/enterprise-communication/operational-email-activation-panel.tsx",
);
mustExist("src/app/api/admin/enterprise-communication/test-send/route.ts");
mustExist("src/app/api/admin/enterprise-communication/smtp-probe/route.ts");
mustExist("src/lib/enterprise-communication-center/smtp-secret-resolver.ts");
mustExist("server/services/enterprise-communication-center/smtp-probe.service.ts");
mustExist("src/constants/enterprise-communication-center/operational-categories.ts");
mustExist("server/services/enterprise-communication-center/ecc.service.ts");

mustContain(
  "src/constants/routes.ts",
  'ORGANIZATION_COMMUNICATION_EMAIL: "/organization/communication/email"',
  "canonical email config route",
);
mustContain(
  "src/config/navigation.ts",
  "ORGANIZATION_COMMUNICATION_EMAIL",
  "settings/org nav wire",
);
mustContain(
  "src/config/navigation.ts",
  'title: "Email Configuration"',
  "Email Configuration nav title",
);
mustContain(
  "src/constants/administration-console.ts",
  'id: "org-email-configuration"',
  "Admin Console Organization Email Configuration",
);
mustContain(
  "src/constants/enterprise-notification-communication-engine/lifecycle.ts",
  "ENCE_EXTERNAL_DELIVERY_ENABLED = false",
  "production external delivery OFF",
);
mustContain(
  "src/app/api/admin/enterprise-communication/test-send/route.ts",
  'mode: "simulation"',
  "test send remains simulation",
);
mustContain(
  "src/components/catalyst-one/admin/enterprise-communication/operational-email-activation-panel.tsx",
  "Operational production email",
  "activation panel production gate",
);
mustContain(
  "src/app/(dashboard)/organization/layout.tsx",
  "allowedRoles={[ROLES.SUPER_ADMIN]}",
  "Organization Super Admin route guard",
);
mustContain(
  "src/app/api/admin/enterprise-communication/profiles/[profileCode]/route.ts",
  '["SUPER_ADMIN", "ADMIN"].includes(actor.role)',
  "profile mutation RBAC",
);
mustContain(
  "src/app/api/admin/enterprise-communication/test-send/route.ts",
  '["SUPER_ADMIN", "ADMIN"].includes(actor.role)',
  "test-send RBAC",
);
mustNotContain(
  "src/components/catalyst-one/admin/enterprise-communication/enterprise-communication-center-admin.tsx",
  "smtpPassword:",
  "provider secret must not be submitted by client UI",
);
mustContain(
  "src/components/catalyst-one/admin/enterprise-communication/enterprise-communication-center-admin.tsx",
  "ECC_CUSTOMERS_SMTP_PASSWORD",
  "honest provider-secret posture",
);
mustContain(
  "src/lib/enterprise-communication-center/smtp-secret-resolver.ts",
  "ECC_CUSTOMERS_SMTP_PASSWORD",
  "env-based SMTP secret resolver",
);
mustContain(
  "server/repositories/enterprise-communication-center/ecc.repository.ts",
  "SMTP secrets are host-env only",
  "no recoverable DB credential writes",
);
mustContain(
  "src/components/catalyst-one/admin/enterprise-communication/operational-email-activation-panel.tsx",
  "Run SMTP probe",
  "controlled SMTP probe UI",
);

// Marketing separation — activation files must not flip marketing live flags
mustNotContain(
  "src/app/api/admin/enterprise-communication/test-send/route.ts",
  "ENTERPRISE_MARKETING_EMAIL_MODE",
  "test-send must not touch marketing email mode",
);
mustNotContain(
  "src/components/catalyst-one/admin/enterprise-communication/operational-email-activation-panel.tsx",
  "enterprise-marketing-engine",
  "activation panel must not import marketing engine",
);
mustNotContain(
  "src/constants/enterprise-communication-center/operational-categories.ts",
  "Marketing",
  "operational categories stay non-marketing",
);
for (const rel of [
  "src/components/catalyst-one/admin/enterprise-communication/enterprise-communication-center-admin.tsx",
  "src/components/catalyst-one/admin/enterprise-communication/operational-email-activation-panel.tsx",
  "src/app/(dashboard)/organization/communication/email/page.tsx",
]) {
  mustNotContain(rel, "localStorage", "ECC configuration must not use browser localStorage");
  mustNotContain(rel, "sessionStorage", "ECC configuration must not use browser sessionStorage");
}

// Persistence SSOT remains Prisma ECC profiles
mustContain(
  "prisma/schema.prisma",
  "model EnterpriseCommunicationProfile",
  "ECC prisma SSOT",
);
mustContain(
  "server/repositories/enterprise-communication-center/ecc.repository.ts",
  "smtpCredentialConfigured",
  "secrets never returned as plaintext flag path",
);

if (failures.length) {
  console.error("CO-C1-OPERATIONAL-EMAIL-001 verify: FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-C1-OPERATIONAL-EMAIL-001 verify: PASS");
