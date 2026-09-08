/**
 * "New from Email" is user-specific and version-specific.
 * Loading the workspace never clears it.
 */

export type InboundEmailNewCandidate = {
  documentId: string;
  versionKey: string;
  uploadSource?: string | null;
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
    return !seen.has(`${candidate.documentId}::${candidate.versionKey}`);
  });
}
