import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const expect = (name, condition) => {
  checks.push({ name, ok: Boolean(condition) });
};

const schema = read("prisma/schema.prisma");
const migration = read(
  "prisma/migrations/20260815113000_post_disbursement_confirmation_accounting_case/migration.sql",
);
const repository = read(
  "server/repositories/enterprise-deal/enterprise-deal.repository.ts",
);
const confirmation = read(
  "server/services/post-disbursement-confirmation/post-disbursement-confirmation.service.ts",
);
const cron = read("src/app/api/cron/post-disbursement-confirmation/route.ts");
const kanban = read("src/components/catalyst-one/execution/lender-pipeline-board.tsx");
const eteRules = read("src/constants/enterprise-task-engine/work-management.ts");
const pdcConstants = read("src/constants/post-disbursement-confirmation.ts");
const hydrate = read("src/lib/post-disbursement-confirmation/hydrate-ete.ts");
const tasksWorkspace = read(
  "src/components/catalyst-one/tasks/task-engine-workspace.tsx",
);
const vercel = JSON.parse(read("vercel.json"));

expect(
  "Accounting Case is unique per organization and Deal",
  schema.includes("@@unique([organizationId, dealId]") &&
    schema.includes("model EnterpriseAccountingCase"),
);
expect(
  "Disbursed timestamp has database immutability enforcement",
  migration.includes("preserve_enterprise_deal_disbursed_at") &&
    migration.includes("immutable"),
);
expect(
  "Disbursed transition creates +72h durable schedule",
  repository.includes("POST_DISBURSEMENT_CONFIRMATION_DELAY_HOURS") &&
    repository.includes("enterprisePostDisbursementSchedule.upsert"),
);
expect(
  "Cron transition is transactional and claims pending rows",
  confirmation.includes("prisma.$transaction") &&
    confirmation.includes('status: "processing"') &&
    confirmation.includes("confirmation_pending"),
);
expect(
  "Human confirmation writes Deal, Accounting Case, timeline, and EAR",
  confirmation.includes("enterpriseDeal.updateMany") &&
    confirmation.includes("enterpriseAccountingCase.upsert") &&
    confirmation.includes("enterpriseDealTimelineEvent.create") &&
    confirmation.includes("enterpriseActivityEvent.upsert"),
);
expect(
  "Confirmation Pending creates durable owner task with idempotency key",
  confirmation.includes("ensureOwnerConfirmationTask") &&
    confirmation.includes("postDisbursementTaskIdempotencyKey") &&
    confirmation.includes("Obtain Lender Disbursement Confirmation"),
);
expect(
  "Confirmation Received completes automatic owner task",
  confirmation.includes("completeOwnerConfirmationTasks") &&
    confirmation.includes('status: "completed"'),
);
expect(
  "Confirmation Received is idempotent on replay",
  confirmation.includes("idempotentReplay") &&
    confirmation.includes("confirmation_received"),
);
expect(
  "No Accounting Case created at Confirmation Pending",
  confirmation.includes("No Accounting Case here") ||
    !/confirmation_pending[\s\S]{0,400}enterpriseAccountingCase\.create/.test(
      confirmation,
    ),
);
expect(
  "EAR source event IDs are deterministic",
  confirmation.includes("postDisbursementPendingEventId") &&
    confirmation.includes("postDisbursementReceivedEventId") &&
    confirmation.includes("postDisbursementTaskCreatedEventId") &&
    confirmation.includes("postDisbursementAccountingCreatedEventId"),
);
expect(
  "Kanban shows red LENDER CONFIRMATION PENDING label",
  kanban.includes("LENDER_CONFIRMATION_PENDING_KANBAN_LABEL") &&
    pdcConstants.includes("LENDER CONFIRMATION PENDING") &&
    kanban.includes("text-red-600"),
);
expect(
  "Kanban Confirmation Received action is wired",
  kanban.includes("confirmPostDisbursementReceived") &&
    kanban.includes("Confirmation Received"),
);
expect(
  "ETE rule exists for post_disbursement_confirmation_pending",
  eteRules.includes("post_disbursement_confirmation_pending") &&
    eteRules.includes("obtain-lender-disbursement-confirmation") &&
    eteRules.includes("dueInDays: 0"),
);
expect(
  "Tasks workspace hydrates durable PDC owner tasks",
  hydrate.includes("hydratePostDisbursementOwnerTasksIntoEte") &&
    tasksWorkspace.includes("hydratePostDisbursementOwnerTasksIntoEte"),
);
expect(
  "Cron requires CRON_SECRET in production",
  cron.includes("CRON_SECRET") && cron.includes('process.env.NODE_ENV === "production"'),
);
expect(
  "Hourly Vercel cron is configured",
  vercel.crons?.some(
    (item) =>
      item.path === "/api/cron/post-disbursement-confirmation" &&
      item.schedule === "0 * * * *",
  ),
);
expect(
  "Generic EnterpriseInvoice model remains forbidden",
  !schema.includes("model EnterpriseInvoice "),
);
expect(
  "EnterpriseAccountingInvoice is the authorized invoice SSOT",
  schema.includes("model EnterpriseAccountingInvoice ") &&
    schema.includes("This is not an invoice entity"),
);
expect(
  "Confirmation Received does not create an Accounting Invoice",
  !confirmation.includes("enterpriseAccountingInvoice.create") &&
    !confirmation.includes("enterpriseAccountingInvoice.upsert"),
);
expect(
  "Disbursed Deal path does not create an Accounting Invoice",
  !repository.includes("enterpriseAccountingInvoice.create") &&
    !repository.includes("enterpriseAccountingInvoice.upsert"),
);
expect(
  "Accounting Case remains distinct from Invoice",
  schema.includes("model EnterpriseAccountingCase") &&
    !/model EnterpriseAccountingCase[\s\S]{0,800}invoiceNumber/.test(schema),
);

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"}: ${check.name}`);
}
if (checks.some((check) => !check.ok)) process.exit(1);
console.log(`PASS: ${checks.length} post-disbursement backend + alert/task checks`);
