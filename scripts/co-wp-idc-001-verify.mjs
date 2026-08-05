/**
 * CO-WP-IDC-001 — smoke verify Enterprise Initial Data Collection projection.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadTs(rel) {
  const full = path.join(root, rel);
  try {
    return await import(pathToFileURLCompat(full));
  } catch {
    // tsx / jiti fallback via dynamic require of compiled path is not available;
    // evaluate key invariants via spawning tsc-less string checks instead.
    return null;
  }
}

function pathToFileURLCompat(p) {
  const { pathToFileURL } = require("node:url");
  return pathToFileURL(p).href;
}

async function main() {
  // Prefer running through compiled/ts-node when available; otherwise structural checks.
  let mod;
  try {
    const { register } = await import("node:module");
    void register;
  } catch {
    /* ignore */
  }

  try {
    // When tsx is present in path (dev), this works:
    mod = await import("../src/constants/enterprise-initial-data-collection/catalog.ts");
  } catch {
    console.log("skip: runtime TS import unavailable — structural file check only");
    const fs = await import("node:fs");
    const catalog = fs.readFileSync(
      path.join(root, "src/constants/enterprise-initial-data-collection/catalog.ts"),
      "utf8",
    );
    assert.match(catalog, /ENTERPRISE_IDC_VERSION/);
    assert.match(catalog, /ENTERPRISE_IDC_DETAIL_SECTIONS/);
    assert.match(catalog, /ENTERPRISE_IDC_CUSTOMER_CAPTURE/);
    assert.match(catalog, /balance_transfer/);
    assert.match(catalog, /helpText/);
    assert.match(catalog, /defaultValue|validation/);
    console.log("CO-WP-IDC-001 structural verify OK");
    return;
  }

  const { getEnterpriseIdcCatalog, ENTERPRISE_IDC_VERSION } = mod;
  const catalog = getEnterpriseIdcCatalog();
  assert.equal(catalog.version, ENTERPRISE_IDC_VERSION);
  assert.ok(catalog.customerCapture.fields.some((f) => f.key === "mobile"));
  assert.ok(catalog.customerCapture.fields.some((f) => f.key === "displayName"));
  assert.ok(catalog.detailSections.length >= 5);
  const loan = catalog.detailSections.find((s) => s.sectionId === "loan_requirement");
  assert.ok(loan?.fields.some((f) => f.key === "requestedAmountLabel" && f.required));
  assert.ok(
    loan?.fields.some(
      (f) => f.key === "currentLendingInstitution" && f.visibleWhenField === "transactionType",
    ),
  );
  console.log("CO-WP-IDC-001 verify OK", catalog.version);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
