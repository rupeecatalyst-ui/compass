/**
 * CO-SPRINT-093 — Lender program directory rows.
 * Operational comparison data for the enterprise grid. Scores are display-only.
 */

import { ELW_DIRECTORY_PRODUCTS } from "@/constants/enterprise-lender-directory";
import { normalizeLenderId } from "@/constants/enterprise-lender-workspace";
import { LENDERS_BY_PRODUCT, type LenderOffer } from "@/lib/site";
import type {
  ElwLenderProgramRow,
  LenderEmploymentSegment,
  LenderInstitutionType,
  LenderProgramStatus,
} from "@/types/enterprise-lender-directory";

const LENDER_ID_ALIASES: Record<string, string> = {
  "hdfc bank": "hdfc",
  sbi: "sbi",
  "state bank of india": "sbi",
  "icici bank": "icici",
  "axis bank": "axis",
  "kotak mahindra": "kotak",
  "kotak mahindra bank": "kotak",
  "bajaj housing finance": "bajaj",
  "bajaj finserv": "bajaj",
  "lic housing finance": "lic-housing",
  "pnb housing": "pnb-housing",
  "tata capital": "tata-capital",
  "piramal capital": "piramal",
  "l&t finance": "lt-finance",
  "aditya birla capital": "aditya-birla",
  "yes bank": "yes-bank",
  "idfc first bank": "idfc-first",
  lendingkart: "lendingkart",
};

function resolveLenderId(name: string): string {
  const key = name.trim().toLowerCase();
  return LENDER_ID_ALIASES[key] ?? normalizeLenderId(name);
}

function institutionType(name: string): LenderInstitutionType {
  const n = name.toLowerCase();
  if (n.includes("housing") || n.includes("hfc")) return "HFC";
  if (
    n.includes("finserv") ||
    n.includes("capital") ||
    n.includes("finance") ||
    n.includes("lendingkart") ||
    n.includes("piramal")
  ) {
    return "NBFC";
  }
  return "Bank";
}

/** Stable display integers — not a scoring engine. */
function displayScore(seed: string, base: number, spread: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return Math.min(99, Math.max(55, base + (h % spread)));
}

function parseFeePct(fee: string): number {
  if (/nil/i.test(fee)) return 0;
  const m = fee.match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : 1;
}

function cityForLender(name: string): { state: string; city: string } {
  const n = name.toLowerCase();
  if (n.includes("bajaj")) return { state: "Maharashtra", city: "Pune" };
  if (n.includes("lendingkart")) return { state: "Karnataka", city: "Bengaluru" };
  if (n.includes("tata") || n.includes("piramal") || n.includes("aditya")) {
    return { state: "Maharashtra", city: "Mumbai" };
  }
  return { state: "Maharashtra", city: "Mumbai" };
}

const PROGRAM_VARIANTS: { suffix: string; roiDelta: number; employment: LenderEmploymentSegment }[] = [
  { suffix: "Standard", roiDelta: 0, employment: "both" },
  { suffix: "Salaried Privilege", roiDelta: -0.05, employment: "salaried" },
  { suffix: "Self-Employed", roiDelta: 0.15, employment: "self_employed" },
];

function offerToRows(
  productId: string,
  productLabel: string,
  offer: LenderOffer,
  index: number,
): ElwLenderProgramRow[] {
  const lenderId = resolveLenderId(offer.name);
  const loc = cityForLender(offer.name);
  const type = institutionType(offer.name);
  const feePct = parseFeePct(offer.processingFee);
  const isLap = productId === "loan-against-property";

  return PROGRAM_VARIANTS.map((variant, vIdx) => {
    const roi = Math.round((offer.rateNum + variant.roiDelta) * 100) / 100;
    const programName = `${productLabel} · ${variant.suffix}`;
    const seed = `${lenderId}|${productId}|${variant.suffix}`;
    const status: LenderProgramStatus = vIdx === 2 && index % 5 === 0 ? "inactive" : "active";
    return {
      id: `${productId}:${lenderId}:${vIdx}`,
      lenderId,
      lenderName: offer.name,
      programName,
      productId,
      productLabel,
      roi,
      roiLabel: `${roi.toFixed(2)}%`,
      lenderScore: displayScore(seed + "|l", 72, 26),
      contactScore: displayScore(seed + "|c", 68, 28),
      maxFundingLabel: isLap
        ? `${offer.maxAmount} / up to 70% LTV`
        : offer.maxAmount,
      maxFundingAmount: offer.maxAmountNum,
      maxLtvLabel: isLap ? "Up to 70% LTV" : undefined,
      maxTenureLabel: offer.tenure,
      processingFeeLabel: offer.processingFee,
      processingFeePct: feePct + variant.roiDelta * 2,
      averageTatDays: 5 + ((index + vIdx) % 8),
      status,
      institutionType: type,
      employmentSegment: variant.employment,
      state: loc.state,
      city: loc.city,
      minCibil: variant.employment === "self_employed" ? 700 : 680 + (index % 3) * 10,
    };
  });
}

