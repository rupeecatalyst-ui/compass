#!/usr/bin/env node
/**
 * Read-only RC employee reconciliation inspection.
 * Default: dry-run. Never apply unless APPLY_RC_EMPLOYEE_BACKFILL=1 (forbidden overnight).
 * Does not print customer mobile numbers or email addresses.
 */
import { PrismaClient } from "@prisma/client";
import {
  classifyDealRcEmployeeReconcile,
} from "../src/lib/enterprise-deal/rc-employee-assignment.ts";

const apply = process.env.APPLY_RC_EMPLOYEE_BACKFILL === "1";
const dryRun = !apply;

if (apply) {
  console.error("APPLY is disabled for overnight execution. Refusing to write.");
  process.exit(2);
}

const prisma = new PrismaClient();

function subject(row) {
  return {
    relationshipManagerUserId: row.relationshipManagerUserId,
    relationshipManagerName: row.relationshipManagerName,
    primaryOwnerUserId: row.primaryOwnerUserId,
    createdBy: row.createdBy,
    assignmentMode: row.assignmentMode,
    lendingExtension: row.lendingExtension,
  };
}

try {
  const deals = await prisma.enterpriseDeal.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      dealNumber: true,
      opportunityId: true,
      relationshipManagerUserId: true,
      relationshipManagerName: true,
      primaryOwnerUserId: true,
      createdBy: true,
      assignmentMode: true,
      lendingExtension: true,
    },
    take: 5000,
  });
  const opportunityIds = [...new Set(deals.map((d) => d.opportunityId).filter(Boolean))];
  const opportunities = opportunityIds.length
    ? await prisma.enterpriseOpportunity.findMany({
        where: { id: { in: opportunityIds } },
        select: {
          id: true,
          relationshipManagerUserId: true,
          relationshipManagerName: true,
          primaryOwnerUserId: true,
          createdBy: true,
          lendingExtension: true,
        },
      })
    : [];
  const oppById = new Map(opportunities.map((o) => [o.id, o]));

  const counts = {
    scannedDeals: deals.length,
    "ok-inherited": 0,
    "ok-override": 0,
    "ok-unassigned": 0,
    "needs-inherit": 0,
    missingOpportunity: 0,
  };
  for (const deal of deals) {
    const opportunity = deal.opportunityId ? oppById.get(deal.opportunityId) : null;
    if (!opportunity) {
      counts.missingOpportunity += 1;
      continue;
    }
    const klass = classifyDealRcEmployeeReconcile({
      deal: subject(deal),
      opportunity: subject(opportunity),
    });
    counts[klass] += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        apply: false,
        scannedDeals: counts.scannedDeals,
        classes: {
          okInherited: counts["ok-inherited"],
          okOverride: counts["ok-override"],
          okUnassigned: counts["ok-unassigned"],
          needsInherit: counts["needs-inherit"],
          missingOpportunity: counts.missingOpportunity,
        },
        wouldUpdateIfApplied: counts["needs-inherit"],
        note: "Overnight did not execute a production backfill.",
      },
      null,
      2,
    ),
  );
} catch (err) {
  const name = err instanceof Error ? err.name : "Error";
  const code =
    err && typeof err === "object" && "code" in err
      ? String(err.code ?? "")
      : "";
  const blocked =
    name.includes("Prisma") ||
    /^P10\d{2}$/.test(code) ||
    /^P20\d{2}$/.test(code) ||
    /PrismaClient/.test(name);
  console.log(
    JSON.stringify(
      {
        dryRun,
        apply: false,
        status: blocked ? "BLOCKED" : "FAIL",
        reason: blocked
          ? "Database unavailable for read-only inspection"
          : "Read-only inspection failed",
        errorClass: code || name,
      },
      null,
      2,
    ),
  );
  process.exit(blocked ? 0 : 1);
} finally {
  await prisma.$disconnect();
}
