/**
 * CO-ARCH-ELD-001 — Compose lender-centric directory rows from Enterprise Lender Registry.
 * Read-only · additive · never invents commercial values (CAD-2026-001).
 */

import {
  ELD_PINNED_STORAGE_KEY,
  ELD_RECENT_STORAGE_KEY,
} from "@/constants/enterprise-lender-directory/ops";
import { productCodesShareSelectionFamily } from "@/constants/enterprise-product-master";
import type {
  EnterpriseLenderProgramRecord,
  EnterpriseLenderRecord,
  LenderInstitutionCategory,
} from "@/types/enterprise-lender-registry";
import type {
  EnterpriseLenderDirectoryCategoryId,
  EnterpriseLenderDirectoryFilters,
  EnterpriseLenderDirectoryRow,
  EnterpriseLenderDirectorySortMode,
} from "@/types/enterprise-lender-directory-ops";

function formatInr(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount) || amount <= 0) return "Not Specified";
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatRoi(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "Not Specified";
  return `${n.toFixed(2)}%`;
}

function mapCategory(
  cat: LenderInstitutionCategory | string | null | undefined,
  classification?: string | null,
): { id: EnterpriseLenderDirectoryCategoryId; label: string } {
  const c = String(cat ?? "").toLowerCase();
  const cl = String(classification ?? "").toLowerCase();
  if (c === "hfc" || cl.includes("housing_finance")) {
    return { id: "hfc", label: "Housing Finance Company (HFC)" };
  }
  if (c === "fintech") return { id: "fintech", label: "Fintech" };
  if (c === "nbfc" || cl === "nbfc") return { id: "nbfc", label: "NBFC" };
  if (c === "cooperative" || cl.includes("cooperative")) {
    return { id: "cooperative", label: "Cooperative Bank" };
  }
  if (c === "bank" || cl.includes("bank")) return { id: "bank", label: "Bank" };
  return { id: "other", label: "Others" };
}

function programRoi(p: EnterpriseLenderProgramRecord): number | null {
  const v = p.roiPercent ?? p.minRoiPercent ?? null;
  return v != null && Number.isFinite(v) ? Number(v) : null;
}

function pickProgram(
  programs: EnterpriseLenderProgramRecord[],
  productCode: string,
): EnterpriseLenderProgramRecord | undefined {
  return programs.find(
    (p) =>
      p.enabled && productCodesShareSelectionFamily(p.productCode, productCode),
  );
}