/** Operational seed for products without marketing offer catalogs. */
const SYNTHETIC_LENDERS: {
  name: string;
  roi: number;
  maxAmount: string;
  maxAmountNum: number;
  tenure: string;
  fee: string;
}[] = [
  { name: "HDFC Bank", roi: 9.5, maxAmount: "₹25 Cr", maxAmountNum: 250000000, tenure: "Up to 48 mo", fee: "1.00%" },
  { name: "ICICI Bank", roi: 9.75, maxAmount: "₹20 Cr", maxAmountNum: 200000000, tenure: "Up to 48 mo", fee: "1.00%" },
  { name: "Axis Bank", roi: 10.0, maxAmount: "₹15 Cr", maxAmountNum: 150000000, tenure: "Up to 36 mo", fee: "1.25%" },
  { name: "Kotak Mahindra", roi: 10.1, maxAmount: "₹10 Cr", maxAmountNum: 100000000, tenure: "Up to 36 mo", fee: "1.00%" },
  { name: "SBI", roi: 9.4, maxAmount: "₹30 Cr", maxAmountNum: 300000000, tenure: "Up to 60 mo", fee: "0.50%" },
  { name: "Bajaj Finserv", roi: 10.5, maxAmount: "₹15 Cr", maxAmountNum: 150000000, tenure: "Up to 84 mo", fee: "Up to 2.00%" },
  { name: "Tata Capital", roi: 10.75, maxAmount: "₹10 Cr", maxAmountNum: 100000000, tenure: "Up to 60 mo", fee: "1.50%" },
  { name: "Aditya Birla Capital", roi: 10.9, maxAmount: "₹12 Cr", maxAmountNum: 120000000, tenure: "Up to 48 mo", fee: "1.25%" },
  { name: "L&T Finance", roi: 11.0, maxAmount: "₹20 Cr", maxAmountNum: 200000000, tenure: "Up to 60 mo", fee: "1.50%" },
  { name: "Piramal Capital", roi: 11.25, maxAmount: "₹50 Cr", maxAmountNum: 500000000, tenure: "Up to 60 mo", fee: "1.00%" },
];

function syntheticOffers(productId: string): LenderOffer[] {
  const roiBump =
    productId === "gold-loan"
      ? -1.2
      : productId === "loan-against-securities"
        ? -0.8
        : productId === "construction-funding"
          ? 1.5
          : 0.4;
  return SYNTHETIC_LENDERS.map((l) => ({
    name: l.name,
    rate: `${(l.roi + roiBump).toFixed(2)}%*`,
    rateNum: Math.round((l.roi + roiBump) * 100) / 100,
    maxAmount: productId === "gold-loan" ? "₹2 Cr" : l.maxAmount,
    maxAmountNum: productId === "gold-loan" ? 20000000 : l.maxAmountNum,
    tenure: productId === "gold-loan" ? "Up to 24 mo" : l.tenure,
    processingFee: l.fee,
  }));
}

function offersForProduct(productId: string): { label: string; offers: LenderOffer[] } {
  const product = ELW_DIRECTORY_PRODUCTS.find((p) => p.id === productId);
  const label = product?.label ?? productId;
  if (product?.offerSlug && LENDERS_BY_PRODUCT[product.offerSlug]) {
    return { label, offers: LENDERS_BY_PRODUCT[product.offerSlug]! };
  }
  return { label, offers: syntheticOffers(productId) };
}

export function listLenderProgramsForProduct(productId: string): ElwLenderProgramRow[] {
  const { label, offers } = offersForProduct(productId);
  return offers.flatMap((offer, index) => offerToRows(productId, label, offer, index));
}

export type LenderDirectorySortField =
  | "lenderName"
  | "programName"
  | "roi"
  | "lenderScore"
  | "contactScore"
  | "maxFundingAmount"
  | "maxTenureLabel"
  | "processingFeePct"
  | "averageTatDays"
  | "status";

export interface LenderDirectoryFilters {
  search: string;
  state: string;
  city: string;
  institutionType: "all" | LenderInstitutionType;
  status: "all" | LenderProgramStatus;
  employment: "all" | LenderEmploymentSegment;
  roiMin: string;
  roiMax: string;
  minCibil: string;
  feeMin: string;
  feeMax: string;
  /** Per-column text filters */
  columnLender: string;
  columnProgram: string;
}

