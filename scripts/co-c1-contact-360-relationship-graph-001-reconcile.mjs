/**
 * CO-C1-CONTACT-360-RELATIONSHIP-GRAPH-001 — idempotent reconciliation (DRY-RUN).
 *
 * Default: print a reviewed repair plan. Does not mutate data.
 * Apply is blocked unless CONTACT_360_RECONCILE_APPLY=1 and the target is
 * explicitly a non-production database. Overnight must not apply.
 *
 * Never creates Contact, Company, Opportunity or Deal rows.
 * Never matches by mobile or email.
 */

const APPLY = process.env.CONTACT_360_RECONCILE_APPLY === "1";
const ALLOW_PROD = process.env.CONTACT_360_RECONCILE_ALLOW_PRODUCTION === "1";
const dbUrl = process.env.DATABASE_URL || "";

function isLikelyProductionUrl(url) {
  const u = url.toLowerCase();
  return (
    u.includes("hostinger") ||
    u.includes("railway") ||
    u.includes("neon.tech") ||
    u.includes("amazonaws.com") ||
    u.includes("sslmode=require")
  );
}

const plan = {
  sprint: "CO-C1-CONTACT-360-RELATIONSHIP-GRAPH-001",
  mode: "dry-run",
  applied: false,
  operations: [
    {
      id: "link-existing-ids",
      action: "upsert Contact–Company role",
      when: "Opportunity.companyId and a participant/director Contact ID already exist, and no EcmCompanyContactLink row exists for (contactId, companyId, role)",
      keys: ["contactId", "companyId", "relationRole"],
      createEntities: false,
      idempotent: "reuse existing active link; do not duplicate role rows",
    },
    {
      id: "stamp-opportunity-company-id",
      action: "set Opportunity.companyId",
      when: "Opportunity already has company borrower identity in lendingExtension.participants[].entityId of entityType company, and company registry row exists",
      keys: ["opportunityId", "companyId"],
      createEntities: false,
      idempotent: "write only when companyId is null",
    },
    {
      id: "never",
      action: "do not create Contact / Company / Opportunity / Deal",
      when: "always",
      keys: [],
      createEntities: false,
      idempotent: "n/a",
    },
  ],
  failureClasses: [
    "missing_contact_company_persistence",
    "opportunity_not_linked_to_company_participants",
    "direct_contact_only_contact_360_queries",
    "incompatible_relationship_keys",
    "archived_record_filtering",
    "hierarchy_permission_filtering",
  ],
  overnightCodeFix: {
    direct_contact_only_contact_360_queries: "FIXED in compose via companyId search + listDealsByOpportunity",
    archived_record_filtering: "FIXED includeInactive company links; historical deals no longer require archived:false",
    incompatible_relationship_keys: "FIXED join by Contact ID / Company ID / Opportunity ID / Deal ID / participant entityId",
    missing_contact_company_persistence: "NOT APPLIED — requires PO-approved backfill of existing IDs only",
    opportunity_not_linked_to_company_participants: "NOT APPLIED — stamp companyId only when already known on the row",
    hierarchy_permission_filtering: "UNCHANGED — authorised surfaces still respect session permissions",
  },
};

console.log(JSON.stringify(plan, null, 2));

if (APPLY) {
  if (isLikelyProductionUrl(dbUrl) && !ALLOW_PROD) {
    console.error(
      "BLOCKED apply: DATABASE_URL looks like a hosted/production database. Overnight must not run production repair.",
    );
    process.exit(2);
  }
  console.error(
    "BLOCKED apply: apply path is prepared but not implemented for overnight. Await Product Owner approval and a reviewed SQL/service backfill.",
  );
  process.exit(2);
}

console.log(
  "DRY-RUN complete. No rows written. No Contact/Company/Opportunity/Deal created. Production backfill requires explicit approval.",
);
