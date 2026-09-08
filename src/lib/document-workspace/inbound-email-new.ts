/**
 * "New from Email" is user-specific and version-specific.
 * Loading the workspace never clears it.
 */

export type InboundEmailNewCandidate = {
  documentId: string;
  versionKey: string;
  uploadSource?: string | null;
  ownerEntityId?: string | null;
  contactId?: string | null;
  opportunityId?: string | null;
  dealId?: string | null;
  deleted?: boolean;
  newEligible?: boolean;
};

export function inboundEmailVersionKey(input: {
  versionId?: string | null;
  versionNumber?: number | null;
  uploadedAt?: string | null;
}): string {
  return (
    input.versionId?.trim() ||
    `v${input.versionNumber ?? 1}:${input.uploadedAt?.trim() || "current"}`
  );
}

export function isInboundEmailDocument(uploadSource?: string | null): boolean {
  return uploadSource === "email";
}

export function filterUnseenInboundEmailDocuments(input: {
  candidates: InboundEmailNewCandidate[];
  seenKeys: Array<{ documentId: string; versionKey: string }>;
}): InboundEmailNewCandidate[] {
  const seen = new Set(input.seenKeys.map((row) => `${row.documentId}::${row.versionKey}`));
  return input.candidates.filter((candidate) => {
    if (!isInboundEmailDocument(candidate.uploadSource)) return false;
    if (candidate.deleted) return false;
    if (candidate.newEligible === false) return false;
    return !seen.has(`${candidate.documentId}::${candidate.versionKey}`);
  });
}

export function countUnseenInboundByOwner(input: {
  unseen: Array<{ ownerEntityId?: string | null; contactId?: string | null }>;
}): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of input.unseen) {
    const owner = row.ownerEntityId?.trim() || row.contactId?.trim();
    if (!owner) continue;
    counts[owner] = (counts[owner] ?? 0) + 1;
  }
  return counts;
}

export function countUnseenInboundByTransaction(input: {
  unseen: Array<{ opportunityId?: string | null; dealId?: string | null }>;
}): { byOpportunity: Record<string, number>; byDeal: Record<string, number> } {
  const byOpportunity: Record<string, number> = {};
  const byDeal: Record<string, number> = {};
  for (const row of input.unseen) {
    const opportunityId = row.opportunityId?.trim();
    const dealId = row.dealId?.trim();
    if (opportunityId) byOpportunity[opportunityId] = (byOpportunity[opportunityId] ?? 0) + 1;
    if (dealId) byDeal[dealId] = (byDeal[dealId] ?? 0) + 1;
  }
  return { byOpportunity, byDeal };
}
