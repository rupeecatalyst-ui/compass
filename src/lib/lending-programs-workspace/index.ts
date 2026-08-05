/**
 * CO-LW-001 — Lending Programs compose (read-only orchestration).
 * Snapshot = masters only. Live domains queried separately.
 */

import {
  LENDING_PROGRAMS_ACTIVE_DAYS,
  LENDING_PROGRAMS_BUSINESS_FIT_KEYS,
  LENDING_PROGRAMS_BUSINESS_FIT_LABELS,
  LENDING_PROGRAMS_SNAPSHOT_STORAGE_KEY,
} from "@/constants/lending-programs-workspace";
import { fetchProductMasterOptions } from "@/lib/enterprise-product-master/options";
import { lenderRegistryClient } from "@/lib/enterprise-lender-registry";
import { isPublishedCommercialProgram } from "@/lib/enterprise-lender-registry/program-architecture";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import {
  findOperationalEcmContactById,
  searchOperationalContacts,
} from "@/lib/enterprise-registry";
import type {
  BusinessFitCell,
  LendingProgramsLivePipeline,
  LendingProgramsSnapshot,
  LendingProgramsTeamMember,
} from "@/types/lending-programs-workspace";
import { LENDING_PROGRAMS_NOT_SPECIFIED } from "@/types/lending-programs-workspace";
import type {
  EnterpriseLenderProgramRecord,
  EnterpriseLenderRecord,
} from "@/types/enterprise-lender-registry";

function displayName(lender: EnterpriseLenderRecord): string {
  return (lender.displayName || lender.label || lender.legalName || lender.code).trim();
}

export function formatLpValue(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return LENDING_PROGRAMS_NOT_SPECIFIED;
  if (typeof value === "string" && !value.trim()) return LENDING_PROGRAMS_NOT_SPECIFIED;
  if (typeof value === "number" && !Number.isFinite(value)) {
    return LENDING_PROGRAMS_NOT_SPECIFIED;
  }
  return String(value);
}

export function formatLpPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return LENDING_PROGRAMS_NOT_SPECIFIED;
  }
  return `${value}%`;
}

export function formatLpMonths(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return LENDING_PROGRAMS_NOT_SPECIFIED;
  }
  return `${value} months`;
}

export function formatLpDays(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return LENDING_PROGRAMS_NOT_SPECIFIED;
  }
  return `${value} days`;
}

function buildCapabilityIndexes(
  lenders: EnterpriseLenderRecord[],
  programs: EnterpriseLenderProgramRecord[],
): Pick<LendingProgramsSnapshot, "capabilityByProduct" | "capabilityByLender"> {
  const capabilityByProduct: Record<string, string[]> = {};
  const capabilityByLender: Record<string, string[]> = {};

  for (const lender of lenders) {
    const codes = (lender.productsSupported ?? []).filter(Boolean);
    capabilityByLender[lender.id] = [...new Set(codes)];
    for (const code of codes) {
      if (!capabilityByProduct[code]) capabilityByProduct[code] = [];
      if (!capabilityByProduct[code]!.includes(lender.id)) {
        capabilityByProduct[code]!.push(lender.id);
      }
    }
  }

  for (const program of programs) {
    const code = program.productCode?.trim();
    if (!code) continue;
    if (!capabilityByProduct[code]) capabilityByProduct[code] = [];
    if (!capabilityByProduct[code]!.includes(program.lenderId)) {
      capabilityByProduct[code]!.push(program.lenderId);
    }
    const existing = capabilityByLender[program.lenderId] ?? [];
    if (!existing.includes(code)) {
      capabilityByLender[program.lenderId] = [...existing, code];
    }
  }

  return { capabilityByProduct, capabilityByLender };
}

