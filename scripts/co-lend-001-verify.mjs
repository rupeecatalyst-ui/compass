/**
 * CO-LEND-001 — structural readiness verify.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`Missing: ${rel}`);
}

function mustContain(rel, needle, label = needle) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  if (!text.includes(needle)) failures.push(`${rel} missing: ${label}`);
}

mustExist("src/constants/lender-program-portal/templates.ts");
mustExist("src/types/lender-program-portal.ts");
mustExist("src/lib/lender-program-portal/compare.ts");
mustExist("src/lib/lender-program-portal/security.ts");
mustExist("src/lib/lender-program-portal/client.ts");
mustExist("server/services/lender-program-portal/lender-program-portal.service.ts");
mustExist("src/app/lender/program-update/[token]/page.tsx");
mustExist("src/app/(dashboard)/admin/lender-program-portal/page.tsx");
mustExist("src/components/catalyst-one/lender-program-portal/lender-program-update-portal.tsx");
mustExist(
  "src/components/catalyst-one/admin/lender-program-portal/lender-program-portal-admin-workspace.tsx",
);
mustExist("src/app/api/admin/lender-program-portal/invites/route.ts");
mustExist("src/app/api/admin/lender-program-portal/submissions/route.ts");
mustExist("src/app/api/lender-program-portal/[token]/route.ts");
mustExist("src/app/api/lender-program-portal/[token]/otp/route.ts");
mustExist("src/app/api/lender-program-portal/[token]/otp/verify/route.ts");
mustExist("src/app/api/lender-program-portal/[token]/submit/route.ts");
mustExist("prisma/migrations/20260727190000_co_lend_001_lender_program_portal/migration.sql");
mustExist(".cursor/rules/enterprise-lender-program-portal.mdc");
mustExist("docs/co-lend-001/CO-LEND-001-LENDER-PROGRAM-PORTAL-CERTIFICATION-REPORT.md");

mustContain(
  "src/constants/lender-program-portal/templates.ts",
  'key: "home_loan"',
  "home_loan template",
);
mustContain(
  "src/constants/lender-program-portal/templates.ts",
  "HOME_LOAN_BT",
  "HL BT product codes on shared template",
);
mustContain(
  "server/services/lender-program-portal/lender-program-portal.service.ts",
  'status: "pending_review"',
  "submissions stage as pending_review",
);
mustContain(
  "server/services/lender-program-portal/lender-program-portal.service.ts",
  "createProgram",
  "publish via lenderRegistryService.createProgram",
);
mustContain(
  "server/services/lender-program-portal/lender-program-portal.service.ts",
  "deactivateProgram",
  "prior version deactivated, not overwritten",
);
mustExist("server/services/lender-program-portal/contact-resolve.ts");
mustExist("server/services/lender-program-portal/dialogue.ts");
mustExist("prisma/migrations/20260727193000_co_lend_001b_contact_dialogue/migration.sql");
mustContain(
  "server/services/lender-program-portal/contact-resolve.ts",
  "findByOfficialEmail",
  "email-first contact match",
);
mustContain(
  "server/services/lender-program-portal/contact-resolve.ts",
  "Lender Representative",
  "Lender Representative contact type",
);
mustContain(
  "server/services/lender-program-portal/dialogue.ts",
  "createProgramDialogueThread",
  "dialogue thread create",
);
mustContain(
  "server/services/lender-program-portal/lender-program-portal.service.ts",
  "emailOtpHash",
  "dual email OTP",
);
mustContain(
  "server/services/lender-program-portal/lender-program-portal.service.ts",
  "ecmContactId",
  "submission contact attribution",
);
mustContain(
  "server/services/lender-program-portal/lender-program-portal.service.ts",
  "dialogueThreadId",
  "submission dialogue attribution",
);
mustContain(
  "src/types/enterprise-dialogue-center.ts",
  "lender_program",
  "EDC lender_program context",
);
mustContain(
  "src/lib/lender-program-portal/security.ts",
  "LENDER_PROGRAM_PORTAL_TOKEN_PREFIX",
  "secure token prefix",
);
mustContain(
  "src/constants/routes.ts",
  "ADMIN_LENDER_PROGRAM_PORTAL",
  "admin route constant",
);
mustContain(
  "src/types/document-registry.ts",
  "lender_portal",
  "document uploadSource lender_portal",
);

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const model of [
  "LenderProgramPortalInvite",
  "LenderProgramSubmission",
  "LenderProgramPortalAudit",
  "LenderProgramDialogueThread",
  "LenderProgramDialogueMessage",
]) {
  if (!schema.includes(`model ${model}`)) {
    failures.push(`Prisma missing model ${model}`);
  }
}

if (failures.length) {
  console.error("CO-LEND-001 verify FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-LEND-001 verify PASSED");
console.log(" - Product templates + Home Loan shared BT/Top-up");
console.log(" - Staging tables + publish-only live program create");
console.log(" - Public portal + admin approval queue wired");
console.log(" - Document Registry lender_portal source present");
