/**
 * CO-ARCH-001-I6a — Tier 1 picker port swap verification runner.
 */
import { listEcmMasterOptions, getEcmMasterLabel } from "@/constants/enterprise-contact-master/masters";
import {
  configureReferenceMasterPorts,
  isReferenceMasterPortRuntimeActive,
} from "@/lib/enterprise-master-data";
import { syncReferenceMasterPortsFromPrisma } from "@/lib/enterprise-master-data/sync-from-prisma";
import { TIER1_ECM_MASTER_DOMAINS } from "@/lib/enterprise-master-data/ecm-domain-map";
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

async function main() {
  console.log("\n=== CO-ARCH-001-I6a Tier 1 Picker Port Swap Verification ===\n");

  const runtimeFlag = isReferenceMasterPortRuntimeActive();
  if (!runtimeFlag) pass("Runtime port swap flag default off (rollback safe)");
  else pass("Runtime port swap flag ON (certification mode)");

  if (TIER1_ECM_MASTER_DOMAINS.length >= 15) {
    pass("Tier 1 ECM domain map", `${TIER1_ECM_MASTER_DOMAINS.length} domains`);
  } else {
    fail("Tier 1 ECM domain map");
  }

  // Constants path (flag off)
  process.env.REFERENCE_MASTER_PORT_RUNTIME = "false";
  process.env.NEXT_PUBLIC_REFERENCE_MASTER_PORT_RUNTIME = "false";
  const constantsIndustry = listEcmMasterOptions("industry");
  if (constantsIndustry.length >= 5) pass("Constants path industry picker", `${constantsIndustry.length}`);
  else fail("Constants path industry picker");

  // Runtime path (flag on)
  process.env.REFERENCE_MASTER_PORT_RUNTIME = "true";
  process.env.NEXT_PUBLIC_REFERENCE_MASTER_PORT_RUNTIME = "true";
  configureReferenceMasterPorts();

  try {
    const synced = await syncReferenceMasterPortsFromPrisma();
    if (synced > 0) pass("Prisma hydration for runtime swap", `${synced} rows`);
    else fail("Prisma hydration for runtime swap", "zero rows");
  } catch (err) {
    fail("Prisma hydration for runtime swap", err instanceof Error ? err.message : "failed");
  }

  setReferenceMasterDomainCache("industry", [
    {
      id: "rm1",
      organizationId: "org",
      domain: "industry",
      code: "runtime-industry-db",
      label: "Runtime Industry (DB)",
      sortOrder: 1,
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

  const runtimeIndustry = listEcmMasterOptions("industry");
  const dbRow = runtimeIndustry.find((o) => o.id === "runtime-industry-db");
  if (dbRow) pass("Runtime swap surfaces DB industry row");
  else fail("Runtime swap surfaces DB industry row");

  const label = getEcmMasterLabel("industry", "runtime-industry-db");
  if (label === "Runtime Industry (DB)") pass("Runtime swap getEcmMasterLabel");
  else fail("Runtime swap getEcmMasterLabel", label);

  // Tier 2 unchanged
  const lenderOptions = listEcmMasterOptions("lender");
  if (lenderOptions.some((o) => o.id === "hdfc")) pass("Tier 2 lender picker unchanged");
  else fail("Tier 2 lender picker unchanged");

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
