/**
 * Immutable LOD snapshot helpers + dimension fingerprint (CO-DOC-001 BAT).
 */

import type {
  DocumentRequestItemState,
  DocumentRequestLodItem,
  DocumentRequestLodVersionSnapshot,
} from "@/types/document-requests";
import type { LoanParticipant } from "@/types/loan-participant";

export function getDocumentRequestRef(
  item: Pick<DocumentRequestLodItem, "requestRef" | "typeRef">,
): string {
  return item.requestRef?.trim() || item.typeRef;
}

export function buildLodStructureKey(
  participants: LoanParticipant[],
  secured: boolean,
): string {
  return `${participants
    .filter((participant) => participant.status !== "inactive")
    .map(
      (participant) =>
        `${participant.id}:${participant.role ?? ""}:${participant.entityType}:${participant.constitution ?? ""}`,
    )
    .join("|")}#${secured ? "secured" : "unsecured"}`;
}

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
 * Preserve uploaded/verified linkages; brand-new typeRefs remain unrequested
 * (`pending` internally) until the user explicitly sends them.
 * Deduplicate by requestRef so the same master document can belong to
 * multiple Loan Structure participants without sharing request state.
 */
export function mergeLodItemsWithPrior(
  generated: DocumentRequestLodItem[],
  priorItems: DocumentRequestItemState[],
  nowIso: string,
): DocumentRequestItemState[] {
  const priorByRef = new Map<string, DocumentRequestItemState>();
  for (const item of priorItems) {
    const ref = getDocumentRequestRef(item);
    if (!priorByRef.has(ref)) priorByRef.set(ref, item);
  }

  const seen = new Set<string>();
  const merged: DocumentRequestItemState[] = [];

  for (const item of generated) {
    const ref = getDocumentRequestRef(item);
    if (seen.has(ref)) continue;
    seen.add(ref);
    const prior = priorByRef.get(ref);
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
        receivedSource: prior.receivedSource,
        custom: prior.custom,
        addedAt: prior.addedAt,
        addedBy: prior.addedBy,
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
        receivedSource: prior.receivedSource,
        custom: prior.custom,
        addedAt: prior.addedAt,
        addedBy: prior.addedBy,
      });
      continue;
    }
    if (prior?.status === "requested") {
      merged.push({
        ...item,
        status: "requested",
        requestedOn: prior.requestedOn ?? nowIso,
        reminderStatus: prior.reminderStatus ?? "none",
        lastReminderAt: prior.lastReminderAt,
        remarks: prior.remarks,
      });
      continue;
    }
    merged.push({
      ...item,
      status: "pending",
      reminderStatus: "none",
    });
  }

  // Manual requirements are Opportunity-specific additions, not Document Master
  // rows. Keep them when the generated master checklist is regenerated.
  for (const prior of priorItems) {
    const ref = getDocumentRequestRef(prior);
    if (!prior.custom || seen.has(ref)) continue;
    seen.add(ref);
    merged.push(prior);
  }

  return merged;
}

export function nextLodVersionNumber(versions: DocumentRequestLodVersionSnapshot[]): number {
  if (!versions.length) return 1;
  return Math.max(...versions.map((v) => v.versionNumber)) + 1;
}
