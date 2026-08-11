#!/usr/bin/env node
/**
 * CO-DEAL-PIPELINE-TRANSITION-002 — Move to Deal persists Identified, not Logged In – WIP.
 * Static + create-body + transition regression. Optional read-only existing-deal impact.
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
mustContain(createFile, "MOVE_TO_DEAL_INITIAL_GROSS_STAGE", "initial stage constant");
mustContain(createFile, 'MOVE_TO_DEAL_INITIAL_GROSS_STAGE = "identified"', "Identified initial");
mustContain(createFile, "CO-DEAL-PIPELINE-TRANSITION-002", "transition-002 marker");
mustNotContain(createFile, 'grossStage: "logged_in_wip"', "hardcoded Logged In – WIP");
mustContain(
  "server/services/enterprise-deal/enterprise-deal.service.ts",
  "canonicalizeDealPipelineStage",
  "server create canonicalize",
);
mustContain(
  "src/constants/lender-pipeline.ts",
  'id: "identified"',
  "Identified stage exists (≠ inventing enum)",
);
mustContain(
  "src/constants/lender-pipeline.ts",
  'id: "prelogin"',
  "Pre Login remains distinct",
);
mustContain(
  "src/lib/strategic-lender-pipeline/move-to-deal.ts",
  'caseStage: "identified"',
  "Move to Deal builds Identified cases",
);
mustContain(
  "src/lib/enterprise-deal/map-deal-to-registry-row.ts",
  "LENDER_CASE_STAGE_LABELS",
  "registry labels use lender pipeline SSOT",
);

const {
  buildDealCreateBodyFromOpportunity,
  MOVE_TO_DEAL_INITIAL_GROSS_STAGE,
} = await import("../src/lib/enterprise-deal/deal-create-from-opportunity.ts");
const {
  assertLenderPipelineStageTransition,
} = await import("../server/services/enterprise-deal/deal-stage-rules.ts");
const { normalizeLenderCaseStage } = await import(
  "../src/constants/lender-pipeline.ts"
);

if (MOVE_TO_DEAL_INITIAL_GROSS_STAGE !== "identified") {
  failures.push(`MOVE_TO_DEAL_INITIAL_GROSS_STAGE=${MOVE_TO_DEAL_INITIAL_GROSS_STAGE}`);
}

const fakeOpp = {
  id: "opp-test-transition-002",
  opportunityNumber: "OPP-TEST-002",
  productLabel: "Home Loan",
  requestedAmount: 1_000_000,
  primaryBorrowerKind: "individual",
  primaryContactId: "contact-1",
  primaryContactName: "Test Borrower",
  primaryContactMobile: "9876543210",
};

// Even if caller passes a stale logged_in_wip caseStage, create must persist identified
const body = buildDealCreateBodyFromOpportunity({
  opportunity: fakeOpp,
  lenderId: "lender-1",
  lenderName: "Test Lender",
  lenders: [
    {
      id: "case-1",
      lender: "Test Lender",
      status: "active",
      caseStage: "logged_in_wip",
      isPrimary: true,
      lenderRegistryId: "lender-1",
    },
  ],
});

if (body.grossStage !== "identified") {
  failures.push(
    `create body grossStage=${body.grossStage} expected identified (defense vs stale logged_in_wip)`,
  );
}
const snapStage = body.snapshot?.stage?.grossStage;
if (snapStage !== "identified") {
  failures.push(`snapshot stage.grossStage=${snapStage} expected identified`);
}
const snapCase = body.snapshot?.lenders?.[0]?.caseStage;
if (snapCase !== "identified") {
  failures.push(`snapshot lender caseStage=${snapCase} expected identified`);
}
if (normalizeLenderCaseStage(body.grossStage) === "logged_in_wip") {
  failures.push("create body must not normalize to logged_in_wip");
}

// Identified ≠ Prelogin (distinct frozen stages)
if (normalizeLenderCaseStage("identified") === normalizeLenderCaseStage("prelogin")) {
  failures.push("identified must not collapse to prelogin");
}

// Login path: Identified → Logged In – WIP; Prelogin → Logged In – WIP
try {
  assertLenderPipelineStageTransition({
    fromGrossStage: "identified",
    toGrossStage: "logged_in_wip",
    allowSkip: true,
  });
  assertLenderPipelineStageTransition({
    fromGrossStage: "identified",
    toGrossStage: "prelogin",
    allowSkip: false,
  });
  assertLenderPipelineStageTransition({
    fromGrossStage: "prelogin",
    toGrossStage: "logged_in_wip",
    allowSkip: false,
  });
} catch (err) {
  failures.push(`pre-login path regression: ${err.message}`);
}

// Downstream after login
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
      snapshotLenderCaseStage: snapCase,
      canonicalInitial: "identified",
      label: "Identified",
      identifiedEqualsPrelogin: false,
      note: "Prelogin remains the next stage before Login → Logged In – WIP",
    },
    null,
    2,
  ),
);

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
if (process.env.DATABASE_URL && process.env.CO_DEAL_PIPELINE_TRANSITION_002_LIVE !== "0") {
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
      note: "No production Deals were modified.",
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
  console.error("CO-DEAL-PIPELINE-TRANSITION-002 VERIFY FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-DEAL-PIPELINE-TRANSITION-002 VERIFY PASS");
