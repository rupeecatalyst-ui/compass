/**
 * CO-P0-002 Phase 1 — Read-only operational cutover validation.
 *
 * NO database writes. Does not create/update/soft-delete/restore/delete deals.
 *
 * Usage:
 *   node --env-file=.env.local scripts/co-p0-002-readonly-validation.cjs
 *   node scripts/co-p0-002-readonly-validation.cjs
 */
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

function envTrue(name) {
  const v = process.env[name];
  return v === "true" || v === "1";
}

function envFalse(name) {
  const v = process.env[name];
  return v === "false" || v === "0";
}

function resolvePersistenceMode() {
  const raw =
    process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE ??
    process.env.ENTERPRISE_PERSISTENCE_MODE;
  return raw === "prisma" ? "prisma" : "memory";
}

function operationalFlag(publicName, serverName) {
  if (envTrue(publicName) || envTrue(serverName)) return true;
  if (envFalse(publicName) || envFalse(serverName)) return false;
  return resolvePersistenceMode() === "prisma";
}

function extractProjectRef(databaseUrl) {
  if (!databaseUrl) return null;
  // postgresql://postgres.<ref>:...@... or user=postgres.<ref>
  const m = databaseUrl.match(/postgres\.([a-z0-9]+)/i);
  return m ? m[1] : null;
}

function fileContains(relPath, pattern) {
  const full = path.join(process.cwd(), relPath);
  if (!fs.existsSync(full)) return { exists: false, matched: false };
  const text = fs.readFileSync(full, "utf8");
  return { exists: true, matched: pattern.test(text) };
}