export const EMPTY_LENDER_DIRECTORY_FILTERS: LenderDirectoryFilters = {
  search: "",
  state: "all",
  city: "all",
  institutionType: "all",
  status: "all",
  employment: "all",
  roiMin: "",
  roiMax: "",
  minCibil: "",
  feeMin: "",
  feeMax: "",
  columnLender: "",
  columnProgram: "",
};

/** Default hierarchy: lowest ROI → highest Lender Score → highest Contact Score */
export function sortLenderProgramsDefault(rows: ElwLenderProgramRow[]): ElwLenderProgramRow[] {
  return [...rows].sort((a, b) => {
    if (a.roi !== b.roi) return a.roi - b.roi;
    if (a.lenderScore !== b.lenderScore) return b.lenderScore - a.lenderScore;
    return b.contactScore - a.contactScore;
  });
}

export function sortLenderPrograms(
  rows: ElwLenderProgramRow[],
  field: LenderDirectorySortField | "default",
  direction: "asc" | "desc",
): ElwLenderProgramRow[] {
  if (field === "default") return sortLenderProgramsDefault(rows);
  const dir = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

export function filterLenderPrograms(
  rows: ElwLenderProgramRow[],
  filters: LenderDirectoryFilters,
): ElwLenderProgramRow[] {
  const q = filters.search.trim().toLowerCase();
  const roiMin = filters.roiMin ? Number(filters.roiMin) : null;
  const roiMax = filters.roiMax ? Number(filters.roiMax) : null;
  const minCibil = filters.minCibil ? Number(filters.minCibil) : null;
  const feeMin = filters.feeMin ? Number(filters.feeMin) : null;
  const feeMax = filters.feeMax ? Number(filters.feeMax) : null;
  const colLender = filters.columnLender.trim().toLowerCase();
  const colProgram = filters.columnProgram.trim().toLowerCase();

  return rows.filter((row) => {
    if (q) {
      const hay = `${row.lenderName} ${row.programName} ${row.city} ${row.state}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.state !== "all" && row.state !== filters.state) return false;
    if (filters.city !== "all" && row.city !== filters.city) return false;
    if (filters.institutionType !== "all" && row.institutionType !== filters.institutionType) {
      return false;
    }
    if (filters.status !== "all" && row.status !== filters.status) return false;
    if (filters.employment !== "all") {
      if (row.employmentSegment !== "both" && row.employmentSegment !== filters.employment) {
        return false;
      }
    }
    if (roiMin != null && !Number.isNaN(roiMin) && row.roi < roiMin) return false;
    if (roiMax != null && !Number.isNaN(roiMax) && row.roi > roiMax) return false;
    if (minCibil != null && !Number.isNaN(minCibil) && row.minCibil < minCibil) return false;
    if (feeMin != null && !Number.isNaN(feeMin) && row.processingFeePct < feeMin) return false;
    if (feeMax != null && !Number.isNaN(feeMax) && row.processingFeePct > feeMax) return false;
    if (colLender && !row.lenderName.toLowerCase().includes(colLender)) return false;
    if (colProgram && !row.programName.toLowerCase().includes(colProgram)) return false;
    return true;
  });
}

export function uniqueStates(rows: ElwLenderProgramRow[]): string[] {
  return [...new Set(rows.map((r) => r.state))].sort();
}

export function uniqueCities(rows: ElwLenderProgramRow[], state?: string): string[] {
  return [
    ...new Set(
      rows.filter((r) => !state || state === "all" || r.state === state).map((r) => r.city),
    ),
  ].sort();
}

export function exportLenderProgramsCsv(rows: ElwLenderProgramRow[]): string {
  const headers = [
    "Lender",
    "Program Name",
    "Interest Rate (ROI)",
    "Lender Score",
    "Contact Score",
    "Maximum Funding / LTV",
    "Maximum Tenure",
    "Processing Fee",
    "Average TAT",
    "Status",
    "Institution Type",
    "State",
    "City",
    "Min CIBIL",
  ];
  const lines = rows.map((r) =>
    [
      r.lenderName,
      r.programName,
      r.roiLabel,
      r.lenderScore,
      r.contactScore,
      r.maxFundingLabel,
      r.maxTenureLabel,
      r.processingFeeLabel,
      `${r.averageTatDays} days`,
      r.status,
      r.institutionType,
      r.state,
      r.city,
      r.minCibil,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}
