/**
 * CO-ARCH-001-I5a — Reference Master port verification runner.
 */
import {
  configureReferenceMasterPorts,
  getReferenceMasterPort,
  isEnterpriseMastersDualReadEnabled,
  isReferenceMasterPortRuntimeActive,
} from "@/lib/enterprise-master-data";
import { syncReferenceMasterPortsFromPrisma } from "@/lib/enterprise-master-data/sync-from-prisma";
import { setReferenceMasterDomainCache } from "@/lib/enterprise-master-data/ports/cache-store";

const results: Array<{ ok: boolean; label: string; detail?: string }> = [];

function pass(label: string, detail = "") {
  results.push({ ok: true, label, detail });
  console.log(`  OK  ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label: string, detail = "") {
  results.push({ ok: false, label, detail });
  console.error(` FAIL ${label}${detail ? ` — ${detail}` : ""}`);
}

async function runPortSmoke() {
  configureReferenceMasterPorts();
  const port = getReferenceMasterPort();
  const before = port.listOptions("industry");
  const codes = new Set(before.map((o) => o.id.toLowerCase()));

  setReferenceMasterDomainCache("industry", [
    {
      id: "db-industry-001",
      organizationId: "org",
      domain: "industry",
      code: "fintech-new",
      label: "Fintech (DB only)",
      sortOrder: 50,
      status: "active",
      enabled: true,
      versionNumber: 1,
      isDeleted: false,
      approvalStatus: "none",
      createdBy: "test",
      modifiedBy: "test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const after = port.listOptions("industry");
  if (!after.find((o) => o.id === "fintech-new")) {
    throw new Error("Dual-read did not surface DB-only industry row");
  }
  for (const code of codes) {
    if (!after.some((o) => o.id.toLowerCase() === code)) {
      throw new Error(`Dual-read dropped constants code: ${code}`);
    }
  }
}

async function main() {
  console.log("\n=== CO-ARCH-001-I5a Reference Master Ports Verification ===\n");

  if (isEnterpriseMastersDualReadEnabled()) pass("Dual-read flag enabled");
  else fail("Dual-read flag enabled");

  if (!isReferenceMasterPortRuntimeActive()) pass("Runtime port swap disabled (I6 gate)");
  else fail("Runtime port swap disabled (I6 gate)");

  configureReferenceMasterPorts();
  const port = getReferenceMasterPort();
  pass("Reference master port configured");

  const employment = port.listOptions("employment_type");
  if (Array.isArray(employment) && employment.length >= 6) {
    pass("Constants port employment_type", `${employment.length} options`);
  } else {
    fail("Constants port employment_type");
  }

  try {
    const synced = await syncReferenceMasterPortsFromPrisma();
    if (synced > 0) pass("Prisma hydration", `${synced} rows cached`);
    else fail("Prisma hydration", "zero rows");

    const merged = port.listOptions("country");
    const hasIndia = merged.some((o) => o.id.toLowerCase() === "in");
    if (hasIndia) pass("Dual-read country includes IN");
    else fail("Dual-read country includes IN");
  } catch (err) {
    fail("Prisma hydration", err instanceof Error ? err.message : "failed");
  }

  try {
    await runPortSmoke();
    pass("Dual-read merge smoke");
  } catch (err) {
    fail("Dual-read merge smoke", err instanceof Error ? err.message : "failed");
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
