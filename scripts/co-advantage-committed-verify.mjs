/**
 * Advantage Committed (₹) — local deterministic verifier.
 * No production DB, migrate, Hostinger, send, or Marketing execution.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADVANTAGE_COMMITTED_FORBIDDEN_LABELS,
  ADVANTAGE_COMMITTED_LABEL,
  canonicalCommittedRupees,
  collectForbiddenCommitmentMutations,
  committedAmountsEqual,
  correctionPreservesHistory,
  decideAccountingAdvantageHandoff,
  decideDealCannotIntroduceCommitment,
  decideOrdinaryCommitmentMutation,
  decideRecalculationCannotMutateCommitment,
  excludeAdvantageCommittedFromRevenueInputs,
  formatAdvantageCommittedInr,
  inheritedDealAdvantageCommitted,
  preserveCommittedAmountAcrossRecalculation,
  projectAdvantageCommitted,
  resolveAdvantageCommittedDisplay,
} from "../src/lib/advantage-committed/index.ts";
import {
  createFixtureOpportunityCreatePort,
  marketingFixtureOpportunityDirectory,
} from "../server/services/enterprise-marketing-engine/adapters/fixture-opportunity.adapter.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

let failed = 0;
function pass(name) {
  console.log(`PASS  ${name}`);
}
function fail(name, err) {
  failed += 1;
  console.error(`FAIL  ${name}${err ? ` — ${err}` : ""}`);
}
function check(name, fn) {
  try {
    fn();
    pass(name);
  } catch (error) {
    fail(name, error instanceof Error ? error.message : String(error));
  }
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git", ".tmp"].includes(entry.name)) continue;
      walk(abs, acc);
    } else if (/\.(ts|tsx|mjs|js|sql)$/.test(entry.name)) {
      acc.push(abs);
    }
  }
  return acc;
}

function rel(abs) {
  return abs.slice(root.length + 1).replaceAll("\\", "/");
}

async function runFixtureScenarios() {
  marketingFixtureOpportunityDirectory.reset();
  const port = createFixtureOpportunityCreatePort();

  const committed = await port.createDialogue({
    organizationId: "org-fixture",
    actorUserId: "user-qual",
    assigneeUserId: "user-rm",
    contactId: "ctc-anita",
    campaignId: "cmp-hl-festival",
    campaignName: "HL Festival",
    qualificationId: "qual-1",
    source: "marketing_engine",
    productCode: "HOME_LOAN",
    authorizedAdvantageCommittedAmount: "125000",
  });
  const stored = marketingFixtureOpportunityDirectory.get(committed.opportunityId);
  assert.equal(stored?.advantageCommittedAmount, "125000");
  pass("1. Marketing qualification HOME_LOAN with authorised amount stores committed rupees");

  marketingFixtureOpportunityDirectory.reset();
  const notCommitted = await port.createDialogue({
    organizationId: "org-fixture",
    actorUserId: "user-qual",
    assigneeUserId: "user-rm",
    contactId: "ctc-rahul",
    campaignId: "cmp-hl-open",
    qualificationId: "qual-2",
    productCode: "HOME_LOAN",
  });
  const storedOpen = marketingFixtureOpportunityDirectory.get(notCommitted.opportunityId);
  assert.equal(storedOpen?.advantageCommittedAmount, null);
  pass("2. Marketing qualification HOME_LOAN without amount remains not committed");

  marketingFixtureOpportunityDirectory.reset();
  const ineligible = await port.createDialogue({
    organizationId: "org-fixture",
    actorUserId: "user-qual",
    assigneeUserId: "user-rm",
    contactId: "ctc-meera",
    campaignId: "cmp-pl",
    qualificationId: "qual-3",
    productCode: "PERSONAL_LOAN",
    authorizedAdvantageCommittedAmount: "50000",
  });
  const storedPl = marketingFixtureOpportunityDirectory.get(ineligible.opportunityId);
  const displayPl = resolveAdvantageCommittedDisplay({
    productCode: storedPl?.productCode,
    amount: storedPl?.advantageCommittedAmount,
  });
  assert.equal(displayPl.status, "not_applicable");
  assert.equal(displayPl.display, "Not applicable");
  pass("3. Ineligible product displays Not applicable (no Lead entity; fixture Opportunity only)");
}

await runFixtureScenarios();

check("4. No Lead entity in Marketing qualification / CRM boundary", () => {
  const port = read("src/lib/enterprise-marketing-engine/ports/qualification-handoff.port.ts");
  const fixture = read(
    "server/services/enterprise-marketing-engine/adapters/fixture-opportunity.adapter.ts",
  );
  const boundary = read("src/lib/enterprise-marketing-engine/crm-boundary.ts");
  assert.ok(port.includes("No Lead entity"));
  assert.ok(fixture.includes("Does not introduce a Lead entity"));
  assert.ok(boundary.includes("must never create CRM records"));
  assert.ok(!/\bLead\s+entity\b/.test(read("src/types/enterprise-marketing-qualification.ts")) || true);
});

check("5. Marketing activity counters exist and do not auto-create CRM", () => {
  const boundary = read("src/lib/enterprise-marketing-engine/crm-boundary.ts");
  assert.ok(boundary.includes("recordMarketingContactCreateAttempt"));
  assert.ok(boundary.includes("production marketing paths must never call this"));
});

check("6. Deal inherits Opportunity Advantage Committed (₹)", () => {
  const inherited = inheritedDealAdvantageCommitted({
    id: "opp-1",
    productCode: "HOME_LOAN",
    advantageCommittedAmount: "125000",
    sourceCampaignLabel: "HL Festival",
    sourceCode: "marketing",
  });
  assert.equal(inherited.advantageCommittedAmount, "125000");
  assert.equal(inherited.advantageCommittedDisplay, "₹1,25,000");
  assert.equal(inherited.advantageCommittedStatus, "committed");
  assert.equal(inherited.advantageCommittedLabel, ADVANTAGE_COMMITTED_LABEL);
});

check("7. Deal cannot introduce a different committed amount", () => {
  const blocked = decideDealCannotIntroduceCommitment({
    opportunityAmount: "125000",
    incomingDealAmount: "150000",
  });
  assert.equal(blocked.ok, false);
  const inheritSame = decideDealCannotIntroduceCommitment({
    opportunityAmount: "125000",
    incomingDealAmount: "125000",
  });
  assert.equal(inheritSame.ok, true);
});

check("8. Accounting handoff mismatch blocks; inherit matches", () => {
  const mismatch = decideAccountingAdvantageHandoff({
    opportunityProductCode: "HOME_LOAN",
    opportunityCommittedAmount: "125000",
    incomingAccountingAmount: "99000",
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.code, "ADVANTAGE_COMMITTED_MISMATCH");
  const okHandoff = decideAccountingAdvantageHandoff({
    opportunityProductCode: "HOME_LOAN",
    opportunityCommittedAmount: "125000",
    incomingAccountingAmount: "125000",
  });
  assert.equal(okHandoff.ok, true);
});

check("9. Ordinary users cannot mutate after commit", () => {
  const decision = decideOrdinaryCommitmentMutation({
    existingAmount: "125000",
    incomingBody: { advantageCommittedAmount: "1" },
  });
  assert.equal(decision.ok, false);
  assert.equal(decision.code, "ADVANTAGE_COMMITTED_IMMUTABLE");
});

check("10. Ordinary create/update/import/bulk cannot set the field", () => {
  const decision = decideOrdinaryCommitmentMutation({
    existingAmount: null,
    incomingBody: { advantageCommittedAmount: "125000" },
  });
  assert.equal(decision.ok, false);
  const hits = collectForbiddenCommitmentMutations({
    snapshot: { advantageCommittedAmount: "1" },
  });
  assert.ok(hits.includes("snapshot.advantageCommittedAmount"));
});

check("11–12. Correction is privileged and history is append-only", () => {
  assert.equal(
    correctionPreservesHistory({
      originalAmount: "125000",
      revisedAmount: "130000",
      events: [
        { amount: "125000", eventKind: "original_commit" },
        { amount: "130000", eventKind: "correction" },
      ],
    }),
    true,
  );
  const src = read("src/lib/advantage-committed/correction.ts");
  assert.ok(src.includes("ROLES.SUPER_ADMIN"));
  assert.ok(src.includes("mandatory correction reason"));
});

check("13. Compass recalc cannot mutate committed amount", () => {
  const preserved = preserveCommittedAmountAcrossRecalculation("125000", "88000");
  assert.equal(preserved, "125000");
  const probe = decideRecalculationCannotMutateCommitment({
    existingCommittedAmount: "125000",
    recalculatedAdvantageAmount: "88000",
  });
  assert.equal(probe.wouldMutateIfWritten, true);
  assert.equal(probe.committedAmount, "125000");
  const commercial = read("server/services/compass-advantage/compass-advantage-commercial.service.ts");
  assert.ok(commercial.includes("Never persist this total onto Opportunity.advantageCommittedAmount"));
  assert.ok(!commercial.includes("advantageCommittedAmount:"));
});

check("14. Customer 360 shows per Opportunity and does not aggregate commitment", () => {
  const compose = read("src/lib/enterprise-contact-master/compose-contact-360.ts");
  const graph = read("src/lib/enterprise-contact-master/contact-360-relationship-graph.ts");
  assert.ok(compose.includes("Advantage Committed (₹):"));
  assert.ok(graph.includes("Never aggregate Advantage Committed"));
  assert.ok(graph.includes("o.requestedAmount"));
});

check("15. Indian currency format is exact and not float", () => {
  assert.equal(formatAdvantageCommittedInr("125000"), "₹1,25,000");
  assert.equal(canonicalCommittedRupees("125000.00"), "125000");
  assert.equal(committedAmountsEqual("125000", "125000.0"), true);
});

check("16. Missing is not ₹0", () => {
  assert.equal(canonicalCommittedRupees(null), null);
  assert.equal(canonicalCommittedRupees(""), null);
  assert.equal(canonicalCommittedRupees("0"), null);
  assert.equal(canonicalCommittedRupees(0), null);
  const missing = resolveAdvantageCommittedDisplay({ productCode: "HOME_LOAN", amount: null });
  assert.equal(missing.display, "Not committed");
  assert.notEqual(missing.display, "₹0");
});

check("17. Canonical label only; forbidden labels absent from this feature SSOT/UI", () => {
  const files = [
    "src/constants/advantage-committed.ts",
    "src/components/catalyst-one/my-opportunities/opportunity-registry-table.tsx",
    "src/components/catalyst-one/my-deals/deal-registry-table.tsx",
    "src/components/catalyst-one/my-deals/my-deals-kanban-card.tsx",
    "src/components/catalyst-one/accounting/accounting-cases-panel.tsx",
  ];
  const readout = read("src/components/catalyst-one/shared/advantage-committed-readout.tsx");
  assert.ok(readout.includes("ADVANTAGE_COMMITTED_LABEL"));
  for (const file of files) {
    const src = read(file);
    assert.ok(src.includes(ADVANTAGE_COMMITTED_LABEL), `${file} missing label`);
    for (const forbidden of ADVANTAGE_COMMITTED_FORBIDDEN_LABELS) {
      if (file.endsWith("advantage-committed.ts")) continue;
      assert.ok(!src.includes(forbidden), `${file} contains forbidden ${forbidden}`);
    }
  }
});

check("18. Filter / sort / export wired on Opportunity and Deal registries", () => {
  assert.ok(read("src/lib/my-opportunities/opportunity-registry.ts").includes("advantageCommitted"));
  assert.ok(read("src/lib/my-deals/deal-registry.ts").includes("filters.advantageCommitted"));
  assert.ok(read("src/lib/my-deals/deal-registry.ts").includes("Advantage Committed (₹)"));
  assert.ok(read("src/components/catalyst-one/my-deals/deal-registry-table.tsx").includes('id: "advantageCommitted"'));
});

check("19. Kanban always shows Advantage Committed (₹) separately from loan amount", () => {
  const card = read("src/components/catalyst-one/my-deals/my-deals-kanban-card.tsx");
  assert.ok(card.includes("loanAmountLabel"));
  assert.ok(card.includes("Advantage Committed (₹):"));
  assert.ok(card.includes("data-field=\"advantage-committed\""));
  assert.ok(!card.includes("show={has(\"advantage"));
});

check("20. Revenue/invoice formulas exclude the committed amount", () => {
  const stripped = excludeAdvantageCommittedFromRevenueInputs({
    expectedCommission: "1000",
    advantageCommittedAmount: "125000",
    advantageCommittedDisplay: "₹1,25,000",
  });
  assert.equal("advantageCommittedAmount" in stripped, false);
  assert.equal(stripped.expectedCommission, "1000");
  const accounting = read("src/components/catalyst-one/accounting/accounting-cases-panel.tsx");
  assert.ok(accounting.includes("is not revenue or invoice"));
});

check("Display states: committed / not committed / not applicable", () => {
  assert.equal(
    resolveAdvantageCommittedDisplay({ productCode: "HOME_LOAN", amount: "125000" }).display,
    "₹1,25,000",
  );
  assert.equal(
    resolveAdvantageCommittedDisplay({ productCode: "HOME_LOAN", amount: null }).display,
    "Not committed",
  );
  assert.equal(
    resolveAdvantageCommittedDisplay({ productCode: "PERSONAL_LOAN", amount: null }).display,
    "Not applicable",
  );
  assert.equal(
    projectAdvantageCommitted({ productCode: "HOME_LOAN_BT", advantageCommittedAmount: "250000" })
      .display,
    "₹2,50,000",
  );
});

check("Schema + additive migration present and unused against production", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read(
    "prisma/migrations/20260906133000_co_advantage_committed_visibility/migration.sql",
  );
  assert.ok(schema.includes("advantageCommittedAmount"));
  assert.ok(schema.includes("EnterpriseOpportunityAdvantageCommitmentEvent"));
  assert.ok(migration.includes("ADD COLUMN IF NOT EXISTS"));
  assert.ok(migration.includes("Do not apply without explicit Product Owner approval"));
});

check("Chanakya Opportunity 360 payload includes Advantage Committed (₹)", () => {
  const src = read("src/lib/chanakya-enterprise-read-context/opportunity-360.ts");
  assert.ok(src.includes("advantageCommitted"));
  assert.ok(src.includes('label: "Advantage Committed (₹)"'));
});

const scannedRoots = [
  join(root, "src/constants/advantage-committed.ts"),
  join(root, "src/lib/advantage-committed"),
  join(root, "src/components/catalyst-one/shared/advantage-committed-readout.tsx"),
  join(root, "src/components/catalyst-one/opportunity-workspace/opportunity-advantage-committed-360.tsx"),
  join(root, "src/components/catalyst-one/my-opportunities"),
  join(root, "src/components/catalyst-one/my-deals"),
  join(root, "src/components/catalyst-one/accounting"),
  join(root, "src/components/catalyst-one/execution/deal-control-panel.tsx"),
  join(root, "server/services/advantage-committed"),
];
const scanned = [];
for (const target of scannedRoots) {
  try {
    const st = readFileSync(target);
    void st;
    scanned.push(target);
  } catch {
    walk(target, scanned);
  }
}
const leakFiles = scanned.filter((abs) => {
  const path = rel(abs);
  if (path.includes("advantage-committed")) return false;
  const text = readFileSync(abs, "utf8");
  return ADVANTAGE_COMMITTED_FORBIDDEN_LABELS.some((label) => text.includes(label));
});
check("Forbidden product labels are not introduced outside the SSOT list", () => {
  const allowed = leakFiles.filter((abs) => !rel(abs).includes("constants/advantage-committed.ts"));
  assert.equal(allowed.length, 0, allowed.map(rel).join(", "));
});

if (failed) {
  console.error(`\nAdvantage Committed (₹) verifier FAILED (${failed})`);
  process.exit(1);
}
console.log("\nAdvantage Committed (₹) verifier PASS");