function readJsonMap(key: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readPinnedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(ELD_PINNED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

/** Mark lender as recently used by the signed-in operator (local preference only). */
export function rememberEldLenderUsed(lenderId: string): void {
  if (typeof window === "undefined" || !lenderId) return;
  const map = readJsonMap(ELD_RECENT_STORAGE_KEY);
  map[lenderId] = new Date().toISOString();
  try {
    window.localStorage.setItem(ELD_RECENT_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

export function composeEnterpriseLenderDirectoryRows(input: {
  lenders: EnterpriseLenderRecord[];
  programs: EnterpriseLenderProgramRecord[];
  /** Optional live deal counts keyed by lender registry id */
  dealCountsByLenderId?: Record<string, { deals: number; opportunities: number; pipelineValue: number }>;
}): EnterpriseLenderDirectoryRow[] {
  const recent = readJsonMap(ELD_RECENT_STORAGE_KEY);
  const pinned = readPinnedIds();
  const byLender = new Map<string, EnterpriseLenderProgramRecord[]>();
  for (const p of input.programs) {
    if (p.isDeleted || !p.enabled) continue;
    const list = byLender.get(p.lenderId) ?? [];
    list.push(p);
    byLender.set(p.lenderId, list);
  }

  const hlCode = "HOME_LOAN";
  const btCode = "HOME_LOAN_BT";

  return input.lenders
    .filter((l) => !l.isDeleted && l.enabled)
    .map((lender) => {
      const programs = byLender.get(lender.id) ?? [];
      const hl = pickProgram(programs, hlCode);
      const bt = pickProgram(programs, btCode);
      const hlRoi = hl ? programRoi(hl) : null;
      const btRoi = bt ? programRoi(bt) : null;
      const primary =
        hl ??
        bt ??
        programs.find((p) => p.enabled) ??
        programs[0];
      const cat = mapCategory(lender.institutionCategory, lender.classification);
      const counts = input.dealCountsByLenderId?.[lender.id];
      const activeDeals = counts?.deals ?? 0;
      const activeOpportunities = counts?.opportunities ?? activeDeals;
      const pipelineValue = counts?.pipelineValue ?? 0;
      const activityScore =
        activeOpportunities * 40 +
        activeDeals * 25 +
        Math.min(35, Math.round(pipelineValue / 1_00_000));
      const maxLoan = primary?.maxFundingAmount ?? 0;
      const shortName =
        lender.shortName?.trim() ||
        lender.displayName?.trim() ||
        lender.label;
      const region =
        lender.headquartersLabel?.trim() ||
        lender.coverageStates?.[0] ||
        "Not Specified";
      const productsSupported = [
        ...new Set(
          [
            ...(lender.productsSupported ?? []),
            ...programs.map((p) => p.productCode).filter(Boolean),
          ].map(String),
        ),
      ];
      const pinRank = lender.priority ?? lender.sortOrder ?? 9999;
      const isPinned = pinned.has(lender.id) || pinRank <= 10;

      return {
        lenderId: lender.id,
        lenderName: lender.label,
        shortName,
        categoryId: cat.id,
        categoryLabel: cat.label,
        status: lender.status === "active" && lender.enabled ? "active" : "inactive",
        pinRank,
        pinned: isPinned,
        homeLoanRoi: hlRoi,
        homeLoanRoiLabel: formatRoi(hlRoi),
        balanceTransferRoi: btRoi,
        balanceTransferRoiLabel: formatRoi(btRoi),
        maxLtvPercent: primary?.maxLtvPercent ?? null,
        maxLtvLabel:
          primary?.maxLtvPercent != null ? `${primary.maxLtvPercent}%` : "Not Specified",
        foirLabel:
          primary?.maxFoirPercent != null ? `${primary.maxFoirPercent}%` : "Not Specified",
        minCibil: primary?.minCibil ?? null,
        minCibilLabel:
          primary?.minCibil != null ? String(primary.minCibil) : "Not Specified",
        maxLoanAmount: maxLoan,
        maxLoanAmountLabel: formatInr(maxLoan),
        processingFeeLabel:
          primary?.processingFeeLabel?.trim() ||
          (primary?.processingFeePct != null ? `${primary.processingFeePct}%` : "Not Specified"),
        averageTatDays: primary?.averageTatDays ?? 0,
        averageTatLabel:
          primary?.averageTatDays != null && primary.averageTatDays > 0
            ? `${primary.averageTatDays}d`
            : "Not Specified",
        balanceTransferAvailable: Boolean(bt),
        topUpAvailable: productsSupported.some((p) =>
          /top.?up|top_up/i.test(String(p)),
        ),
        activeOpportunities,
        activeDeals,
        pipelineValue,
        activityScore,
        recentlyUsedAt: recent[lender.id] ?? null,
        regionLabel: region,
        productsSupported,
        searchBlob: [
          lender.label,
          shortName,
          lender.code,
          cat.label,
          ...productsSupported,
          region,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      } satisfies EnterpriseLenderDirectoryRow;
    });
}

export function filterEnterpriseLenderDirectoryRows(
  rows: EnterpriseLenderDirectoryRow[],
  filters: EnterpriseLenderDirectoryFilters,
): EnterpriseLenderDirectoryRow[] {
  const q = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.category !== "all" && row.categoryId !== filters.category) return false;
    if (filters.region !== "all" && row.regionLabel !== filters.region) return false;
    if (filters.product !== "all") {
      // CO-MASTER-004 — match Product–Lender Matrix via Product Master family
      // (HOME_LOAN ↔ home-loan ↔ HL_STD). Never compare display labels.
      const hit = row.productsSupported.some((p) =>
        productCodesShareSelectionFamily(p, filters.product),
      );
      if (!hit) return false;
    }
    if (!q) return true;
    return row.searchBlob.includes(q);
  });
}

/**
 * Default smart priority:
 * 1 Pinned · 2 Most Active · 3 Recently Used · 4 Top Performing · 5 Alphabetical
 */
export function sortEnterpriseLenderDirectoryRows(
  rows: EnterpriseLenderDirectoryRow[],
  mode: EnterpriseLenderDirectorySortMode = "smart",
  direction: "asc" | "desc" = "asc",
): EnterpriseLenderDirectoryRow[] {
  const list = [...rows];
  const dir = direction === "asc" ? 1 : -1;

  if (mode === "smart") {
    return list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.pinned && b.pinned && a.pinRank !== b.pinRank) return a.pinRank - b.pinRank;
      if (a.activityScore !== b.activityScore) return b.activityScore - a.activityScore;
      const ra = a.recentlyUsedAt ? new Date(a.recentlyUsedAt).getTime() : 0;
      const rb = b.recentlyUsedAt ? new Date(b.recentlyUsedAt).getTime() : 0;
      if (ra !== rb) return rb - ra;
      // Top performing proxy: lower ROI first among active, then activity
      const roiA = a.homeLoanRoi ?? 99;
      const roiB = b.homeLoanRoi ?? 99;
      if (roiA !== roiB) return roiA - roiB;
      return a.lenderName.localeCompare(b.lenderName);
    });
  }

  return list.sort((a, b) => {
    const av =
      mode === "lenderName"
        ? a.lenderName
        : mode === "homeLoanRoi"
          ? a.homeLoanRoi ?? 0
          : mode === "balanceTransferRoi"
            ? a.balanceTransferRoi ?? 0
            : mode === "maxLtv"
              ? a.maxLtvPercent ?? 0
              : mode === "minCibil"
                ? a.minCibil ?? 0
                : mode === "maxLoanAmount"
                  ? a.maxLoanAmount
                  : mode === "averageTat"
                    ? a.averageTatDays
                    : mode === "activeOpportunities"
                      ? a.activeOpportunities
                      : a.status;
    const bv =
      mode === "lenderName"
        ? b.lenderName
        : mode === "homeLoanRoi"
          ? b.homeLoanRoi ?? 0
          : mode === "balanceTransferRoi"
            ? b.balanceTransferRoi ?? 0
            : mode === "maxLtv"
              ? b.maxLtvPercent ?? 0
              : mode === "minCibil"
                ? b.minCibil ?? 0
                : mode === "maxLoanAmount"
                  ? b.maxLoanAmount
                  : mode === "averageTat"
                    ? b.averageTatDays
                    : mode === "activeOpportunities"
                      ? b.activeOpportunities
                      : b.status;
    if (typeof av === "string" && typeof bv === "string") {
      return av.localeCompare(bv) * dir;
    }
    return ((av as number) - (bv as number)) * dir;
  });
}

