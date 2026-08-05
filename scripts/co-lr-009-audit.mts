/**
 * CO-LR-009 — Read-only Enterprise Lender Registry Completeness Audit.
 * NEVER mutates DB. Catalogue analysis + optional Prisma SELECT inventory.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/co-lr-009-audit.mts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import {
  LENDER_MASTER_SEED_CATALOG,
  countLenderMasterSeedByClassification,
} from "../src/constants/enterprise-lender-registry/master-seed-catalog";
import {
  dedupeLendersForSelection,
  resolveLenderSelectionFamilyKey,
} from "../src/lib/enterprise-lender-registry/presentation-canonical";
import { LENDER_MASTER_CLASSIFICATION_LABELS } from "../src/types/enterprise-lender-registry";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "co-lr-009");
const outJson = path.join(outDir, "CO-LR-009-AUDIT-INVENTORY.json");
const outMd = path.join(outDir, "CO-LR-009-LENDER-REGISTRY-COMPLETENESS-AUDIT.md");

const CLASS_ORDER = [
  "public_sector_bank",
  "private_sector_bank",
  "small_finance_bank",
  "housing_finance_company",
  "nbfc",
  "foreign_bank",
  "cooperative_bank",
  "payments_bank",
] as const;

function normalizeLoose(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function extractSeedKey(tags: string[] | null | undefined, code?: string | null) {
  const tag = (tags ?? []).find((t) => t.startsWith("seed:"));
  if (tag) return tag.slice("seed:".length).trim().toLowerCase();
  // Some rows store seedKey as shortName or code-like token
  return null;
}

/** Catalogue inventory (approved Enterprise Lender Master). */
const catalog = LENDER_MASTER_SEED_CATALOG.map((row) => ({
  seedKey: row.seedKey,
  legalName: row.legalName,
  displayName: row.displayName,
  shortName: row.shortName,
  aliases: row.aliases ?? [],
  classification: row.classification,
  classificationLabel:
    LENDER_MASTER_CLASSIFICATION_LABELS[row.classification] ?? row.classification,
  institutionCategory: row.institutionCategory,
  categoryCode: row.categoryCode ?? row.institutionCategory,
  productsSupported: [...(row.productsSupported ?? [])],
  productCount: (row.productsSupported ?? []).length,
}));

const catalogByClass = countLenderMasterSeedByClassification();
const catalogSeedKeys = new Set(catalog.map((c) => c.seedKey));

/** Presentation-family collisions inside catalogue (alias/name overlap). */
const catalogFamilyMap = new Map<string, typeof catalog>();
for (const row of catalog) {
  const family = resolveLenderSelectionFamilyKey({
    label: row.displayName,
    displayName: row.displayName,
    legalName: row.legalName,
    shortName: row.shortName,
    aliases: row.aliases,
    code: row.seedKey,
  });
  const list = catalogFamilyMap.get(family) ?? [];
  list.push(row);
  catalogFamilyMap.set(family, list);
}
const catalogPresentationFamilies = [...catalogFamilyMap.entries()]
  .filter(([, members]) => members.length > 1)
  .map(([family, members]) => ({
    family,
    members: members.map((m) => ({
      seedKey: m.seedKey,
      displayName: m.displayName,
      classification: m.classification,
    })),
  }));

const catalogDedupeCheck = dedupeLendersForSelection(
  catalog.map((c) => ({
    id: c.seedKey,
    code: c.seedKey,
    label: c.displayName,
    displayName: c.displayName,
    legalName: c.legalName,
    shortName: c.shortName,
    aliases: c.aliases,
    enabled: true,
    defaultRecord: true,
  })),
);

type DbLenderRow = {
  id: string;
  code: string;
  displayName: string;
  legalName: string | null;
  shortName: string | null;
  aliases: string[];
  classification: string | null;
  institutionCategory: string;
  status: string;
  enabled: boolean;
  lifecycleStatus: string;
  operationalStatus: string | null;
  isDeleted: boolean;
  tags: string[];
  createdAt: Date;
  programCount: number;
  activeProgramCount: number;
  productCodes: string[];
};

