/**
 * CO-MASTER-002 — Program-level LOD overlay on EDIE / Document Registry types.
 * Does not create a second document repository.
 */

import { EDIE_CATALOG } from "@/constants/edie-certified/document-catalog";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export type ProgramLodRequirement = {
  typeRef: string;
  mandatory: boolean;
  optional?: boolean;
  /** When set, requirement applies only to this employment path */
  applicability?: "all" | "salaried" | "self_employed" | "company";
  active?: boolean;
  label?: string;
};

export type ResolvedProgramLodItem = ProgramLodRequirement & {
  label: string;
  source: "program";
};

/** Normalize stored JSON (string[] or object[]) into ProgramLodRequirement[]. */
export function normalizeProgramLodRequirements(raw: unknown): ProgramLodRequirement[] {
  if (!Array.isArray(raw)) return [];
  const out: ProgramLodRequirement[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const typeRef = item.trim();
      if (!typeRef) continue;
      out.push({ typeRef, mandatory: true, active: true, applicability: "all" });
      continue;
    }
    if (item && typeof item === "object") {
      const row = item as Record<string, unknown>;
      const typeRef = String(row.typeRef ?? row.code ?? row.id ?? "").trim();
      if (!typeRef) continue;
      const mandatory = row.mandatory !== false && row.optional !== true;
      out.push({
        typeRef,
        mandatory,
        optional: !mandatory,
        applicability: (row.applicability as ProgramLodRequirement["applicability"]) || "all",
        active: row.active !== false,
        label: typeof row.label === "string" ? row.label : undefined,
      });
    }
  }
  return out;
}

export function programLodTypeRefs(requirements: ProgramLodRequirement[]): string[] {
  return [...new Set(requirements.map((r) => r.typeRef).filter(Boolean))];
}

function labelForTypeRef(typeRef: string, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim();
  const entries = Object.values(EDIE_CATALOG);
  const hit = entries.find((d) => d.typeRef === typeRef);
  if (hit?.label) return hit.label;
  const byKey = EDIE_CATALOG[typeRef];
  if (byKey?.label) return byKey.label;
  return typeRef.replace(/^doc:/, "").replace(/-/g, " ");
}

/**
 * Resolve program LOD for a lender/product/program (+ optional employment).
 * Different programs (e.g. Salaried vs Self-employed) carry different requiredDocumentTypeIds.
 */
export function resolveProgramLod(input: {
  program: Pick<
    EnterpriseLenderProgramRecord,
    | "id"
    | "label"
    | "employmentType"
    | "borrowerType"
    | "requiredDocumentTypeIds"
    | "requiredDocuments"
  >;
  employmentType?: string | null;
}): ResolvedProgramLodItem[] {
  const raw =
    input.program.requiredDocuments ??
    input.program.requiredDocumentTypeIds ??
    [];
  const requirements = normalizeProgramLodRequirements(raw);
  const employment = (input.employmentType || input.program.employmentType || "")
    .trim()
    .toLowerCase();

  return requirements
    .filter((r) => r.active !== false)
    .filter((r) => {
      const a = r.applicability || "all";
      if (a === "all") return true;
      if (!employment) return true;
      if (a === "salaried") return employment.includes("salaried");
      if (a === "self_employed")
        return employment.includes("self") || employment.includes("business");
      if (a === "company") return employment.includes("company") || employment.includes("corporate");
      return true;
    })
    .map((r) => ({
      ...r,
      label: labelForTypeRef(r.typeRef, r.label),
      source: "program" as const,
    }));
}

/** EDIE catalog options for admin LOD configuration. */
export function listEdieDocumentTypeOptions(): { typeRef: string; label: string }[] {
  return Object.values(EDIE_CATALOG).map((d) => ({
    typeRef: d.typeRef,
    label: d.label,
  }));
}
