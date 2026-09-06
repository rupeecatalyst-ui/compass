import { EDIE_CATALOG } from "@/constants/edie-certified/document-catalog";
import { normalizeProgramLodRequirements, type ProgramLodRequirement } from "@/lib/document-requests/resolve-program-lod";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export type MergedLodItem = ProgramLodRequirement & { source: "edie" | "programme_overlay"; label: string };

/**
 * EDIE remains the catalogue and baseline. Published programme required documents overlay it.
 * Programme overlay wins on the same typeRef (mandatory/optional/applicability).
 */
export function mergeEdieAndProgrammeLod(input: {
  edieTypeRefs: string[];
  program?: Pick<EnterpriseLenderProgramRecord, "requiredDocuments" | "requiredDocumentTypeIds"> | null;
}): MergedLodItem[] {
  const byRef = new Map<string, MergedLodItem>();
  for (const typeRef of input.edieTypeRefs) {
    const catalog = Object.values(EDIE_CATALOG).find((item) => item.typeRef === typeRef);
    byRef.set(typeRef, {
      typeRef,
      mandatory: catalog?.defaultSeverity === "mandatory",
      active: true,
      applicability: "all",
      label: catalog?.label ?? typeRef,
      source: "edie",
    });
  }
  const overlay = normalizeProgramLodRequirements(
    (input.program?.requiredDocuments && input.program.requiredDocuments.length > 0
      ? input.program.requiredDocuments
      : input.program?.requiredDocumentTypeIds) ?? [],
  );
  for (const item of overlay) {
    const catalog = Object.values(EDIE_CATALOG).find((entry) => entry.typeRef === item.typeRef);
    byRef.set(item.typeRef, {
      ...item,
      label: item.label ?? catalog?.label ?? item.typeRef,
      source: "programme_overlay",
    });
  }
  return [...byRef.values()];
}