function isPublishedUiVisible(l: DbLenderRow): boolean {
  if (l.isDeleted) return false;
  if (l.status !== "active") return false;
  if (!l.enabled) return false;
  if (l.lifecycleStatus !== "active") return false;
  if (l.operationalStatus && l.operationalStatus !== "active") return false;
  if (/^bf[_-]/i.test(l.code)) return false;
  return true;
}

function visibilityBlockReason(l: DbLenderRow): string | null {
  if (l.isDeleted) return "soft_deleted";
  if (l.status !== "active") return `status=${l.status}`;
  if (!l.enabled) return "enabled=false";
  if (l.lifecycleStatus !== "active") return `lifecycleStatus=${l.lifecycleStatus}`;
  if (l.operationalStatus && l.operationalStatus !== "active") {
    return `operationalStatus=${l.operationalStatus}`;
  }
  if (/^bf[_-]/i.test(l.code)) return "provisional_bf_code";
  return null;
}

let db: {
  connected: boolean;
  error?: string;
  lenders: DbLenderRow[];
} = { connected: false, lenders: [] };

const prisma = new PrismaClient();
try {
  const rows = await prisma.enterpriseLender.findMany({
    select: {
      id: true,
      code: true,
      label: true,
      displayName: true,
      legalName: true,
      shortName: true,
      aliases: true,
      classification: true,
      institutionCategory: true,
      status: true,
      enabled: true,
      lifecycleStatus: true,
      operationalStatus: true,
      isDeleted: true,
      tags: true,
      createdAt: true,
      programs: {
        where: { isDeleted: false },
        select: {
          id: true,
          enabled: true,
          status: true,
          lifecycleStatus: true,
          productCode: true,
        },
      },
    },
    orderBy: [{ code: "asc" }],
  });

  db = {
    connected: true,
    lenders: rows.map((r) => {
      const programs = r.programs ?? [];
      const activePrograms = programs.filter(
        (p) =>
          p.enabled &&
          p.status === "active" &&
          (p.lifecycleStatus === "active" || !p.lifecycleStatus),
      );
      return {
        id: r.id,
        code: r.code,
        displayName: r.displayName || r.label,
        legalName: r.legalName,
        shortName: r.shortName,
        aliases: Array.isArray(r.aliases) ? r.aliases : [],
        classification: r.classification,
        institutionCategory: String(r.institutionCategory),
        status: String(r.status),
        enabled: Boolean(r.enabled),
        lifecycleStatus: String(r.lifecycleStatus),
        operationalStatus: r.operationalStatus ? String(r.operationalStatus) : null,
        isDeleted: Boolean(r.isDeleted),
        tags: Array.isArray(r.tags) ? r.tags : [],
        createdAt: r.createdAt,
        programCount: programs.length,
        activeProgramCount: activePrograms.length,
        productCodes: [
          ...new Set(
            programs
              .map((p) => p.productCode)
              .filter((c): c is string => typeof c === "string" && c.length > 0),
          ),
        ],
      };
    }),
  };
} catch (err) {
  db = {
    connected: false,
    error: err instanceof Error ? err.message : String(err),
    lenders: [],
  };
} finally {
  await prisma.$disconnect();
}

/** Match DB rows to catalogue seedKeys. */
function resolveDbSeedKey(l: DbLenderRow): string | null {
  const fromTag = extractSeedKey(l.tags, l.code);
  if (fromTag && catalogSeedKeys.has(fromTag)) return fromTag;

  const nameKeys = [
    l.displayName,
    l.legalName,
    l.shortName,
    l.code,
    ...l.aliases,
  ]
    .map(normalizeLoose)
    .filter(Boolean);

  for (const c of catalog) {
    const candidates = [
      c.seedKey,
      c.displayName,
      c.legalName,
      c.shortName,
      ...c.aliases,
    ].map(normalizeLoose);
    if (candidates.some((k) => nameKeys.includes(k))) return c.seedKey;
  }
  return null;
}

