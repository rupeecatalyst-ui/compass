/**
 * CO-LENDER-SSOT-REMEDIATE-001 — static verify (no DB writes).
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`Missing: ${rel}`);
}

function mustContain(rel, needle) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    failures.push(`Missing: ${rel}`);
    return;
  }
  const text = fs.readFileSync(full, "utf8");
  if (!text.includes(needle)) failures.push(`${rel} missing: ${needle}`);
}

function mustNotContain(rel, needle) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return;
  const text = fs.readFileSync(full, "utf8");
  if (text.includes(needle)) failures.push(`${rel} must not contain: ${needle}`);
}

mustExist("docs/co-lender-ssot-verify/CO-LENDER-SSOT-REMEDIATE-001-VERIFICATION-REPORT.md");
mustExist("src/lib/enterprise-lender-registry/selection-client.ts");
mustExist("src/constants/enterprise-lender-registry/selection.ts");

mustContain(
  "src/components/catalyst-one/shared/enterprise-lender-registry-select.tsx",
  "searchEnterpriseLendersForSelection",
);
mustContain(
  "src/components/catalyst-one/shared/enterprise-lender-registry-select.tsx",
  "Retry",
);
mustNotContain(
  "src/components/catalyst-one/shared/enterprise-lender-registry-select.tsx",
  "ENTERPRISE_SEARCH_MAX_RESULTS",
);
mustNotContain(
  "src/components/catalyst-one/shared/enterprise-lender-registry-select.tsx",
  "pageSize: 200",
);

mustContain(
  "src/lib/enterprise-lender-registry/published-directory.ts",
  "listApiPublished",
);
mustNotContain(
  "src/lib/enterprise-lender-registry/published-directory.ts",
  "listLocalPublished",
);
mustNotContain(
  "src/lib/enterprise-lender-registry/published-directory.ts",
  "mergeOptions",
);

mustContain(
  "src/components/catalyst-one/shared/business-completion/business-completion-dialog.tsx",
  "EnterpriseLenderRegistrySelect",
);
mustNotContain(
  "src/components/catalyst-one/shared/business-completion/business-completion-dialog.tsx",
  "OrganizationRegistrySelect",
);

mustContain("src/constants/enterprise-contact-master/masters.ts", "lender: []");
mustContain(
  "server/repositories/lender-registry/lender-registry.repository.ts",
  "Math.min(5000",
);
mustContain(
  "src/app/api/partner/masters/lenders/route.ts",
  "searchPartnerEnterpriseLenders(q, 5000)",
);

mustContain(
  "docs/co-lender-ssot-verify/CO-LENDER-SSOT-REMEDIATE-001-VERIFICATION-REPORT.md",
  "ELR API only",
);

if (failures.length) {
  console.error("CO-LENDER-SSOT-REMEDIATE-001 verify FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("CO-LENDER-SSOT-REMEDIATE-001 verify OK (static; no live data touched).");