export async function loadLendingProgramsSnapshot(opts?: {
  force?: boolean;
}): Promise<LendingProgramsSnapshot> {
  if (!opts?.force && typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(LENDING_PROGRAMS_SNAPSHOT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LendingProgramsSnapshot;
        if (parsed?.generatedAt && Array.isArray(parsed.lenders)) {
          return parsed;
        }
      }
    } catch {
      /* rebuild */
    }
  }

  const [lendersResult, programsResult, products] = await Promise.all([
    lenderRegistryClient.queryLenders({
      status: "active",
      enabled: true,
      pageSize: 500,
    }),
    lenderRegistryClient.queryPrograms({
      publishedOnly: true,
      pageSize: 1000,
    }),
    fetchProductMasterOptions({ enabledOnly: true, force: opts?.force }),
  ]);

  const lenders = lendersResult.items.filter((l) => !l.isDeleted && l.enabled);
  const publishedPrograms = programsResult.items.filter(isPublishedCommercialProgram);
  const { capabilityByProduct, capabilityByLender } = buildCapabilityIndexes(
    lenders,
    publishedPrograms,
  );

  const regionSet = new Set<string>();
  for (const l of lenders) {
    if (l.headquartersLabel?.trim()) regionSet.add(l.headquartersLabel.trim());
    for (const s of l.coverageStates ?? []) {
      if (s?.trim()) regionSet.add(s.trim());
    }
  }

  const snapshot: LendingProgramsSnapshot = {
    generatedAt: new Date().toISOString(),
    source: "client_compose",
    lenders,
    products,
    publishedPrograms,
    capabilityByProduct,
    capabilityByLender,
    regions: [...regionSet].sort((a, b) => a.localeCompare(b)),
  };

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(
        LENDING_PROGRAMS_SNAPSHOT_STORAGE_KEY,
        JSON.stringify(snapshot),
      );
    } catch {
      /* quota */
    }
  }

  return snapshot;
}

export function lenderDisplayName(lender: EnterpriseLenderRecord): string {
  return displayName(lender);
}

export function programsForLender(
  snapshot: LendingProgramsSnapshot,
  lenderId: string,
): EnterpriseLenderProgramRecord[] {
  return snapshot.publishedPrograms.filter((p) => p.lenderId === lenderId);
}

export function programsForProduct(
  snapshot: LendingProgramsSnapshot,
  productCode: string,
): EnterpriseLenderProgramRecord[] {
  const code = productCode.trim();
  return snapshot.publishedPrograms.filter((p) => p.productCode === code);
}

export function lendersSupportingProduct(
  snapshot: LendingProgramsSnapshot,
  productCode: string,
): EnterpriseLenderRecord[] {
  const ids = new Set(snapshot.capabilityByProduct[productCode] ?? []);
  for (const p of programsForProduct(snapshot, productCode)) {
    ids.add(p.lenderId);
  }
  return snapshot.lenders.filter((l) => ids.has(l.id));
}

/** Active = Deal activity on this lender within window, else published-program lenders by recency. */
export function listActiveLenders(
  snapshot: LendingProgramsSnapshot,
  dealLenderActivity: Map<string, string>,
  now = Date.now(),
): EnterpriseLenderRecord[] {
  const cutoff = now - LENDING_PROGRAMS_ACTIVE_DAYS * 24 * 60 * 60 * 1000;
  const withActivity = snapshot.lenders.filter((l) => {
    const ts = dealLenderActivity.get(l.id);
    if (!ts) return false;
    return new Date(ts).getTime() >= cutoff;
  });
  if (withActivity.length > 0) {
    return withActivity.sort((a, b) => {
      const ta = dealLenderActivity.get(a.id) ?? "";
      const tb = dealLenderActivity.get(b.id) ?? "";
      return tb.localeCompare(ta);
    });
  }
  // Fallback: lenders that have at least one published program (searchable remainder still available)
  const withPrograms = new Set(snapshot.publishedPrograms.map((p) => p.lenderId));
  return snapshot.lenders
    .filter((l) => withPrograms.has(l.id))
    .sort((a, b) => displayName(a).localeCompare(displayName(b)));
}

