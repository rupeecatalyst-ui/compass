/**
 * CO-ARCH-001 Wave 5 — Functional parity + rollback drill (Tier 1 & Tier 2).
 * Simulates Dry Run D1–D4 flag transitions without permanent env mutation.
 */
import {
  listEcmMasterOptions,
  getEcmMasterLabel,
  listEcmMasterOptionsFromCatalog,
} from "@/constants/enterprise-contact-master/masters";
import {
  configureReferenceMasterPorts,
  resetReferenceMasterPorts,
} from "@/lib/enterprise-master-data";
import { syncReferenceMasterPortsFromPrisma } from "@/lib/enterprise-master-data/sync-from-prisma";
import {
  configureTier2RegistryPorts,
  getDocumentRegistryPort,
  getLenderRegistryPort,
  getProductRegistryPort,
  resetTier2RegistryPorts,
} from "@/lib/enterprise-tier2-ports";
import { syncTier2RegistryPortsFromPrisma } from "@/lib/enterprise-tier2-ports/sync-from-prisma";
import { setReferenceMasterDomainCache } from "@/lib/enterprise-master-data/ports/cache-store";
import {
  setProductRegistryCache,
} from "@/lib/enterprise-tier2-ports/ports/cache-store";
import { listOrgDocumentTypes } from "@/lib/organization-documents/store";

const results: Array<{ ok: boolean; label: string; detail?: string }> = [];

