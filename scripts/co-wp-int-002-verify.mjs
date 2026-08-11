/**
 * CO-WP-INT-002 — Customer, Document & Activity integration (development verify).
 * Does NOT deploy.
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
  if (!text.includes(needle)) failures.push(`${rel} missing ${label}`);
}

function mustNotContain(rel, needle, label = needle) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  if (text.includes(needle)) failures.push(`${rel} must not contain ${label}`);
}

mustExist("docs/co-wp-int-002/CO-WP-INT-002-INTEGRATION-REPORT.md");
mustExist("server/services/partner-gateway/partner-ssot-projections.ts");
mustExist("server/services/partner-gateway/partner-ownership.service.ts");

// Customer ownership
mustContain(
  "server/services/partner-gateway/partner-ownership.service.ts",
  "requireOwnedCustomer",
  "requireOwnedCustomer",
);
mustContain(
  "server/services/partner-gateway/partner-ownership.service.ts",
  "listOwnedCustomerIds",
  "listOwnedCustomerIds",
);
mustContain(
  "server/services/partner-gateway/partner-ownership.service.ts",
  "primaryContactId",
  "primaryContactId on ownership",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "requireOwnedCustomer",
  "customer workspace ownership gate",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "listOwnedCustomerIds",
  "directory from owned customers",
);
mustNotContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "cust-reg-",
  "fabricated customer ids",
);

// Documents → EnterpriseTransactionDocument
mustContain(
  "server/services/partner-gateway/partner-ssot-projections.ts",
  "upsertPartnerOpportunityDocument",
  "document upsert helper",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "upsertPartnerOpportunityDocument",
  "upload uses Document Registry",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "softDeletePartnerOpportunityDocument",
  "delete uses Document Registry",
);
mustContain(
  "server/services/enterprise-transaction-documents/enterprise-transaction-document.service.ts",
  "upsertForOrganization",
  "org-scoped document write",
);
mustContain(
  "server/services/enterprise-transaction-documents/enterprise-transaction-document.service.ts",
  "softDeleteForOrganization",
  "soft delete",
);

// Activity SSOT
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "listPartnerVisibleOpportunityNotes",
  "activity hydrate from Business Notes",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "contactId: owned.primaryContactId",
  "activity contact association",
);
mustContain(
  "server/services/partner-gateway/partner-ssot-projections.ts",
  "isPartnerVisibleNote",
  "partner-safe note filter",
);
mustContain(
  "server/services/partner-gateway/partner-deal.service.ts",
  "contactId: opportunity.primaryContactId",
  "deal activity contact association",
);

// WP App
const wpRoot = path.resolve(root, "..", "Wealth Partner App", "web");
if (!fs.existsSync(wpRoot)) {
  failures.push(`Missing WP App: ${wpRoot}`);
} else {
  const app = fs.readFileSync(path.join(wpRoot, "src/App.tsx"), "utf8");
  if (!app.includes("CustomerNotesPanel")) {
    failures.push("WP App missing CustomerNotesPanel route");
  }
  if (!app.includes("CustomerDocumentsPanel")) {
    failures.push("WP App missing CustomerDocumentsPanel route");
  }
  const docs = fs.readFileSync(
    path.join(wpRoot, "src/screens/documents/PartnerDocumentsScreen.tsx"),
    "utf8",
  );
  if (!docs.includes("Enterprise Document Registry") && !docs.includes("Document architecture")) {
    failures.push("WP Documents desk missing INT-002 copy");
  }
}

if (failures.length) {
  console.error("CO-WP-INT-002 VERIFY FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-WP-INT-002 VERIFY PASS");
console.log(
  JSON.stringify(
    {
      customers: "owned primaryContactId projection + 403 on cross-partner",
      documents: "EnterpriseTransactionDocument via Partner Gateway",
      activity: "Business Notes SSOT + partner-visible filter + contactId",
      deploy: "not performed",
    },
    null,
    2,
  ),
);