const dbMatched = db.lenders.map((l) => {
  const seedKey = resolveDbSeedKey(l);
  const catalogRow = seedKey ? catalog.find((c) => c.seedKey === seedKey) : undefined;
  const missingProducts = catalogRow
    ? catalogRow.productsSupported.filter((p) => !l.productCodes.includes(p))
    : [];
  const block = visibilityBlockReason(l);
  return {
    ...l,
    seedKey,
    catalogMatched: Boolean(catalogRow),
    catalogClassification: catalogRow?.classification ?? null,
    catalogProducts: catalogRow?.productsSupported ?? [],
    missingCatalogProducts: missingProducts,
    uiVisible: isPublishedUiVisible(l),
    uiHiddenReason: block,
  };
});

const matchedSeedKeys = new Set(
  dbMatched.map((l) => l.seedKey).filter((k): k is string => Boolean(k)),
);
const missingFromDb = catalog.filter((c) => !matchedSeedKeys.has(c.seedKey));
const extraInDb = dbMatched.filter((l) => !l.catalogMatched && !l.isDeleted);

/** DB presentation families with >1 non-deleted member. */
const dbFamilyMap = new Map<string, typeof dbMatched>();
for (const l of dbMatched.filter((x) => !x.isDeleted)) {
  const family = resolveLenderSelectionFamilyKey({
    id: l.id,
    code: l.code,
    label: l.displayName,
    displayName: l.displayName,
    legalName: l.legalName,
    shortName: l.shortName,
    aliases: l.aliases,
    enabled: l.enabled,
  });
  const list = dbFamilyMap.get(family) ?? [];
  list.push(l);
  dbFamilyMap.set(family, list);
}
const dbDuplicateFamilies = [...dbFamilyMap.entries()]
  .filter(([, members]) => members.length > 1)
  .map(([family, members]) => ({
    family,
    survivorWouldBe: dedupeLendersForSelection(
      members.map((m) => ({
        id: m.id,
        code: m.code,
        label: m.displayName,
        displayName: m.displayName,
        legalName: m.legalName,
        shortName: m.shortName,
        aliases: m.aliases,
        enabled: m.enabled,
      })),
    )[0]?.id,
    members: members.map((m) => ({
      id: m.id,
      code: m.code,
      displayName: m.displayName,
      seedKey: m.seedKey,
      uiVisible: m.uiVisible,
      uiHiddenReason: m.uiHiddenReason,
    })),
  }));

const dbByClass: Record<string, number> = {};
for (const key of CLASS_ORDER) dbByClass[key] = 0;
for (const l of dbMatched.filter((x) => !x.isDeleted)) {
  const cls =
    l.catalogClassification ||
    l.classification ||
    (l.institutionCategory === "hfc"
      ? "housing_finance_company"
      : l.institutionCategory === "cooperative"
        ? "cooperative_bank"
        : l.institutionCategory === "foreign_bank"
          ? "foreign_bank"
          : l.institutionCategory === "nbfc"
            ? "nbfc"
            : "nbfc");
  dbByClass[cls] = (dbByClass[cls] ?? 0) + 1;
}

const uiVisible = dbMatched.filter((l) => l.uiVisible);
const uiHidden = dbMatched.filter((l) => !l.isDeleted && !l.uiVisible);
const softDeleted = dbMatched.filter((l) => l.isDeleted);
const noPrograms = dbMatched.filter((l) => !l.isDeleted && l.programCount === 0);
const incompletePrograms = dbMatched.filter(
  (l) => !l.isDeleted && l.missingCatalogProducts.length > 0,
);

