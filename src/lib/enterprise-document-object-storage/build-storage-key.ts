/**
 * Scoped storage key — never a public URL.
 * org + opportunity + document + version + hash so CHANAKYA cannot mix versions.
 */
export function buildDocumentObjectStorageKey(input: {
  organizationId: string;
  opportunityId: string;
  documentId: string;
  version: number;
  contentHash: string;
}): string {
  const org = String(input.organizationId || "").trim();
  const opp = String(input.opportunityId || "").trim();
  const doc = String(input.documentId || "").trim();
  const hash = String(input.contentHash || "").trim().slice(0, 64);
  const version = Math.max(1, Math.floor(Number(input.version) || 1));
  if (!org || !opp || !doc || !hash) {
    throw new Error("storage key requires organizationId, opportunityId, documentId, contentHash");
  }
  return `etd/${org}/${opp}/${doc}/v${version}/${hash}`;
}

/** Defense-in-depth: refuse keys that do not encode the expected opportunity. */
export function assertStorageKeyMatchesOpportunity(
  storageKey: string,
  organizationId: string,
  opportunityId: string,
): boolean {
  const prefix = `etd/${organizationId}/${opportunityId}/`;
  return String(storageKey || "").startsWith(prefix);
}
