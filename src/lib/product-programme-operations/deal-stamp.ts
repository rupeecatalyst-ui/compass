import { citePublishedProgramme, type ProgrammeCitation } from "@/lib/product-programme-operations/proposal-citation";
import { canCitePublishedProgramme } from "@/lib/product-programme-operations/legacy-review";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export const DEAL_PROGRAMME_STAMP_KEY = "publishedProgrammeStamp" as const;

export type DealProgrammeStamp = ProgrammeCitation & {
  stampedAt: string;
  lineageId: string | null;
};

export function stampDealProgrammeSelection(input: {
  snapshot?: Record<string, unknown> | null;
  program: EnterpriseLenderProgramRecord;
  now?: string;
}): Record<string, unknown> {
  const snapshot = { ...(input.snapshot ?? {}) };
  if (!canCitePublishedProgramme(input.program)) {
    return snapshot;
  }
  const citation = citePublishedProgramme(input.program);
  const stamp: DealProgrammeStamp = {
    ...citation,
    lineageId: input.program.lineageId ?? input.program.id,
    stampedAt: input.now ?? new Date().toISOString(),
  };
  snapshot[DEAL_PROGRAMME_STAMP_KEY] = stamp;
  return snapshot;
}

export function readDealProgrammeStamp(
  snapshot: unknown,
): DealProgrammeStamp | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const raw = (snapshot as Record<string, unknown>)[DEAL_PROGRAMME_STAMP_KEY];
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<DealProgrammeStamp>;
  if (!row.programmeId || row.programmeVersion == null) return null;
  return row as DealProgrammeStamp;
}

/**
 * Existing Opportunity / Deal stamps stay on the selected published version.
 * A newly published version must not replace a prior stamp.
 */
export function preserveExistingProgrammeStamp(
  existing: DealProgrammeStamp | null,
  incoming: DealProgrammeStamp,
): DealProgrammeStamp {
  if (!existing) return incoming;
  return existing;
}