const inventory = {
  auditId: "CO-LR-009",
  auditedAt: new Date().toISOString(),
  productionDataProtection: {
    mutations: false,
    deletes: false,
    truncates: false,
    mode: "read_only_select",
  },
  approvedMasterCatalog: {
    total: catalog.length,
    byClassification: catalogByClass,
    presentationFamilyCollisions: catalogPresentationFamilies.length,
    afterPresentationDedupe: catalogDedupeCheck.length,
    lenders: catalog,
  },
  liveRegistry: {
    connected: db.connected,
    error: db.error ?? null,
    totalRows: db.lenders.length,
    nonDeleted: db.lenders.filter((l) => !l.isDeleted).length,
    softDeleted: softDeleted.length,
    uiVisiblePublishedActive: uiVisible.length,
    uiHiddenNonDeleted: uiHidden.length,
    byClassificationApprox: dbByClass,
    matchedToCatalog: dbMatched.filter((l) => l.catalogMatched && !l.isDeleted).length,
    missingFromDbCount: missingFromDb.length,
    extraInDbCount: extraInDb.length,
    duplicatePresentationFamilies: dbDuplicateFamilies.length,
    lendersWithZeroPrograms: noPrograms.length,
    lendersMissingCatalogProducts: incompletePrograms.length,
  },
  gaps: {
    missingFromLiveDb: missingFromDb.map((c) => ({
      seedKey: c.seedKey,
      displayName: c.displayName,
      classification: c.classification,
      classificationLabel: c.classificationLabel,
      productsSupported: c.productsSupported,
    })),
    extraInLiveDb: extraInDb.map((l) => ({
      id: l.id,
      code: l.code,
      displayName: l.displayName,
      institutionCategory: l.institutionCategory,
      classification: l.classification,
      uiVisible: l.uiVisible,
      uiHiddenReason: l.uiHiddenReason,
    })),
    uiHidden: uiHidden.map((l) => ({
      id: l.id,
      code: l.code,
      displayName: l.displayName,
      reason: l.uiHiddenReason,
      seedKey: l.seedKey,
    })),
    duplicateFamilies: dbDuplicateFamilies,
    noPrograms: noPrograms.map((l) => ({
      id: l.id,
      code: l.code,
      displayName: l.displayName,
      seedKey: l.seedKey,
    })),
  },
  liveInventory: dbMatched.map((l) => ({
    id: l.id,
    code: l.code,
    displayName: l.displayName,
    legalName: l.legalName,
    category: l.catalogClassification || l.classification || l.institutionCategory,
    activeStatus: {
      status: l.status,
      enabled: l.enabled,
      lifecycleStatus: l.lifecycleStatus,
      operationalStatus: l.operationalStatus,
      isDeleted: l.isDeleted,
    },
    seedKey: l.seedKey,
    catalogMatched: l.catalogMatched,
    productProgrammesConfigured: l.productCodes,
    productProgrammeCount: l.programCount,
    activeProgrammeCount: l.activeProgramCount,
    missingProductProgrammes: l.missingCatalogProducts,
    uiVisible: l.uiVisible,
    uiHiddenReason: l.uiHiddenReason,
    legacyOrHidden:
      Boolean(l.uiHiddenReason) ||
      /legacy|ext$/i.test(l.code) ||
      l.isDeleted,
  })),
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(inventory, null, 2), "utf8");

function mdEscape(s: string) {
  return s.replace(/\|/g, "\\|");
}