export function exportEnterpriseLenderDirectoryCsv(rows: EnterpriseLenderDirectoryRow[]): string {
  const headers = [
    "Lender Name",
    "Short Name",
    "Category",
    "Home Loan ROI",
    "Balance Transfer ROI",
    "Maximum LTV",
    "FOIR",
    "Minimum CIBIL",
    "Maximum Loan Amount",
    "Processing Fee",
    "Average TAT",
    "Balance Transfer Available",
    "Top-up Available",
    "Active Opportunities",
    "Status",
    "Region",
  ];
  const lines = rows.map((r) =>
    [
      r.lenderName,
      r.shortName,
      r.categoryLabel,
      r.homeLoanRoiLabel,
      r.balanceTransferRoiLabel,
      r.maxLtvLabel,
      r.foirLabel,
      r.minCibilLabel,
      r.maxLoanAmountLabel,
      r.processingFeeLabel,
      r.averageTatLabel,
      r.balanceTransferAvailable ? "Yes" : "No",
      r.topUpAvailable ? "Yes" : "No",
      String(r.activeOpportunities),
      r.status,
      r.regionLabel,
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}

export function uniqueEldRegions(rows: EnterpriseLenderDirectoryRow[]): string[] {
  return [...new Set(rows.map((r) => r.regionLabel).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/**
 * CO-BUG-ELD-CONTACT — Union banker Products Handled into directory product filter / search.
 * Additive only — never removes program-backed productsSupported.
 */
export function enrichDirectoryRowsWithBankerProducts(
  rows: EnterpriseLenderDirectoryRow[],
  bankerProductsByLender: Map<string, string[]>,
): EnterpriseLenderDirectoryRow[] {
  if (bankerProductsByLender.size === 0) return rows;
  return rows.map((row) => {
    const extra = bankerProductsByLender.get(row.lenderId) ?? [];
    if (extra.length === 0) return row;
    const productsSupported = [
      ...new Set([...row.productsSupported, ...extra].map((p) => String(p).trim()).filter(Boolean)),
    ];
    return {
      ...row,
      productsSupported,
      searchBlob: `${row.searchBlob} ${extra.join(" ")}`.toLowerCase(),
    };
  });
}