async function main() {
  const report = {
    incident: "CO-P0-002",
    phase: "1_read_only",
    writesAuthorized: false,
    checks: {},
    summary: { ok: true, blockers: [], warnings: [] },
  };

  const mode = resolvePersistenceMode();
  const publicMode = process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE ?? null;
  const serverMode = process.env.ENTERPRISE_PERSISTENCE_MODE ?? null;
  const projectRef = extractProjectRef(process.env.DATABASE_URL || "");
  const canonicalPilot = "unpjfzvlokovobxgvazo";

  report.checks.persistence = {
    ENTERPRISE_PERSISTENCE_MODE: serverMode,
    NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE: publicMode,
    resolvedMode: mode,
    clientMirrorOk: publicMode === "prisma" || mode !== "prisma",
  };

  if (mode === "prisma" && publicMode !== "prisma") {
    report.summary.blockers.push(
      "NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE must be prisma for browser cutover (currently unset or not prisma)",
    );
  }

  const api = operationalFlag(
    "NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED",
    "DEAL_REGISTRY_API_ENABLED",
  );
  const dual = operationalFlag(
    "NEXT_PUBLIC_DEAL_REGISTRY_DUAL_WRITE",
    "DEAL_REGISTRY_DUAL_WRITE",
  );
  const port = operationalFlag(
    "NEXT_PUBLIC_DEAL_REGISTRY_PORT_RUNTIME",
    "DEAL_REGISTRY_PORT_RUNTIME",
  );
  const opp = operationalFlag(
    "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_OPPORTUNITY",
    "DEAL_REGISTRY_CONSUMER_OPPORTUNITY",
  );
  const loan = operationalFlag(
    "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_LOAN_WORKSPACE",
    "DEAL_REGISTRY_CONSUMER_LOAN_WORKSPACE",
  );

  const explicitApiOff =
    envFalse("DEAL_REGISTRY_API_ENABLED") ||
    envFalse("NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED");
  const explicitPortOff =
    envFalse("DEAL_REGISTRY_PORT_RUNTIME") ||
    envFalse("NEXT_PUBLIC_DEAL_REGISTRY_PORT_RUNTIME");

  report.checks.runtimeFlags = {
    apiEnabled: api,
    dualWrite: dual,
    portRuntime: port,
    consumerOpportunity: opp,
    consumerLoanWorkspace: loan,
    explicitApiFalse: explicitApiOff,
    explicitPortFalse: explicitPortOff,
    note:
      mode === "prisma"
        ? "Unset flags default ON under prisma (CO-P0-002 code). Explicit false = emergency rollback."
        : "memory mode — Soft Go-Live defaults (operational Deal path not expected).",
  };

  if (mode === "prisma") {
    if (!api || explicitApiOff) {
      report.summary.blockers.push("Deal API not operational under prisma");
    }
    if (!dual) {
      report.summary.warnings.push(
        "Dual-write not operational — creates may not reach Postgres until dual-write is ON",
      );
    }
    if (!port || explicitPortOff) {
      report.summary.blockers.push("Port runtime not operational — My Deals may stay on localStorage");
    }
    if (!opp) {
      report.summary.warnings.push("Opportunity consumer not ON under prisma defaults/explicit");
    }
    if (!loan) {
      report.summary.warnings.push("Loan Workspace consumer not ON under prisma defaults/explicit");
    }
  }

  report.checks.databaseTarget = {
    projectRefFromUrl: projectRef,
    matchesCanonicalPilot: projectRef === canonicalPilot,
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    note: "Pilot / Platform SSOT project — Phase 1 performs READ-ONLY queries only",
  };

  // --- Read path code evidence (no runtime browser) ---
  const myDeals = fileContains(
    "src/components/catalyst-one/my-deals/my-deals-workspace.tsx",
    /loadMyDealsDealRegistryRows/,
  );
  const loanWs = fileContains(
    "src/hooks/use-loan-files-workspace.ts",
    /loadDeals\(/,
  );
  const oppWs = fileContains(
    "src/components/catalyst-one/opportunity-workspace/opportunity-workspace-context.tsx",
    /loadDeals\(/,
  );
  const dalCache = fileContains(
    "src/lib/enterprise-deal/deal-data-access.ts",
    /enterpriseDealCache|loadEnterpriseAsLoanFiles/,
  );
  const flagsDefault = fileContains(
    "src/constants/enterprise-deal-registry/flags.ts",
    /readOperationalDealFlag/,
  );

  report.checks.readPaths = {
    myDealsUsesDealRegistryPort: myDeals.matched,
    loanWorkspaceHydratesLoadDeals: loanWs.matched,
    opportunityWorkspaceHydratesLoadDeals: oppWs.matched,
    dalHasEnterpriseCache: dalCache.matched,
    operationalFlagDefaultsInCode: flagsDefault.matched,
  };

  if (!myDeals.matched) {
    report.summary.blockers.push("My Deals does not call loadMyDealsDealRegistryRows");
  }
  if (!loanWs.matched) {
    report.summary.warnings.push("Loan Workspace may not hydrate via loadDeals()");
  }
  if (!oppWs.matched) {
    report.summary.warnings.push("Opportunity Workspace may not hydrate via loadDeals()");
  }

  // --- Database connectivity + counts (READ ONLY) ---
  report.checks.database = {
    connected: false,
    enterpriseDealCount: null,
    activeDealCount: null,
    sampleDealNumbers: [],
  };

  if (!process.env.DATABASE_URL) {
    report.summary.blockers.push("DATABASE_URL missing — cannot validate DB connectivity");
  } else {
    const prisma = new PrismaClient();
    try {
      const count = await prisma.enterpriseDeal.count();
      const active = await prisma.enterpriseDeal.count({
        where: { isDeleted: false, archived: false },
      });
      const sample = await prisma.enterpriseDeal.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          dealNumber: true,
          legacyLoanFileId: true,
          isDeleted: true,
          archived: true,
          createdAt: true,
        },
      });
      report.checks.database = {
        connected: true,
        enterpriseDealCount: count,
        activeDealCount: active,
        sampleDealNumbers: sample.map((d) => ({
          dealNumber: d.dealNumber,
          legacyLoanFileId: d.legacyLoanFileId,
          isDeleted: d.isDeleted,
          archived: d.archived,
          createdAt: d.createdAt,
        })),
      };
      if (mode === "prisma" && active === 0) {
        report.summary.warnings.push(
          "enterprise_deals has 0 active rows — My Deals will show empty until deals are dual-written (Phase 2 CRUD / real creates)",
        );
      }
    } catch (e) {
      report.summary.blockers.push(`Database read failed: ${e.message}`);
      report.checks.database.error = e.message;
    } finally {
      await prisma.$disconnect();
    }
  }

  report.checks.apiAvailability = {
    inferredEnabled: api && mode === "prisma",
    note:
      "Phase 1 does not call HTTP APIs (would need auth). Availability inferred from persistence mode + flags. Live GET /api/enterprise-deals requires login session.",
  };

  report.summary.ok = report.summary.blockers.length === 0;
  report.phase2 = {
    status: "awaiting_explicit_approval",
    script: "scripts/co-p0-001-deal-integrity-crud.cjs",
    note: "CRUD writes are NOT authorized until you approve Phase 2.",
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.summary.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, phase: "1_read_only", error: e.message }));
  process.exit(1);
});
