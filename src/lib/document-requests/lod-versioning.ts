/**
 * Immutable LOD snapshot helpers + dimension fingerprint (CO-DOC-001 BAT).
 */

import type {
  DocumentRequestItemState,
  DocumentRequestLodItem,
  DocumentRequestLodVersionSnapshot,
} from "@/types/document-requests";

export function normalizeLodDimension(value?: string | null): string {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildLodDimensionKey(input: {
  borrowerTypeLabel: string;
  productLabel: string;
  constitutionLabel: string;
}): string {
  return [
    normalizeLodDimension(input.borrowerTypeLabel),
    normalizeLodDimension(input.productLabel),
    normalizeLodDimension(input.constitutionLabel || "n/a"),
  ].join("|");
}

export function hasLodDimensionDrift(
  active: DocumentRequestLodVersionSnapshot | undefined,
  next: { borrowerTypeLabel: string; productLabel: string; constitutionLabel: string },
): boolean {
  if (!active) return false;
  return active.dimensionKey !== buildLodDimensionKey(next);
}

/**
 * Merge newly generated LOD with prior item state.
 * Preserve uploaded/verified linkages; only brand-new typeRefs become Pending.
 * Deduplicate by typeRef (never two pending rows for one document type).
 */
export function mergeLodItemsWithPrior(
  generated: DocumentRequestLodItem[],
  priorItems: DocumentRequestItemState[],
  nowIso: string,
): DocumentRequestItemState[] {
  const priorByRef = new Map<string, DocumentRequestItemState>();
  for (const item of priorItems) {
    if (!priorByRef.has(item.typeRef)) priorByRef.set(item.typeRef, item);
  }

  const seen = new Set<string>();
  const merged: DocumentRequestItemState[] = [];

  for (const item of generated) {
    if (seen.has(item.typeRef)) continue;
    seen.add(item.typeRef);
    const prior = priorByRef.get(item.typeRef);
    if (
      prior &&
      (prior.registryRecordId ||
        prior.status === "uploaded" ||
        prior.status === "under_verification" ||
        prior.status === "verified")
    ) {
      merged.push({
        ...item,
        status: prior.status === "pending" || prior.status === "requested"
          ? "under_verification"
          : prior.status,
        requestedOn: prior.requestedOn ?? nowIso,
        reminderStatus: prior.reminderStatus ?? "none",
        lastReminderAt: prior.lastReminderAt,
        remarks: prior.remarks,
        uploadedAt: prior.uploadedAt,
        registryRecordId: prior.registryRecordId,
      });
      continue;
    }
    if (prior && (prior.status === "rejected" || prior.status === "re_upload_required")) {
      merged.push({
        ...item,
        status: "re_upload_required",
        requestedOn: prior.requestedOn ?? nowIso,
        reminderStatus: prior.reminderStatus ?? "none",
        lastReminderAt: prior.lastReminderAt,
        remarks: prior.remarks,
        uploadedAt: prior.uploadedAt,
        registryRecordId: prior.registryRecordId,
      });
      continue;
    }
    merged.push({
      ...item,
      status: "pending",
      requestedOn: nowIso,
      reminderStatus: "none",
    });
  }

  return merged;
}

export function nextLodVersionNumber(versions: DocumentRequestLodVersionSnapshot[]): number {
  if (!versions.length) return 1;
  return Math.max(...versions.map((v) => v.versionNumber)) + 1;
}
