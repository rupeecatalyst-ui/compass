/**
 * Emit Product Owner markdown list from live JSON dump.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function readJson(rel) {
  let raw = fs.readFileSync(path.join(root, rel), "utf8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw);
}

const j = readJson("docs/co-hl-program-001/HOME-LOAN-ELIGIBLE-LENDERS-LIVE.json");

const lines = [];
lines.push("# CO-HL-PROGRAM-001 — Home Loan Eligible Institutions (Live)");
lines.push("");
lines.push(
  "**Status:** Awaiting Product Owner priority order · **Do not deploy** until PO approval",
);
lines.push("");
lines.push("## Source of truth");
lines.push("");
lines.push("- Enterprise Lender Registry (enabled, not deleted)");
lines.push("- Product–Lender Matrix via `productsSupported` family `HOME_LOAN`");
lines.push("- No new/duplicate/seed lenders created in this step");
lines.push("- Home Loan selection priority: **not set** (null) — awaiting PO order");
lines.push("");
lines.push("## Counts");
lines.push("");
lines.push("| Metric | Value |");
lines.push("|---|---:|");
lines.push(`| Enabled lenders in registry | ${j.totalEnabledLenders} |`);
lines.push(`| Home Loan mapped (eligible) | ${j.homeLoanMappedCount} |`);
lines.push("| Sort | Institution Name ascending |");
lines.push("");
lines.push(
  "## Complete list (Institution Name · Type · Code · Active · HL Mapped · Existing HL Programs · Priority)",
);
lines.push("");
lines.push(
  "| # | Institution Name | Institution Type | Lender Code | Active / Inactive | HL Mapped | Existing Home Loan Programs | Current Priority |",
);
lines.push("|---:|---|---|---|---|---|---|---|");

for (let i = 0; i < j.lenders.length; i++) {
  const r = j.lenders[i];
  const programs =
    (r.existingHomeLoanPrograms || []).length > 0
      ? r.existingHomeLoanPrograms.join("; ").replace(/\|/g, "/")
      : "—";
  lines.push(
    `| ${i + 1} | ${r.institutionName} | ${String(r.institutionType).replace(/_/g, " ")} | ${r.lenderCode} | ${r.activeInactive} | ${r.homeLoanMapped} | ${programs} | — (awaiting PO) |`,
  );
}

lines.push("");
lines.push("## Product Owner next step");
lines.push("");
lines.push("Provide the desired priority order (1 = highest). Example format:");
lines.push("");
lines.push("1. HDFC Bank");
lines.push("2. ICICI Bank");
lines.push("3. …");
lines.push("");
lines.push(
  "After confirmation, priority will be saved to `enterprise_product_lender_priorities` without changing lender identity, codes, or Product–Lender mapping.",
);
lines.push("");
lines.push("## PO desk (local, after migrate)");
lines.push("");
lines.push("- Route: `/admin/home-loan-lender-priority`");
lines.push("- API: `GET/PUT /api/admin/home-loan-lender-priority`");
lines.push("");
lines.push("## Explicit non-goals (this step)");
lines.push("");
lines.push("- Do **not** create Home Loan programs yet");
lines.push("- Do **not** deploy to Vercel until PO approval");
lines.push("");

const out = path.join(
  root,
  "docs/co-hl-program-001/CO-HL-PROGRAM-001-HOME-LOAN-ELIGIBLE-LENDERS.md",
);
fs.writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Wrote ${out} (${j.lenders.length} lenders)`);
