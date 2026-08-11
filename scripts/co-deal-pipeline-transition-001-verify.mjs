/**
 * CO-DEAL-PIPELINE-TRANSITION-001 — Move to Deal must initialize at Identified, not Logged In – WIP.
 * Static + pure create-body check. Optional read-only existing-deal impact (no mutations).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function mustContain(rel, needle, label = needle) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  if (!text.includes(needle)) failures.push(`${rel} missing ${label}`);
}
function mustNotContain(rel, needle, label = needle) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  if (text.includes(needle)) failures.push(`${rel} must not contain ${label}`);
}

const createFile = "src/lib/enterprise-deal/deal-create-from-opportunity.ts";
mustContain(createFile, "CO-DEAL-PIPELINE-TRANSITION-001", "transition sprint marker");
mustContain(createFile, "lenderCaseStageToGrossStage", "derive grossStage from case stage");
mustContain(createFile, 'primary?.caseStage ?? "identified"', "default Identified");
mustNotContain(
  createFile,
  'grossStage: "logged_in_wip"',
  "hardcoded Logged In – WIP on create",
);
mustNotContain(
  createFile,
  'stage: { grossStage: "logged_in_wip"',
  "hardcoded snapshot Logged In – WIP",
);

mustContain(
  "src/lib/strategic-lender-pipeline/move-to-deal.ts",
  'caseStage: "identified"',
  "Move to Deal builds Identified lender cases",
);
mustContain(
  "src/constants/lender-pipeline.ts",
  'id: "identified"',
  "canonical Identified stage",
);
mustContain(
  "server/services/enterprise-deal/deal-stage-rules.ts",
  '"identified"',
  "server forward path starts at identified",
);
mustContain(
  "server/services/enterprise-deal/deal-stage-rules.ts",
  '"logged_in_wip"',
  "Login transition stage preserved",
);

const {
  buildDealCreateBodyFromOpportunity,
} = await import("../src/lib/enterprise-deal/deal-create-from-opportunity.ts");
const {
  assertLenderPipelineStageTransition,
} = await import("../server/services/enterprise-deal/deal-stage-rules.ts");
const { normalizeLenderCaseStage } = await import(
  "../src/constants/lender-pipeline.ts"
);

const fakeOpp = {
  id: "opp-test-transition-001",
  opportunityNumber: "OPP-TEST-001",
  productLabel: "Home Loan",
  requestedAmount: 1_000_000,
  primaryBorrowerKind: "individual",
  primaryContactId: "contact-1",
  primaryContactName: "Test Borrower",
  primaryContactMobile: "9876543210",
};

const body = buildDealCreateBodyFromOpportunity({
  opportunity: fakeOpp,
  lenderId: "lender-1",
  lenderName: "Test Lender",
  lenders: [
    {
      id: "case-1",
      lender: "Test Lender",
      status: "active",
      caseStage: "identified",
      isPrimary: true,
      lenderRegistryId: "lender-1",
    },
  ],
});

if (body.grossStage !== "identified") {
  failures.push(
    `create body grossStage=${body.grossStage} expected identified (not logged_in_wip)`,
  );
}
const snapStage = body.snapshot?.stage?.grossStage;
if (snapStage !== "identified") {
  failures.push(`snapshot stage.grossStage=${snapStage} expected identified`);
}
if (normalizeLenderCaseStage(body.grossStage) === "logged_in_wip") {
  failures.push("create body must not normalize to logged_in_wip");
}

// Login transition regression: Identified → Logged In – WIP must remain valid
try {
  const t = assertLenderPipelineStageTransition({
    fromGrossStage: "identified",
    toGrossStage: "logged_in_wip",
    allowSkip: true,
  });
  if (t.toGrossStage !== "logged_in_wip") {
    failures.push(`login transition returned ${t.toGrossStage}`);
  }
} catch (err) {
  failures.push(`Identified → Logged In – WIP must remain allowed: ${err.message}`);
}

// Forward path still valid after login
try {
  assertLenderPipelineStageTransition({
    fromGrossStage: "logged_in_wip",
    toGrossStage: "soft_approved",
    allowSkip: false,
  });
  assertLenderPipelineStageTransition({
    fromGrossStage: "soft_approved",
    toGrossStage: "final_approved",
    allowSkip: false,
  });
  assertLenderPipelineStageTransition({
    fromGrossStage: "final_approved",
    toGrossStage: "closure_wip",
    allowSkip: false,
  });
  assertLenderPipelineStageTransition({
    fromGrossStage: "closure_wip",
    toGrossStage: "disbursed",
    allowSkip: false,
  });
  assertLenderPipelineStageTransition({
    fromGrossStage: "logged_in_wip",
    toGrossStage: "lost",
    allowSkip: false,
  });
  assertLenderPipelineStageTransition({
    fromGrossStage: "logged_in_wip",
    toGrossStage: "hold",
    allowSkip: false,
  });
} catch (err) {
  failures.push(`forward/lost/hold regression: ${err.message}`);
}

console.log(
  JSON.stringify(
    {
      createBodyGrossStage: body.grossStage,
      snapshotGrossStage: snapStage,
      canonicalInitial: "identified",
      label: "Identified",
    },
    null,
    2,
  ),
);

// Optional read-only impact (no mutations)
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

let existingImpact = { status: "SKIPPED_NO_DATABASE_URL" };
if (process.env.DATABASE_URL && process.env.CO_DEAL_PIPELINE_TRANSITION_001_LIVE !== "0") {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const loggedInWip = await prisma.enterpriseDeal.findMany({
      where: {
        isDeleted: false,
        grossStage: { in: ["logged_in_wip", "logged_in"] },
      },
      select: {
        id: true,
        dealNumber: true,
        grossStage: true,
        createdAt: true,
        updatedAt: true,
        opportunityId: true,
        lenderId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Stage transition history: any non-create transition implies subsequent activity
    const dealIds = loggedInWip.map((d) => d.id);
    let withLaterTransitions = new Set();
    if (dealIds.length) {
      const [activities, timeline] = await Promise.all([
        prisma.enterpriseDealActivity
          .findMany({
            where: { dealId: { in: dealIds }, isDeleted: false },
            select: { dealId: true },
            take: 2000,
          })
          .catch(() => []),
        prisma.enterpriseDealTimelineEvent
          .findMany({
            where: {
              dealId: { in: dealIds },
              OR: [
                { eventType: { contains: "stage" } },
                { eventType: { contains: "transition" } },
                { summary: { contains: "Logged In" } },
                { summary: { contains: "stage" } },
              ],
            },
            select: { dealId: true },
            take: 2000,
          })
          .catch(() => []),
      ]);
      withLaterTransitions = new Set([
        ...activities.map((e) => e.dealId),
        ...timeline.map((e) => e.dealId),
      ]);
    }

    const possiblyIncorrectInit = loggedInWip.filter((d) => {
      if (withLaterTransitions.has(d.id)) return false;
      const deltaMs = d.updatedAt.getTime() - d.createdAt.getTime();
      return deltaMs < 60_000;
    });
    existingImpact = {
      status: "READ_ONLY",
      totalLoggedInWipOrAlias: loggedInWip.length,
      withStageActivitySignals: withLaterTransitions.size,
      possiblyIncorrectInitCount: possiblyIncorrectInit.length,
      samplePossiblyIncorrect: possiblyIncorrectInit.slice(0, 25).map((d) => ({
        id: d.id,
        dealNumber: d.dealNumber,
        grossStage: d.grossStage,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        opportunityId: d.opportunityId,
        lenderId: d.lenderId,
      })),
      note: "No production Deals were modified. PossiblyIncorrect = currently at Logged In – WIP with no stage-activity signal found (heuristic).",
    };
    console.log(JSON.stringify({ existingDealImpact: existingImpact }, null, 2));
  } catch (err) {
    existingImpact = {
      status: "ERROR",
      message: String(err?.message || err),
    };
    console.log(JSON.stringify({ existingDealImpact: existingImpact }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
} else {
  console.log(JSON.stringify({ existingDealImpact: existingImpact }, null, 2));
}

if (failures.length) {
  console.error("CO-DEAL-PIPELINE-TRANSITION-001 VERIFY FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-DEAL-PIPELINE-TRANSITION-001 VERIFY PASS");