export function filterLenders(
  lenders: EnterpriseLenderRecord[],
  opts: { search?: string; productCode?: string; region?: string; snapshot: LendingProgramsSnapshot },
): EnterpriseLenderRecord[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  const product = (opts.productCode ?? "").trim();
  const region = (opts.region ?? "").trim().toLowerCase();

  return lenders.filter((l) => {
    if (product) {
      const supported = opts.snapshot.capabilityByLender[l.id] ?? [];
      const hasProgram = opts.snapshot.publishedPrograms.some(
        (p) => p.lenderId === l.id && p.productCode === product,
      );
      if (!supported.includes(product) && !hasProgram) return false;
    }
    if (region) {
      const hay = [
        l.headquartersLabel,
        ...(l.coverageStates ?? []),
        ...(l.coverageCities ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(region)) return false;
    }
    if (q) {
      const hay = [
        displayName(l),
        l.code,
        l.legalName,
        l.shortName,
        ...(l.aliases ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Business fit — only explicit programme fields (employmentType / borrowerType / productCode / label).
 * Never infer. Unsupported → null (Not Specified).
 */
export function deriveBusinessFitFromProgram(
  program: EnterpriseLenderProgramRecord | null | undefined,
): BusinessFitCell[] {
  const text = [
    program?.employmentType,
    program?.borrowerType,
    program?.productCode,
    program?.label,
    program?.description,
    program?.remarks,
    program?.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasText = text.trim().length > 0;

  const explicit = (needles: string[]): boolean | null => {
    if (!hasText) return null;
    const hit = needles.some((n) => text.includes(n));
    return hit ? true : null;
  };

  return LENDING_PROGRAMS_BUSINESS_FIT_KEYS.map((key) => {
    let supported: boolean | null = null;
    switch (key) {
      case "salaried":
        supported = explicit(["salaried"]);
        break;
      case "self_employed":
        supported = explicit(["self employed", "self-employed", "self_employed", "sep", "seb"]);
        break;
      case "balance_transfer":
        supported = explicit(["balance transfer", "bt ", " bt", "balance_transfer"]);
        break;
      case "top_up":
        supported = explicit(["top-up", "top up", "topup"]);
        break;
      case "ready_property":
        supported = explicit(["ready property", "ready reckoner", "completed property"]);
        break;
      case "under_construction":
        supported = explicit(["under construction", "uc ", "under-construction"]);
        break;
      case "msme":
        supported = explicit(["msme", "sme"]);
        break;
      case "working_capital":
        supported = explicit(["working capital", "od ", "cc limit", "cash credit"]);
        break;
    }
    return {
      key,
      label: LENDING_PROGRAMS_BUSINESS_FIT_LABELS[key],
      supported,
    };
  });
}

export async function loadDealActivityByLender(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const page = await enterpriseDealApiClient.searchDeals({
      page: 1,
      pageSize: 200,
      archived: false,
      view: "summary",
    });
    for (const d of page.items) {
      const lenderId = d.lenderId?.trim();
      if (!lenderId) continue;
      const prev = map.get(lenderId);
      if (!prev || (d.updatedAt && d.updatedAt > prev)) {
        map.set(lenderId, d.updatedAt || d.createdAt || "");
      }
    }
  } catch {
    /* empty map → fallback active list */
  }
  return map;
}

export async function loadLivePipelineForLender(
  lenderId: string,
): Promise<LendingProgramsLivePipeline> {
  return loadLivePipelineFiltered((d) => d.lenderId === lenderId);
}

/**
 * Product-view live projection — same Deal Registry read as lender pipeline.
 * Matches productCode or productLabel (case-insensitive); never invents rows.
 */
export async function loadLivePipelineForProduct(
  productCode: string,
  productLabel?: string | null,
): Promise<LendingProgramsLivePipeline> {
  const code = productCode.trim().toLowerCase();
  const label = (productLabel ?? "").trim().toLowerCase();
  return loadLivePipelineFiltered((d) => {
    const pc = (d.productCode ?? "").trim().toLowerCase();
    const pl = (d.productLabel ?? "").trim().toLowerCase();
    if (code && (pc === code || pl === code)) return true;
    if (label && (pl === label || pc === label)) return true;
    return false;
  });
}

async function loadLivePipelineFiltered(
  match: (d: {
    lenderId?: string | null;
    productCode?: string | null;
    productLabel?: string | null;
    grossStage?: string | null;
    opportunityId?: string | null;
    id: string;
    dealNumber?: string | null;
    primaryContactName?: string | null;
    primaryCounterpartyName?: string | null;
    updatedAt?: string | null;
    createdAt?: string | null;
  }) => boolean,
): Promise<LendingProgramsLivePipeline> {
  const empty: LendingProgramsLivePipeline = {
    dealCount: 0,
    opportunityHints: 0,
    disbursedCount: 0,
    activeDealStages: [],
    recentDealLabels: [],
  };
  try {
    const page = await enterpriseDealApiClient.searchDeals({
      page: 1,
      pageSize: 200,
      archived: false,
      view: "summary",
    });
    const deals = page.items.filter(match);
    const stageMap = new Map<string, number>();
    let disbursedCount = 0;
    const opportunityIds = new Set<string>();
    for (const d of deals) {
      const stage = d.grossStage || "unknown";
      stageMap.set(stage, (stageMap.get(stage) ?? 0) + 1);
      if (stage.toLowerCase().includes("disburs")) disbursedCount += 1;
      if (d.opportunityId) opportunityIds.add(d.opportunityId);
    }
    return {
      dealCount: deals.length,
      opportunityHints: opportunityIds.size,
      disbursedCount,
      activeDealStages: [...stageMap.entries()].map(([stage, count]) => ({
        stage,
        count,
      })),
      recentDealLabels: deals
        .slice()
        .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
        .slice(0, 8)
        .map((d) => ({
          id: d.id,
          label:
            d.dealNumber ||
            d.primaryContactName ||
            d.primaryCounterpartyName ||
            d.id.slice(0, 8),
          stage: d.grossStage || LENDING_PROGRAMS_NOT_SPECIFIED,
          updatedAt: d.updatedAt || "",
        })),
    };
  } catch {
    return empty;
  }
}

export function listRelationshipTeamForLender(
  lenderId: string,
  lenderContacts: Array<{
    id: string;
    name: string;
    mobile?: string | null;
    email?: string | null;
    designation?: string | null;
  }>,
): LendingProgramsTeamMember[] {
  const fromEcm = searchOperationalContacts("", { roles: ["lender_employee"] })
    .map((r) => findOperationalEcmContactById(r.id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .filter((c) => c.roleProfiles?.lender_employee?.institution === lenderId)
    .map(
      (c): LendingProgramsTeamMember => ({
        id: c.id,
        name: c.name,
        mobile: c.mobilePrimary,
        email: c.officialEmail || c.personalEmail,
        designation: c.roleProfiles?.lender_employee?.designation,
        source: "ecm_banker",
      }),
    );

  const fromLender = lenderContacts.map(
    (c): LendingProgramsTeamMember => ({
      id: c.id,
      name: c.name,
      mobile: c.mobile ?? undefined,
      email: c.email ?? undefined,
      designation: c.designation ?? undefined,
      source: "lender_contact",
    }),
  );

  const seen = new Set<string>();
  const out: LendingProgramsTeamMember[] = [];
  for (const m of [...fromEcm, ...fromLender]) {
    const key = `${m.name}|${m.mobile ?? ""}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

export {
  buildLpProductFamilies,
  familyLabelForProductCode,
  type LpProductFamily,
  type LpProductFamilyMember,
} from "./product-families";

export {
  deriveStageDistribution,
  derivePipelineFunnel,
  deriveApprovalRejection,
  deriveProductMixFromPrograms,
  deriveProgrammeCoverage,
  deriveCityDistribution,
  deriveAverageTatDays,
  deriveMonthlyDisbursalTrend,
  deriveRelationshipSignals,
} from "./dashboard-analytics";

