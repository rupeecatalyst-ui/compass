/**
 * Canonical Advantage Committed (₹) verifier against isolated PostgreSQL.
 * Never prints passwords.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const secret = JSON.parse(readFileSync(join(root, ".tmp/ppo-bat.secret.json"), "utf8"));
const CLEAN_DB = "catalyst_one_product_program_bat_clean_002";
const HOST = "127.0.0.1";
process.env.NODE_PATH = "C:\\Compass by Rupee Catalyst (3)\\node_modules";
process.env.DATABASE_URL = `postgresql://${encodeURIComponent(secret.user)}:${encodeURIComponent(secret.password)}@${HOST}:${secret.port}/${CLEAN_DB}?schema=public`;
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.NODE_ENV = "development";
process.env.CATALYST_BAT_ISOLATED_PRISMA = "1";
process.env.ENTERPRISE_MARKETING_EMAIL_MODE = "dry_run";
process.env.JWT_SECRET = secret.jwtSecret;
process.env.JWT_REFRESH_SECRET = secret.jwtRefreshSecret;

const isolatedMod = await import(pathToFileURL(join(root, ".tmp/generated/prisma-client/index.js")).href);
const { configureBatPrismaClient, prisma } = await import("../server/lib/prisma.ts");
configureBatPrismaClient(isolatedMod.PrismaClient);
const { resolveAdvantageCommittedDisplay } = await import("../src/lib/advantage-committed/display.ts");
const {
  decideDealCannotIntroduceCommitment,
  decideRecalculationCannotMutateCommitment,
  preserveCommittedAmountAcrossRecalculation,
} = await import("../src/lib/advantage-committed/immutability.ts");
const { advantageCommittedIsNotRevenueOrInvoice } = await import("../src/lib/advantage-committed/accounting-handoff.ts");
const { ENTERPRISE_MARKETING_EXECUTION_ENABLED } = await import(
  "../src/constants/enterprise-marketing-engine/safety.ts"
);

const results = [];
function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(JSON.stringify({ id, ok, detail }));
  if (!ok) throw new Error(`${id} FAIL`);
}

try {
  record("MARKETING-OFF", ENTERPRISE_MARKETING_EXECUTION_ENABLED === false, {
    ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  });

  const committed = await prisma.enterpriseOpportunity.findUnique({ where: { id: "opp_ppo_adv_committed" } });
  const uncommitted = await prisma.enterpriseOpportunity.findUnique({ where: { id: "opp_ppo_adv_not_committed" } });
  const ineligible = await prisma.enterpriseOpportunity.findUnique({ where: { id: "opp_ppo_adv_not_applicable" } });
  const deal = await prisma.enterpriseDeal.findUnique({ where: { id: "deal_ppo_adv_committed" } });
  const accounting = await prisma.enterpriseAccountingCase.findUnique({ where: { id: "eac_ppo_adv_committed" } });

  const amount = committed?.advantageCommittedAmount?.toString() ?? null;
  record("CANONICAL-AMOUNT", amount === "125000" || amount === "125000.00" || Number(amount) === 125000, {
    amount,
  });
  const committedDisplay = resolveAdvantageCommittedDisplay({
    productCode: committed?.productCode,
    amount: committed?.advantageCommittedAmount,
  });
  record("DISPLAY-COMMITTED", committedDisplay.display.includes("1,25,000") || committedDisplay.display.includes("125000"), {
    display: committedDisplay.display,
  });
  const nullDisplay = resolveAdvantageCommittedDisplay({
    productCode: uncommitted?.productCode,
    amount: uncommitted?.advantageCommittedAmount,
  });
  record("NULL-NOT-ZERO", nullDisplay.display === "Not committed" && nullDisplay.display !== "₹0", {
    display: nullDisplay.display,
  });
  const naDisplay = resolveAdvantageCommittedDisplay({
    productCode: ineligible?.productCode,
    amount: ineligible?.advantageCommittedAmount,
  });
  record("NOT-APPLICABLE", naDisplay.display === "Not applicable", { display: naDisplay.display });

  record("DEAL-LINKS-OPPORTUNITY", deal?.opportunityId === committed?.id, {
    dealOpportunityId: deal?.opportunityId,
  });
  record("ACCOUNTING-LINKS-DEAL", accounting?.dealId === deal?.id, { caseDealId: accounting?.dealId });
  record("CUSTOMER-360-MAPPING", committed?.primaryContactId === "ecm_ppo_bat_customer" && uncommitted?.primaryContactId === "ecm_ppo_bat_customer" && committed?.id !== uncommitted?.id, {
    committedContact: committed?.primaryContactId,
  });

  const dealMutate = decideDealCannotIntroduceCommitment({
    opportunityAmount: committed?.advantageCommittedAmount,
    incomingDealAmount: "999",
  });
  record("DEAL-EDIT-CANNOT-CHANGE", dealMutate.ok === false, { code: dealMutate.code });
  const recalc = decideRecalculationCannotMutateCommitment({
    existingCommittedAmount: committed?.advantageCommittedAmount,
    recalculatedAdvantageAmount: "999999",
  });
  const preserved = preserveCommittedAmountAcrossRecalculation(committed?.advantageCommittedAmount, "999999");
  record(
    "RECALC-CANNOT-CHANGE",
    recalc.wouldMutateIfWritten === true && preserved === "125000",
    { recalc, preserved },
  );
  const revenue = advantageCommittedIsNotRevenueOrInvoice({
    advantageCommittedAmount: committed?.advantageCommittedAmount,
    expectedRevenue: accounting?.expectedCommission,
    confirmedInvoiceAmount: accounting?.confirmedInvoiceAmount,
  });
  record("ACCOUNTING-NOT-REVENUE", revenue.countedAsRevenue === false && revenue.countedAsInvoice === false, revenue);

  const oneAmount =
    Number(committed?.advantageCommittedAmount) === 125000 &&
    deal?.opportunityId === committed?.id &&
    accounting?.dealId === deal?.id;
  record("ONE-CANONICAL-AMOUNT-GRAPH", oneAmount, {
    opportunity: Number(committed?.advantageCommittedAmount),
    dealId: deal?.id,
    caseId: accounting?.id,
  });

  console.log(JSON.stringify({ ok: true, results }));
} finally {
  await prisma.$disconnect();
}
