/**
 * P0 Stabilization Phase 1 — prove live-search hydrate does not bump registryVersion.
 * Run: npx tsx scripts/co-arch-003-p0-phase1-notify-silent-verify.ts
 */
import { createRequire } from "node:module";

// Use path aliases via dynamic import after ensuring tsx resolves @/
async function main() {
  const { getEcmContactRegistryVersion, notifyEcmContactRegistryChanged } =
    await import("../src/lib/enterprise-contact-master/contact-change-bus.ts");
  const { upsertEcmCompanyLocal } = await import(
    "../src/lib/enterprise-company-master/company-registry.ts"
  );
  const { getEcmPorts } = await import(
    "../src/lib/enterprise-contact-master/composition.ts"
  );

  const before = getEcmContactRegistryVersion();

  // Silent company hydrate (Phase 1 path)
  upsertEcmCompanyLocal(
    {
      id: "verify-silent-co",
      companyName: "Silent Hydrate Co",
      status: "active",
      enabled: true,
      companyScore: 0,
      createdBy: "phase1-verify",
      createdOn: new Date().toISOString(),
      modifiedBy: "phase1-verify",
      modifiedOn: new Date().toISOString(),
    },
    { silent: true },
  );
  const afterSilent = getEcmContactRegistryVersion();

  // Contact save alone (live-search no longer notifies)
  getEcmPorts().contacts.save({
    id: "verify-silent-ct",
    name: "Silent Hydrate Contact",
    mobilePrimary: "9876543210",
    primaryRole: "customer",
    roles: ["customer"],
    status: "active",
    enabled: true,
    createdBy: "phase1-verify",
    createdOn: new Date().toISOString(),
    modifiedBy: "phase1-verify",
    modifiedOn: new Date().toISOString(),
  } as never);
  const afterContactSave = getEcmContactRegistryVersion();

  // Control: real notify still works
  notifyEcmContactRegistryChanged();
  const afterNotify = getEcmContactRegistryVersion();

  const checks = [
    {
      name: "silent company upsert does not bump version",
      ok: afterSilent === before,
      detail: `${before} → ${afterSilent}`,
    },
    {
      name: "contact save alone does not bump version",
      ok: afterContactSave === before,
      detail: `${before} → ${afterContactSave}`,
    },
    {
      name: "explicit notify still bumps version",
      ok: afterNotify === before + 1,
      detail: `${before} → ${afterNotify}`,
    },
  ];

  let failed = 0;
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} — ${c.name} (${c.detail})`);
    if (!c.ok) failed += 1;
  }

  // Confirm live-search source no longer imports/calls notify
  const require = createRequire(import.meta.url);
  const fs = require("node:fs");
  const path = require("node:path");
  const liveSearch = fs.readFileSync(
    path.resolve("src/lib/enterprise-registry/live-search.ts"),
    "utf8",
  );
  const noNotifyImport = !liveSearch.includes("notifyEcmContactRegistryChanged");
  const silentUpsert = liveSearch.includes("silent: true");
  const warmDepsUntouched = (() => {
    const picker = fs.readFileSync(
      path.resolve("src/components/catalyst-one/shared/live-entity-master-search.tsx"),
      "utf8",
    );
    return picker.includes("[warmOnMount, kind, registryVersion]");
  })();

  console.log(
    `${noNotifyImport ? "PASS" : "FAIL"} — live-search does not reference notifyEcmContactRegistryChanged`,
  );
  console.log(`${silentUpsert ? "PASS" : "FAIL"} — live-search uses silent company upsert`);
  console.log(
    `${warmDepsUntouched ? "PASS" : "FAIL"} — LiveEntityMasterSearch warm deps unchanged (Phase 1)`,
  );
  if (!noNotifyImport || !silentUpsert || !warmDepsUntouched) failed += 1;

  console.log(`\nTOTAL: ${failed === 0 ? "PASS" : "FAIL"}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
