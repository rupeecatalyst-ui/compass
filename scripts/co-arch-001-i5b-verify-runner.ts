/**
 * CO-ARCH-001-I5b — Tier 2 registry port verification runner.
 */
import {
  configureTier2RegistryPorts,
  getDocumentRegistryPort,
  getLenderRegistryPort,
  getProductRegistryPort,
} from "@/lib/enterprise-tier2-ports";
import { syncTier2RegistryPortsFromPrisma } from "@/lib/enterprise-tier2-ports/sync-from-prisma";
import { isEnterpriseMastersDualReadEnabled } from "@/constants/enterprise-master-data/dual-read";
import {
  setProductRegistryCache,
} from "@/lib/enterprise-tier2-ports/ports/cache-store";

const results: Array<{ ok: boolean; label: string; detail?: string }> = [];

function pass(label: string, detail = "") {
  results.push({ ok: true, label, detail });
  console.log(`  OK  ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label: string, detail = "") {
  results.push({ ok: false, label, detail });
  console.error(` FAIL ${label}${detail ? ` — ${detail}` : ""}`);
}

async function runDualReadSmoke() {
  setProductRegistryCache({
    categories: [],
    groups: [],
    products: [
      {
        id: "p1",
        organizationId: "org",
        categoryId: "c1",
        groupId: "g1",
        code: "DB_ONLY_PRODUCT",
        label: "DB Only Product",
        lifecycleStatus: "draft",
        operationalStatus: "inactive",
        majorVersion: 1,
        minorVersion: 0,
        tags: null,
        productOwner: null,
        status: "active",
        enabled: true,
        versionNumber: 1,
        isDeleted: false,
        approvalStatus: "none",
        createdBy: "t",
        modifiedBy: "t",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  const products = getProductRegistryPort().listProducts(undefined);
  if (!products.some((p) => p.id === "DB_ONLY_PRODUCT")) {
    throw new Error("Dual-read did not surface DB-only product");
  }
}

async function main() {
  console.log("\n=== CO-ARCH-001-I5b Tier 2 Registry Ports Verification ===\n");

  if (isEnterpriseMastersDualReadEnabled()) pass("Dual-read flag enabled");
  else fail("Dual-read flag enabled");

  configureTier2RegistryPorts();
  pass("Tier 2 ports configured");

  const productPort = getProductRegistryPort();
  const categories = productPort.listCategories();
  if (categories.length > 0) pass("Product constants port categories", `${categories.length}`);
  else fail("Product constants port categories");

  const docPort = getDocumentRegistryPort();
  const docTypes = docPort.listTypes();
  if (docTypes.length >= 5) pass("Document constants port types", `${docTypes.length}`);
  else fail("Document constants port types");

  const lenderPort = getLenderRegistryPort();
  const lenders = lenderPort.listLenders("bank");
  if (lenders.length >= 1) pass("Lender constants port lenders", `${lenders.length}`);
  else fail("Lender constants port lenders");

  try {
    const synced = await syncTier2RegistryPortsFromPrisma();
    pass("Prisma Tier 2 hydration", `${synced} rows cached`);
  } catch (err) {
    fail("Prisma Tier 2 hydration", err instanceof Error ? err.message : "failed");
  }

  try {
    await runDualReadSmoke();
    pass("Product dual-read merge smoke");
  } catch (err) {
    fail("Product dual-read merge smoke", err instanceof Error ? err.message : "failed");
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
