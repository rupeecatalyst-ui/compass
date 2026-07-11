/**
 * EAF base asset factory — creates draft assets with full enterprise DNA.
 */

import { EAF_DEFAULT_LIFECYCLE_DEFINITION } from "@/constants/enterprise-asset-framework";
import type {
  EafAssetTypeCode,
  EafBaseAsset,
  EafExtendedAsset,
  EafMetadataBag,
} from "@/types/enterprise-asset-framework";
import { formatEafVersion, parseEafVersion } from "./version-engine";

export type CreateEafAssetDraftInput = {
  assetType: EafAssetTypeCode;
  assetName: string;
  description?: string;
  category?: string;
  tags?: string[];
  owner: string;
  createdBy: string;
  remarks?: string;
  effectiveFrom?: string;
  lifecycleDefinitionId?: string;
};

export function createEafAssetDraft(input: CreateEafAssetDraftInput): EafBaseAsset {
  const now = new Date().toISOString();
  const defaultState = EAF_DEFAULT_LIFECYCLE_DEFINITION.defaultStateCode;

  return {
    id: crypto.randomUUID(),
    assetType: input.assetType,
    assetName: input.assetName,
    description: input.description ?? "",
    lifecycleState: defaultState,
    category: input.category ?? "",
    tags: input.tags ?? [],
    owner: input.owner,
    createdBy: input.createdBy,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
    version: formatEafVersion(1, 0, 0),
    effectiveFrom: input.effectiveFrom,
    activeFlag: false,
    archiveFlag: false,
    remarks: input.remarks,
  };
}

export function createEafExtendedAssetDraft<TMetadata extends EafMetadataBag>(
  input: CreateEafAssetDraftInput & { metadata: TMetadata },
): EafExtendedAsset<TMetadata> {
  const base = createEafAssetDraft(input);
  return {
    ...base,
    metadata: input.metadata,
  };
}

export function applyEafBasePatch(
  asset: EafBaseAsset,
  patch: Partial<
    Pick<
      EafBaseAsset,
      | "assetName"
      | "description"
      | "category"
      | "tags"
      | "owner"
      | "remarks"
      | "effectiveFrom"
      | "effectiveTo"
      | "activeFlag"
      | "archiveFlag"
      | "publicIdentity"
    >
  >,
  modifiedBy: string,
): EafBaseAsset {
  return {
    ...asset,
    ...patch,
    modifiedBy,
    modifiedOn: new Date().toISOString(),
  };
}

export function bumpEafAssetVersion(asset: EafBaseAsset, bump: "major" | "minor" | "patch"): EafBaseAsset {
  const parsed = parseEafVersion(asset.version);
  const next =
    bump === "major"
      ? { major: parsed.major + 1, minor: 0, patch: 0 }
      : bump === "minor"
        ? { major: parsed.major, minor: parsed.minor + 1, patch: 0 }
        : { major: parsed.major, minor: parsed.minor, patch: parsed.patch + 1 };

  return {
    ...asset,
    version: formatEafVersion(next.major, next.minor, next.patch),
    modifiedOn: new Date().toISOString(),
  };
}
