/**
 * CO-P0-002 — Operational cutover gate (includes CRUD).
 *
 * WARNING: Spawns co-p0-001-deal-integrity-crud.cjs which WRITES a temporary
 * deal to enterprise_deals then deletes it. Do NOT run against shared pilot/
 * live SSOT without explicit operator approval (CO-P0-002 Phase 2).
 *
 * Prefer Phase 1 read-only first:
 *   npm run verify:deal-registry:readonly
 *
 * Usage (Phase 2 only, after approval):
 *   node --env-file=.env.local scripts/co-p0-002-operational-cutover-gate.cjs
 */
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
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

function assert(step, cond, detail) {
  if (!cond) {
    console.error(JSON.stringify({ ok: false, step, detail: detail || "failed" }));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, step, ...(detail ? { detail } : {}) }));
}

async function main() {
  if (envTrue("SKIP_DEAL_REGISTRY_GATE")) {
    console.log(
      JSON.stringify({
        ok: true,
        step: "skipped",
        detail: "SKIP_DEAL_REGISTRY_GATE=1 — gate bypassed",
      }),
    );
    return;
  }

  const mode = resolvePersistenceMode();
  assert("persistence_mode_read", mode === "prisma" || mode === "memory", mode);

  if (mode !== "prisma") {
    console.log(
      JSON.stringify({
        ok: true,
        step: "gate_not_applicable",
        detail: "ENTERPRISE_PERSISTENCE_MODE!=prisma — Soft Go-Live / memory; gate skipped",
      }),
    );
    return;
  }

  // Client mirror required for browser dual-write / port
  const publicMode = process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE;
  assert(
    "next_public_persistence_mirror",
    publicMode === "prisma",
    `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=${publicMode ?? "(unset)"} — must be prisma for browser cutover`,
  );

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

  assert("flag_api_enabled", api, "API must be ON under prisma (or unset → default ON)");
  assert("flag_dual_write", dual, "Dual-write must be ON under prisma");
  assert("flag_port_runtime", port, "Port runtime must be ON under prisma");
  assert("flag_consumer_opportunity", opp, "Opportunity consumer must be ON under prisma");
  assert("flag_consumer_loan_workspace", loan, "Loan Workspace consumer must be ON under prisma");

  // Explicit false on operational flags = rollback; gate fails production cutover
  assert(
    "no_explicit_api_false",
    !envFalse("DEAL_REGISTRY_API_ENABLED") && !envFalse("NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED"),
    "DEAL_REGISTRY_API_ENABLED=false blocks operational cutover",
  );
  assert(
    "no_explicit_port_false",
    !envFalse("DEAL_REGISTRY_PORT_RUNTIME") &&
      !envFalse("NEXT_PUBLIC_DEAL_REGISTRY_PORT_RUNTIME"),
    "DEAL_REGISTRY_PORT_RUNTIME=false blocks operational cutover",
  );

  if (!process.env.DATABASE_URL) {
    assert("database_url", false, "DATABASE_URL required for prisma Deal Registry CRUD gate");
  }

  const crud = spawnSync(
    process.execPath,
    [path.join(__dirname, "co-p0-001-deal-integrity-crud.cjs")],
    {
      env: process.env,
      encoding: "utf8",
    },
  );
  if (crud.stdout) process.stdout.write(crud.stdout);
  if (crud.stderr) process.stderr.write(crud.stderr);
  assert("crud_integrity", crud.status === 0, `crud exit=${crud.status}`);

  // Confirm table is reachable and SSOT table exists
  const prisma = new PrismaClient();
  try {
    const count = await prisma.enterpriseDeal.count();
    assert("enterprise_deals_reachable", typeof count === "number", `count=${count}`);
  } finally {
    await prisma.$disconnect();
  }

  console.log(
    JSON.stringify({
      ok: true,
      incident: "CO-P0-002",
      phase: "B_operational_cutover",
      message:
        "Enterprise Deal Registry operational cutover gate passed — default runtime is Postgres",
    }),
  );
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, step: "gate_crash", error: e.message }));
  process.exit(1);
});