const lines: string[] = [];
lines.push("# CO-LR-009 — Enterprise Lender Registry Completeness Audit");
lines.push("");
lines.push(`**Audited at:** ${inventory.auditedAt}`);
lines.push(`**Mode:** Read-only (no production mutations)`);
lines.push(`**Live DB connected:** ${db.connected ? "YES" : "NO"}`);
if (db.error) lines.push(`**DB error:** ${db.error}`);
lines.push("");
lines.push("---");
lines.push("");
lines.push("## 1. Total lender counts");
lines.push("");
lines.push("| Source | Count |");
lines.push("|--------|------:|");
lines.push(`| Approved Enterprise Lender Master (catalogue) | **${catalog.length}** |`);
if (db.connected) {
  lines.push(`| Live Registry rows (all) | **${db.lenders.length}** |`);
  lines.push(
    `| Live Registry non-deleted | **${db.lenders.filter((l) => !l.isDeleted).length}** |`,
  );
  lines.push(
    `| UI-visible (Published ∧ Active ∧ not BF_*) | **${uiVisible.length}** |`,
  );
  lines.push(`| Soft-deleted | ${softDeleted.length} |`);
  lines.push(`| Catalogue matched in live DB | ${inventory.liveRegistry.matchedToCatalog} |`);
  lines.push(`| Catalogue missing from live DB | **${missingFromDb.length}** |`);
  lines.push(`| Live extras (not in catalogue) | ${extraInDb.length} |`);
}
lines.push("");
lines.push("### Catalogue by classification (approved master)");
lines.push("");
lines.push("| Classification | Count |");
lines.push("|----------------|------:|");
for (const key of CLASS_ORDER) {
  const label = LENDER_MASTER_CLASSIFICATION_LABELS[key] ?? key;
  lines.push(`| ${label} | ${catalogByClass[key] ?? 0} |`);
}
lines.push(`| **Total** | **${catalog.length}** |`);
lines.push("");

if (db.connected) {
  lines.push("### Live DB by classification (approx)");
  lines.push("");
  lines.push("| Classification | Non-deleted count |");
  lines.push("|----------------|------:|");
  for (const key of CLASS_ORDER) {
    const label = LENDER_MASTER_CLASSIFICATION_LABELS[key] ?? key;
    lines.push(`| ${label} | ${dbByClass[key] ?? 0} |`);
  }
  lines.push("");
}

lines.push("---");
lines.push("");
lines.push("## 2. Complete lender inventory (Approved Master Catalogue)");
lines.push("");
lines.push(
  "This is the Product Owner–approved Enterprise Lender Master used for seeding (`LENDER_MASTER_SEED_CATALOG`, CO-LR-006 + CO-LR-008).",
);
lines.push("");
lines.push(
  "Full machine-readable inventory: `docs/co-lr-009/CO-LR-009-AUDIT-INVENTORY.json`.",
);
lines.push("");

for (const key of CLASS_ORDER) {
  const label = LENDER_MASTER_CLASSIFICATION_LABELS[key] ?? key;
  const rows = catalog.filter((c) => c.classification === key);
  lines.push(`### ${label} (${rows.length})`);
  lines.push("");
  lines.push("| # | Display Name | Seed Key | Products |");
  lines.push("|--:|--------------|----------|---------:|");
  rows
    .slice()
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .forEach((r, i) => {
      lines.push(
        `| ${i + 1} | ${mdEscape(r.displayName)} | \`${r.seedKey}\` | ${r.productCount} |`,
      );
    });
  lines.push("");
}

lines.push("---");
lines.push("");
lines.push("## 3. Missing lenders (Catalogue → Live DB gap)");
lines.push("");
if (!db.connected) {
  lines.push(
    "_Live database could not be queried. Gap analysis limited to catalogue. Re-run with `DATABASE_URL`._",
  );
} else if (missingFromDb.length === 0) {
  lines.push(
    "**None.** Every approved catalogue lender matched at least one live Registry row.",
  );
} else {
  lines.push(
    `**${missingFromDb.length}** approved master lenders are **not present** (or not matchable) in the live Registry.`,
  );
  lines.push("");
  lines.push(
    "This is the primary reason users cannot find many lenders in the application: the catalogue exists in code, but fill-missing Tier-2 seed has not materialised those rows in this environment’s database.",
  );
  lines.push("");
  lines.push("| Display Name | Classification | Seed Key |");
  lines.push("|--------------|----------------|----------|");
  for (const m of missingFromDb.sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  )) {
    lines.push(
      `| ${mdEscape(m.displayName)} | ${m.classificationLabel} | \`${m.seedKey}\` |`,
    );
  }
}
lines.push("");

