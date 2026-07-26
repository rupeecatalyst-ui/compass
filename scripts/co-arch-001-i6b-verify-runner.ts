/**
 * CO-ARCH-001-I6b — Tier 2 picker port swap verification runner.
 */
import {
  getEcmMasterLabel,
  listEcmMasterOptions,
} from "@/constants/enterprise-contact-master/masters";
import { isTier2RegistryPortRuntimeActive } from "@/constants/enterprise-master-data/dual-read";
import {
  configureTier2RegistryPorts,
  getDocumentRegistryPort,
  resetTier2RegistryPorts,
} from "@/lib/enterprise-tier2-ports";
import { setProductRegistryCache } from "@/lib/enterprise-tier2-ports/ports/cache-store";

const results: Array<{ ok: boolean; label: string; detail?: string }> = [];

function pass(label: string, detail = "") {
  results.push({ ok: true, label, detail });
  console.log(`  OK  ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label: string, detail = "") {
  results.push({ ok: false, label, detail });
  console.error(` FAIL ${label}${detail ? ` — ${detail}` : ""}`);
}

function setRuntimeFlag(on: boolean) {
  const value = on ? "true" : "false";
  process.env.TIER2_REGISTRY_PORT_RUNTIME = value;
  process.env.NEXT_PUBLIC_TIER2_REGISTRY_PORT_RUNTIME = value;
  resetTier2RegistryPorts();
  configureTier2RegistryPorts();
}

async function main() {
  console.log("\n=== CO-ARCH-001-I6b Tier 2 Picker Port Swap Verification ===\n");

  // Ensure flag starts OFF for default check
  delete process.env.TIER2_REGISTRY_PORT_RUNTIME;
  delete process.env.NEXT_PUBLIC_TIER2_REGISTRY_PORT_RUNTIME;
  if (!isTier2RegistryPortRuntimeActive()) {
    pass("Runtime port swap flag default off (rollback safe)");
  } else {
    fail("Runtime port swap flag default off (rollback safe)");
  }

  setRuntimeFlag(false);
  const constantsProduct = listEcmMasterOptions("product");
  if (constantsProduct.some((o) => o.id === "home-loan")) {
    pass("Constants path product picker", `${constantsProduct.length}`);
  } else {
    fail("Constants path product picker");
  }

  const constantsLender = listEcmMasterOptions("lender");
  if (constantsLender.some((o) => o.id === "hdfc")) {
    pass("Constants path lender picker", `${constantsLender.length}`);
  } else {
    fail("Constants path lender picker");
  }

  setRuntimeFlag(true);
  if (isTier2RegistryPortRuntimeActive()) pass("Runtime port swap flag ON");
  else fail("Runtime port swap flag ON");

  setProductRegistryCache({
    categories: [],
    groups: [],
    products: [
      {
        id: "p-runtime",
        organizationId: "org",
        categoryId: "c1",
        groupId: "g1",
        code: "runtime-product-db",
        label: "Runtime Product (DB)",
        lifecycleStatus: "published",
        operationalStatus: "active",
        majorVersion: 1,
        minorVersion: 0,
        tags: null,
        productOwner: null,
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
    ],
  });

  const runtimeProducts = listEcmMasterOptions("product");
  const dbRow = runtimeProducts.find((o) => o.id === "runtime-product-db");
  if (dbRow) pass("Runtime swap surfaces DB-only product via listEcmMasterOptions");
  else fail("Runtime swap surfaces DB-only product via listEcmMasterOptions");

  const label = getEcmMasterLabel("product", "runtime-product-db");
  if (label === "Runtime Product (DB)") pass("Runtime swap getEcmMasterLabel for product");
  else fail("Runtime swap getEcmMasterLabel for product", label);

  const docTypes = getDocumentRegistryPort().listTypes();
  if (docTypes.length >= 5) pass("Document port listTypes when flag on", `${docTypes.length}`);
  else fail("Document port listTypes when flag on");

  setRuntimeFlag(false);
  const rolledBack = listEcmMasterOptions("product");
  if (
    rolledBack.some((o) => o.id === "home-loan") &&
    !rolledBack.some((o) => o.id === "runtime-product-db")
  ) {
    pass("Rollback: flag off restores constants product picker");
  } else {
    fail("Rollback: flag off restores constants product picker");
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

