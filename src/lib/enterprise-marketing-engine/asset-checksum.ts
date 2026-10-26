export type MarketingAssetChecksumCandidate = {
  id: string;
  organizationId: string;
  checksum: string;
  name: string;
  approvalStatus: string;
  archived: boolean;
};

export function findMarketingAssetChecksumDuplicate(
  assets: Iterable<MarketingAssetChecksumCandidate>,
  input: { organizationId: string; checksum: string; exceptId?: string | null },
): MarketingAssetChecksumCandidate | null {
  const checksum = input.checksum.trim();
  if (!checksum) return null;
  for (const asset of assets) {
    if (asset.organizationId !== input.organizationId) continue;
    if (input.exceptId && asset.id === input.exceptId) continue;
    if (asset.checksum === checksum) return asset;
  }
  return null;
}