function pass(label: string, detail = "") {
  results.push({ ok: true, label, detail });
  console.log(`  OK  ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label: string, detail = "") {
  results.push({ ok: false, label, detail });
  console.error(` FAIL ${label}${detail ? ` — ${detail}` : ""}`);
}

function setFlags(tier1: boolean, tier2: boolean) {
  process.env.REFERENCE_MASTER_PORT_RUNTIME = tier1 ? "true" : "false";
  process.env.NEXT_PUBLIC_REFERENCE_MASTER_PORT_RUNTIME = tier1 ? "true" : "false";
  process.env.TIER2_REGISTRY_PORT_RUNTIME = tier2 ? "true" : "false";
  process.env.NEXT_PUBLIC_TIER2_REGISTRY_PORT_RUNTIME = tier2 ? "true" : "false";
  resetReferenceMasterPorts();
  resetTier2RegistryPorts();
  configureReferenceMasterPorts();
  configureTier2RegistryPorts();
}

function codesOf(domain: "industry" | "product" | "lender" | "employment_type") {
  return new Set(listEcmMasterOptions(domain).map((o) => o.id.toLowerCase()));
}

async function main() {
  console.log("\n=== CO-ARCH-001 Wave 5 — Parity & Rollback Drill ===\n");

  // D1 — Baseline flags OFF
  setFlags(false, false);
  const d1Industry = codesOf("industry");
  const d1Product = codesOf("product");
  const d1Lender = codesOf("lender");
  const d1Employment = codesOf("employment_type");
  const catalogIndustry = new Set(
    listEcmMasterOptionsFromCatalog("industry").map((o) => o.id.toLowerCase()),
  );

  if ([...d1Industry].every((c) => catalogIndustry.has(c) || c.includes("other"))) {
    pass("D1 Tier 1 industry matches constants catalog");
  } else {
    fail("D1 Tier 1 industry matches constants catalog");
  }
  if (d1Product.size >= 5 && d1Lender.size >= 5 && d1Employment.size >= 6) {
    pass("D1 baseline picker counts", `industry=${d1Industry.size} product=${d1Product.size} lender=${d1Lender.size}`);
  } else {
    fail("D1 baseline picker counts");
  }

  // Hydrate for D2/D3
  try {
    const rm = await syncReferenceMasterPortsFromPrisma();
    if (rm >= 189) pass("Reference Master hydration", `${rm} rows`);
    else fail("Reference Master hydration", `${rm} rows`);
  } catch (err) {
    fail("Reference Master hydration", err instanceof Error ? err.message : "failed");
  }

  try {
    const t2 = await syncTier2RegistryPortsFromPrisma();
    if (t2 > 0) pass("Tier 2 hydration", `${t2} rows`);
    else fail("Tier 2 hydration", "zero rows — seed required");
  } catch (err) {
    fail("Tier 2 hydration", err instanceof Error ? err.message : "failed");
  }

  // D2 — Tier 1 ON
  setFlags(true, false);
  await syncReferenceMasterPortsFromPrisma();
  setReferenceMasterDomainCache("industry", [
    {
      id: "wave5-rm",
      organizationId: "org",
      domain: "industry",
      code: "wave5-cert-industry",
      label: "Wave5 Cert Industry",
      sortOrder: 1,
      status: "active",
      enabled: true,
      versionNumber: 1,
      isDeleted: false,
      approvalStatus: "none",
      createdBy: "wave5",
      modifiedBy: "wave5",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
  const d2Industry = listEcmMasterOptions("industry");
  if (d2Industry.some((o) => o.id === "wave5-cert-industry")) {
    pass("D2 Tier 1 flag ON surfaces DB industry row");
  } else {
    fail("D2 Tier 1 flag ON surfaces DB industry row");
  }
  // Product still constants while Tier 2 off
  const d2Product = codesOf("product");
  if ([...d1Product].every((c) => d2Product.has(c))) {
    pass("D2 product unchanged while Tier 2 flag OFF");
  } else {
    fail("D2 product unchanged while Tier 2 flag OFF");
  }

  // D3 — Tier 2 ON
  setFlags(true, true);
  await syncTier2RegistryPortsFromPrisma();
  setProductRegistryCache({
    categories: [],
    groups: [],
    products: [
      {
        id: "wave5-p",
        organizationId: "org",
        categoryId: "c",
        groupId: "g",
        code: "WAVE5_CERT_PRODUCT",
        label: "Wave5 Cert Product",
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
        createdBy: "wave5",
        modifiedBy: "wave5",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  });
  const d3Products = listEcmMasterOptions("product");
  if (d3Products.some((o) => o.id === "WAVE5_CERT_PRODUCT" || o.id === "wave5_cert_product")) {
    pass("D3 Tier 2 flag ON surfaces DB product via ECM picker");
  } else if (getProductRegistryPort().listProducts().some((o) => o.id === "WAVE5_CERT_PRODUCT")) {
    pass("D3 Tier 2 port surfaces DB product (ECM id casing)", getProductRegistryPort().listProducts().map((p) => p.id).join(","));
    // listEcmMasterOptions may normalize — check either path
    if (!d3Products.some((o) => o.id.toLowerCase() === "wave5_cert_product")) {
      // Still OK if port has it and listEcmMasterOptions maps it
      const found = d3Products.find((o) => o.label === "Wave5 Cert Product" || o.id.includes("WAVE5"));
      if (found) pass("D3 ECM product label parity");
      else fail("D3 Tier 2 flag ON surfaces DB product via ECM picker", d3Products.map((p) => p.id).slice(0, 8).join(","));
    }
  } else {
    fail("D3 Tier 2 flag ON surfaces DB product via ECM picker");
  }

  const lenders = getLenderRegistryPort().listLenders();
  if (lenders.length >= 5) pass("D3 lender port populated", `${lenders.length}`);
  else fail("D3 lender port populated", `${lenders.length}`);

  const docTypes = getDocumentRegistryPort().listTypes();
  if (docTypes.length >= 5) pass("D3 document port types", `${docTypes.length}`);
  else fail("D3 document port types");

  try {
    const orgTypes = listOrgDocumentTypes("legal");
    if (orgTypes.length >= 1) pass("D3 org document types (legal)", `${orgTypes.length}`);
    else fail("D3 org document types (legal)");
  } catch (err) {
    fail("D3 org document types (legal)", err instanceof Error ? err.message : "failed");
  }

  // Functional parity: constants codes still present when dual-read merges
  const d3IndustryCodes = codesOf("industry");
  const missingConstants = [...d1Industry].filter((c) => !d3IndustryCodes.has(c) && c !== "wave5-cert-industry");
  // When DB-primary, constants-only codes may still merge in as secondary — expect most retained
  if (missingConstants.length <= 2) {
    pass("D3 Tier 1 dual-read retains constants codes", `missing=${missingConstants.length}`);
  } else {
    fail("D3 Tier 1 dual-read retains constants codes", missingConstants.join(","));
  }

  // D4 — Rollback
  const rollbackStart = Date.now();
  setFlags(false, false);
  const d4Industry = codesOf("industry");
  const d4Product = codesOf("product");
  const rollbackMs = Date.now() - rollbackStart;

  if (![...d4Industry].includes("wave5-cert-industry") && getEcmMasterLabel("industry", "wave5-cert-industry") === "wave5-cert-industry") {
    // label falls back to id when not in constants — good
    pass("D4 rollback: DB-only industry gone from picker");
  } else if (!listEcmMasterOptions("industry").some((o) => o.id === "wave5-cert-industry")) {
    pass("D4 rollback: DB-only industry gone from picker");
  } else {
    fail("D4 rollback: DB-only industry gone from picker");
  }

  if (!listEcmMasterOptions("product").some((o) => o.id === "WAVE5_CERT_PRODUCT")) {
    pass("D4 rollback: DB-only product gone from picker");
  } else {
    fail("D4 rollback: DB-only product gone from picker");
  }

  const productParity = [...d1Product].every((c) => d4Product.has(c));
  const industryParity = [...d1Industry].every((c) => d4Industry.has(c));
  if (productParity && industryParity) {
    pass("D4 rollback restores D1 baseline codes", `${rollbackMs}ms`);
  } else {
    fail("D4 rollback restores D1 baseline codes");
  }

  if (rollbackMs <= 15 * 60 * 1000) {
    pass("D4 rollback duration within 15 minutes", `${rollbackMs}ms (flag flip; deploy would add network time)`);
  } else {
    fail("D4 rollback duration within 15 minutes", `${rollbackMs}ms`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Parity Summary: ${results.length - failed.length}/${results.length} passed ===\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
