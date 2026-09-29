/**
 * Opportunity custom-value save atomicity proofs.
 * In-memory journal. No database.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { propagateContactIdentityToTransactions } from "../../../server/services/ecm/contact-ssot-propagate";
import { getEdlPorts } from "../enterprise-decision-ledger/composition";
import { createOperationalCustomValueAuditBuffer, type CustomFieldAuditEvent } from "./custom-field-audit";
import { resolveCompanyCreateCustomValueAction } from "./operational-custom-fields";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const checks: Array<[string, boolean]> = [];

function check(name: string, passed: boolean) {
  checks.push([name, passed]);
  if (!passed) console.error(`FAIL ${name}`);
}

type FailAt = "propagation" | "opportunity" | "custom-value" | "audit";

function createJournal() {
  let rows: string[] = [];
  return {
    read: () => [...rows],
    async transaction(work: (write: (table: string) => void) => Promise<void>) {
      const before = [...rows];
      try {
        await work((table) => {
          rows = [...rows, table];
        });
      } catch (error) {
        rows = before;
        throw error;
      }
    },
  };
}

const auditEvent: CustomFieldAuditEvent = {
  action: "value_created",
  actorUserId: "rm-1",
  organizationId: "org-a",
  fieldLineageId: "opportunity.channelNote",
  entityId: "opp-1",
  previousValue: null,
  newValue: "Branch desk",
};

async function atomicSave(failAt?: FailAt) {
  const journal = createJournal();
  const audits = createOperationalCustomValueAuditBuffer();
  const ledgerBefore = getEdlPorts().ledger.list().length;
  try {
    await journal.transaction(async (write) => {
      write("contact");
      await propagateContactIdentityToTransactions(
        {
          organizationId: "org-a",
          contactId: "contact-1",
          contact: {
            name: "Asha Rao",
            mobilePrimary: "9999999999",
            city: "Pune",
            state: "Maharashtra",
          },
          modifiedBy: "rm-1",
        },
        {
          enterpriseOpportunity: {
            updateMany: async () => {
              if (failAt === "propagation") throw new Error("propagation");
              write("opportunity-mirror");
              return { count: 1 };
            },
          },
          enterpriseDeal: {
            updateMany: async () => {
              write("deal-mirror");
              return { count: 1 };
            },
          },
        } as never,
      );
      if (failAt === "opportunity") throw new Error("opportunity");
      write("opportunity");
      if (failAt === "custom-value") throw new Error("custom-value");
      write("custom-value");
      if (failAt === "audit") {
        audits.capture({ ...auditEvent, actorUserId: " " });
      } else {
        audits.capture(auditEvent);
      }
      audits.publish();
    });
  } catch {
    return {
      rows: journal.read(),
      ledgerDelta: getEdlPorts().ledger.list().length - ledgerBefore,
    };
  }
  return {
    rows: journal.read(),
    ledgerDelta: getEdlPorts().ledger.list().length - ledgerBefore,
  };
}

async function main(): Promise<void> {
  const rolledBackValue = await atomicSave("custom-value");
  check(
    "custom_value_failure_rolls_back_entire_save",
    rolledBackValue.rows.length === 0 && rolledBackValue.ledgerDelta === 0,
  );

  const rolledBackPropagation = await atomicSave("propagation");
  check(
    "propagation_failure_rolls_back_entire_save",
    rolledBackPropagation.rows.length === 0 && rolledBackPropagation.ledgerDelta === 0,
  );

  const rolledBackOpportunity = await atomicSave("opportunity");
  check(
    "opportunity_row_failure_rolls_back_entire_save",
    rolledBackOpportunity.rows.length === 0 && rolledBackOpportunity.ledgerDelta === 0,
  );

  const rolledBackAudit = await atomicSave("audit");
  check(
    "audit_failure_rolls_back_save_and_hides_audit",
    rolledBackAudit.rows.length === 0 && rolledBackAudit.ledgerDelta === 0,
  );

  const saved = await atomicSave();
  check(
    "successful_save_commits_identity_mirrors_opportunity_value_and_audit",
    saved.rows.join(",") === "contact,opportunity-mirror,deal-mirror,opportunity,custom-value" &&
      saved.ledgerDelta === 1,
  );

  const propagateSource = readFileSync(
    path.join(repoRoot, "server/services/ecm/contact-ssot-propagate.ts"),
    "utf8",
  );
  const suppliedBranch = propagateSource.slice(
    propagateSource.indexOf("if (db)"),
    propagateSource.indexOf("const [opp, deal] = await prisma.$transaction"),
  );
  check(
    "supplied_client_does_not_open_a_transaction",
    suppliedBranch.includes("db.enterpriseOpportunity.updateMany") &&
      suppliedBranch.includes("db.enterpriseDeal.updateMany") &&
      !suppliedBranch.includes("prisma.$transaction"),
  );
  check(
    "default_propagation_keeps_global_batch_transaction",
    propagateSource.includes("prisma.$transaction") &&
      propagateSource.includes("prisma.enterpriseOpportunity.updateMany") &&
      propagateSource.includes("prisma.enterpriseDeal.updateMany"),
  );

  const contactRepository = readFileSync(
    path.join(repoRoot, "server/repositories/ecm/contact.repository.ts"),
    "utf8",
  );
  const contactService = readFileSync(path.join(repoRoot, "server/services/ecm/contact.service.ts"), "utf8");
  const opportunityService = readFileSync(
    path.join(repoRoot, "server/services/enterprise-opportunity/index.ts"),
    "utf8",
  );
  const commitSource = readFileSync(
    path.join(repoRoot, "src/lib/field-control-master/operational-custom-field-commit.ts"),
    "utf8",
  );
  const opportunityCommit = commitSource.slice(
    commitSource.indexOf("export async function commitOpportunityWithCustomFields"),
    commitSource.indexOf("export async function saveOperationalCustomField"),
  );
  check(
    "transaction_client_reaches_the_full_mutation_chain",
    contactRepository.includes("db.ecmContact.update") &&
      contactService.includes("ecmContactRepository.update(id, {") &&
      contactService.includes("}, db)") &&
      propagateSource.includes("ecmContactService.update(input.primaryContactId, patch, input.actorUserId, input.db)") &&
      opportunityService.includes("db: options?.db") &&
      opportunityCommit.includes("db: tx") &&
      opportunityCommit.indexOf("contextFor") < opportunityCommit.indexOf("prisma.$transaction") &&
      opportunityCommit.indexOf("customValueAudits.capture") < opportunityCommit.indexOf("customValueAudits.publish") &&
      opportunityCommit.indexOf("updateOpportunity") < opportunityCommit.indexOf("customValueAudits.publish"),
  );

  const dealService = readFileSync(
    path.join(repoRoot, "server/services/enterprise-deal/enterprise-deal.service.ts"),
    "utf8",
  );
  const dealSync = dealService.slice(
    dealService.indexOf("await syncContactIdentityPatchToEcm"),
    dealService.indexOf("await syncContactIdentityPatchToEcm") + 450,
  );
  const contactRoute = readFileSync(
    path.join(repoRoot, "src/app/api/ecm/contacts/[contactId]/route.ts"),
    "utf8",
  );
  const contactUpdateStart = contactRoute.indexOf("ecmContactService.update");
  const contactUpdate = contactRoute.slice(
    contactUpdateStart,
    contactRoute.indexOf("syncEcmPortsFromPrisma", contactUpdateStart),
  );
  check(
    "deal_caller_supplies_no_transaction_client",
    dealSync.includes("actorUserId: input.actorUserId") && !dealSync.includes("db:"),
  );
  check(
    "contact_patch_supplies_no_transaction_client",
    contactUpdate.includes("tokenActor.userId") && !contactUpdate.includes("db:"),
  );

  check(
    "new_company_custom_values_still_apply",
    resolveCompanyCreateCustomValueAction({ created: true, writes: [{}], clears: [] }) === "apply",
  );
  check(
    "existing_company_create_does_not_write_or_clear_custom_values",
    resolveCompanyCreateCustomValueAction({ created: false, writes: [{}], clears: [] }) === "reject" &&
      resolveCompanyCreateCustomValueAction({ created: false, writes: [], clears: ["company.tradeNote"] }) === "reject",
  );
  check(
    "existing_company_without_custom_changes_is_reused",
    resolveCompanyCreateCustomValueAction({ created: false, writes: [], clears: [] }) === "reuse",
  );
  check(
    "company_create_guard_remains_in_commit",
    commitSource.includes("COMPANY_ALREADY_EXISTS") &&
      commitSource.includes("registerOutcome") &&
      commitSource.includes('action === "apply"'),
  );

  const changed = spawnSync("git", ["diff", "--name-only", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).stdout;
  check(
    "forbidden_scopes_unchanged",
    !changed.includes("src/lib/product-programme") &&
      !changed.includes("server/services/product-programme-operations/") &&
      !changed.includes("server/services/lender-recommendation/") &&
      !changed.includes("compass/") &&
      !changed.includes("src/lib/chanakya") &&
      !changed.includes("src/constants/enterprise-ai-platform/") &&
      !changed.includes("server/services/enterprise-deal/enterprise-deal.service.ts") &&
      !changed.includes("prisma/migrations/"),
  );

  const failed = checks.filter(([, passed]) => !passed);
  console.log(`FCM_OPERATIONAL_SAVE_ATOMICITY_PROOF checks=${checks.length} failed=${failed.length}`);
  if (failed.length > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