lines.push("---");
lines.push("");
lines.push("## 4. Duplicate lenders");
lines.push("");
lines.push("### Catalogue presentation-family overlaps");
lines.push("");
if (catalogPresentationFamilies.length === 0) {
  lines.push("No multi-member presentation families detected inside the catalogue.");
} else {
  lines.push(
    `${catalogPresentationFamilies.length} families share normalised name/alias keys (distinct seedKeys — intentional related brands or residual overlap).`,
  );
  lines.push("");
  for (const f of catalogPresentationFamilies.slice(0, 40)) {
    lines.push(
      `- \`${f.family}\`: ${f.members.map((m) => `${m.displayName} (\`${m.seedKey}\`)`).join("; ")}`,
    );
  }
  if (catalogPresentationFamilies.length > 40) {
    lines.push(`- … and ${catalogPresentationFamilies.length - 40} more (see JSON).`);
  }
}
lines.push("");
lines.push(`Catalogue rows after presentation dedupe: **${catalogDedupeCheck.length}** (from ${catalog.length}).`);
lines.push("");

if (db.connected) {
  lines.push("### Live DB presentation duplicate families");
  lines.push("");
  if (dbDuplicateFamilies.length === 0) {
    lines.push("No multi-row presentation families among non-deleted live lenders.");
  } else {
    lines.push(
      `**${dbDuplicateFamilies.length}** families have multiple live rows. CO-LR-008 hides non-survivors in selectors (no physical merge).`,
    );
    lines.push("");
    for (const f of dbDuplicateFamilies.slice(0, 50)) {
      lines.push(`- \`${f.family}\` survivor≈\`${f.survivorWouldBe}\``);
      for (const m of f.members) {
        lines.push(
          `  - ${mdEscape(m.displayName)} (\`${m.code}\`) visible=${m.uiVisible}${m.uiHiddenReason ? ` reason=${m.uiHiddenReason}` : ""}`,
        );
      }
    }
  }
}
lines.push("");

lines.push("---");
lines.push("");
lines.push("## 5. UI visibility issues");
lines.push("");
lines.push("### Visibility gate (SSOT)");
lines.push("");
lines.push("A lender appears in Opportunity / Loan / Deal dropdowns only when:");
lines.push("");
lines.push("1. `isDeleted = false`");
lines.push("2. `status = active`");
lines.push("3. `enabled = true`");
lines.push("4. `lifecycleStatus = active`");
lines.push("5. `operationalStatus` absent or `active`");
lines.push("6. Code is not provisional `BF_*`");
lines.push("7. Presentation canonicalisation keeps **one survivor per identity family**");
lines.push("");
lines.push("Consumers: `listCanonicalEnterpriseLenderOptionsAsync`, Tier-2 `listLenders`, Competition, Manual Recommendation, LIFE recommend.");
lines.push("");

if (db.connected) {
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| UI-visible | ${uiVisible.length} |`);
  lines.push(`| Hidden (non-deleted) | ${uiHidden.length} |`);
  lines.push(`| Soft-deleted | ${softDeleted.length} |`);
  lines.push("");
  if (uiHidden.length > 0) {
    lines.push("### Hidden live lenders (reason)");
    lines.push("");
    lines.push("| Code | Name | Reason |");
    lines.push("|------|------|--------|");
    for (const h of uiHidden.slice(0, 100)) {
      lines.push(
        `| \`${h.code}\` | ${mdEscape(h.displayName)} | ${h.uiHiddenReason ?? "unknown"} |`,
      );
    }
    if (uiHidden.length > 100) {
      lines.push(`| … | … | +${uiHidden.length - 100} more in JSON |`);
    }
  }
  if (missingFromDb.length > 0) {
    lines.push("");
    lines.push(
      `**Dominant UI gap:** ${missingFromDb.length} catalogue lenders never appear because they are **absent from live DB** — not because of filters on existing rows.`,
    );
  }
} else {
  lines.push("_Live UI visibility counts unavailable without DB connection._");
}
lines.push("");

