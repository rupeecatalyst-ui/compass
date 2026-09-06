import { isPublishedCommercialProgram } from "@/lib/enterprise-lender-registry/program-architecture";
import { canonicalizeProductCode, programmeIdentityKey } from "@/lib/product-programme-operations/product-aliases";
import { deriveEmploymentFamily } from "@/lib/product-programme-operations/employment";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export type ProgrammeRegistryStatusFilter =
  | "all"
  | "published"
  | "draft"
  | "pending_approval"
  | "expired"
  | "superseded"
  | "incomplete";

export type ProgrammeRegistryFilters = {
  search: string;
  productCode: string;
  employmentType: string;
  constitution: string;
  status: ProgrammeRegistryStatusFilter;
  effectiveWindow: "all" | "effective" | "expired";
};

export const EMPTY_PROGRAMME_REGISTRY_FILTERS: ProgrammeRegistryFilters = {
  search: "",
  productCode: "all",
  employmentType: "all",
  constitution: "all",
  status: "all",
  effectiveWindow: "all",
};

function isExpired(program: EnterpriseLenderProgramRecord, now = Date.now()): boolean {
  const until = program.effectiveUntil?.trim();
  if (!until) return false;
  const ts = Date.parse(until);
  return Number.isFinite(ts) && ts < now;
}

function isEffective(program: EnterpriseLenderProgramRecord, now = Date.now()): boolean {
  const from = program.effectiveFrom?.trim();
  if (from) {
    const ts = Date.parse(from);
    if (Number.isFinite(ts) && ts > now) return false;
  }
  return !isExpired(program, now);
}

export function programmeStatusLabel(program: EnterpriseLenderProgramRecord): string {
  if (program.isDeleted) return "deleted";
  if (isExpired(program)) return "expired";
  if (program.publicationState === "superseded") return "superseded";
  if (program.isLivePublished && program.publicationState === "published") return "published";
  if (program.publicationState === "pending_approval") return "pending_approval";
  if (program.completenessState === "incomplete") return "incomplete";
  return program.publicationState ?? program.lifecycleStatus ?? program.status ?? "draft";
}

export function filterProgrammeRegistry(
  programs: EnterpriseLenderProgramRecord[],
  filters: ProgrammeRegistryFilters,
  now = Date.now(),
): EnterpriseLenderProgramRecord[] {
  const q = filters.search.trim().toLowerCase();
  const productWanted =
    filters.productCode !== "all" ? canonicalizeProductCode(filters.productCode) : null;

  return programs.filter((program) => {
    if (q) {
      const hay = [
        program.label,
        program.code,
        program.productCode,
        program.productVariantCode,
        (program.employmentTypes ?? []).join(" "),
        (program.legalConstitutions ?? []).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (productWanted && canonicalizeProductCode(program.productCode) !== productWanted) {
      return false;
    }
    if (filters.employmentType !== "all") {
      const types = program.employmentTypes ?? [];
      const family = deriveEmploymentFamily(types as never);
      const ok =
        types.includes(filters.employmentType) ||
        (filters.employmentType === "salaried" && family === "salaried") ||
        (filters.employmentType === "self_employed" &&
          (family === "self_employed" || family === "both")) ||
        (filters.employmentType === "both" && family === "both");
      if (!ok) return false;
    }
    if (
      filters.constitution !== "all" &&
      !(program.legalConstitutions ?? []).includes(filters.constitution)
    ) {
      return false;
    }
    const status = programmeStatusLabel(program);
    if (filters.status !== "all" && status !== filters.status) return false;
    if (filters.effectiveWindow === "expired" && !isExpired(program, now)) return false;
    if (filters.effectiveWindow === "effective" && !isEffective(program, now)) return false;
    return true;
  });
}

/** Collapse alias-only duplicates to one published lineage per lender + canonical product. */
export function dedupePublishedProgrammes(
  programs: EnterpriseLenderProgramRecord[],
): EnterpriseLenderProgramRecord[] {
  const published = programs.filter(isPublishedCommercialProgram);
  const seen = new Set<string>();
  const out: EnterpriseLenderProgramRecord[] = [];
  for (const program of published) {
    const key = programmeIdentityKey({
      lenderId: program.lenderId,
      productCode: program.productCode,
      lineageId: program.lineageId,
      id: program.id,
    });
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(program);
  }
  return out;
}

export function lineageVersions(
  programs: EnterpriseLenderProgramRecord[],
  lineageId: string | null | undefined,
): EnterpriseLenderProgramRecord[] {
  if (!lineageId) return [];
  return programs
    .filter((program) => program.lineageId === lineageId && !program.isDeleted)
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

export function draftRevisionFor(
  programs: EnterpriseLenderProgramRecord[],
  published: EnterpriseLenderProgramRecord,
): EnterpriseLenderProgramRecord | null {
  return (
    lineageVersions(programs, published.lineageId ?? published.id).find(
      (row) =>
        row.id !== published.id &&
        !row.isLivePublished &&
        (row.publicationState === "draft" || row.publicationState === "pending_approval"),
    ) ?? null
  );
}