lines.push("---");
lines.push("");
lines.push("## 6. Programme coverage");
lines.push("");
lines.push("### Catalogue");
lines.push("");
const catalogProgrammes = catalog.reduce((n, c) => n + c.productCount, 0);
const catalogMissingProducts = catalog.filter((c) => c.productCount === 0);
lines.push(`| Metric | Value |`);
lines.push(`|--------|------:|`);
lines.push(`| Lenders with ≥1 product code | ${catalog.length - catalogMissingProducts.length} |`);
lines.push(`| Lenders with 0 product codes | ${catalogMissingProducts.length} |`);
lines.push(`| Total product-code assignments | ${catalogProgrammes} |`);
lines.push("");

if (db.connected) {
  lines.push("### Live Registry programmes");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Non-deleted lenders with 0 programmes | ${noPrograms.length} |`);
  lines.push(
    `| Matched lenders missing catalogue product codes | ${incompletePrograms.length} |`,
  );
  lines.push("");
  if (noPrograms.length > 0) {
    lines.push("Lenders with zero programme rows (sample / full in JSON):");
    lines.push("");
    for (const p of noPrograms.slice(0, 40)) {
      lines.push(`- \`${p.code}\` ${p.displayName}`);
    }
  }
}
lines.push("");

lines.push("---");
lines.push("");
lines.push("## 7. Recommended actions");
lines.push("");
lines.push("1. **Do not delete or physically merge** live duplicate rows (FK continuity).");
lines.push(
  "2. **Run fill-missing Tier-2 lender seed** in the certification/production environment so missing catalogue seedKeys are created (additive only).",
);
lines.push(
  "3. After seed: **`POST /api/lender-registry/seed-baseline-programs`** for lenders with empty programmes.",
);
lines.push(
  "4. Confirm Admin → Lender Registry list shows expected counts; then verify Deal / OW / Loan pickers.",
);
lines.push(
  "5. For residual presentation duplicates: rely on CO-LR-008 canonical survivor UI; schedule physical merge only with PO + FK remap programme.",
);
lines.push(
  "6. Re-run this audit (`node --env-file=.env.local --import tsx scripts/co-lr-009-audit.mts`) after seed to confirm `missingFromDbCount = 0`.",
);
lines.push("");
lines.push("---");
lines.push("");
lines.push("## 8. Production data attestation");
lines.push("");
lines.push("| Action | Performed? |");
lines.push("|--------|------------|");
lines.push("| Delete lenders | **No** |");
lines.push("| Truncate / reset tables | **No** |");
lines.push("| Rewrite Lender IDs / FKs | **No** |");
lines.push("| Soft-delete / disable | **No** |");
lines.push("| Investigation method | Catalogue static analysis + Prisma `findMany` SELECT |");
lines.push("");
lines.push("*End of CO-LR-009 audit*");
lines.push("");

fs.writeFileSync(outMd, lines.join("\n"), "utf8");

console.log(
  JSON.stringify(
    {
      ok: true,
      catalogTotal: catalog.length,
      dbConnected: db.connected,
      dbTotal: db.lenders.length,
      dbNonDeleted: db.lenders.filter((l) => !l.isDeleted).length,
      uiVisible: uiVisible.length,
      missingFromDb: missingFromDb.length,
      duplicateFamilies: dbDuplicateFamilies.length,
      report: path.relative(root, outMd),
      inventory: path.relative(root, outJson),
    },
    null,
    2,
  ),
);
