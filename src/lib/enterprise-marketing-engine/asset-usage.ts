/**
 * CO-MARKETING-REDESIGN-011 — Usage history for Marketing assets.
 * Scans campaign versions and content templates. Not Document Registry.
 */

import { marketingCampaignStore } from "@server/services/enterprise-marketing-engine/campaign-store";
import { marketingTemplateStore } from "@server/services/enterprise-marketing-engine/template-store";
import type { MarketingAssetUsageReference } from "@/types/enterprise-marketing-assets";
import type { MarketingContentDocument } from "@/types/enterprise-marketing-campaign";

function documentUsesAsset(
  content: MarketingContentDocument | null | undefined,
  asset: { id: string; url: string; storageRef: string },
): boolean {
  if (!content?.blocks?.length) return false;
  return content.blocks.some((block) => {
    const props = block.props ?? {};
    const assetId = typeof props.assetId === "string" ? props.assetId : "";
    const url = typeof props.url === "string" ? props.url : "";
    const storageRef = typeof props.storageRef === "string" ? props.storageRef : "";
    return (
      assetId === asset.id ||
      (asset.url && url === asset.url) ||
      (asset.storageRef && (storageRef === asset.storageRef || url === asset.storageRef))
    );
  });
}

export function collectMarketingAssetUsage(input: {
  organizationId: string;
  id: string;
  url: string;
  storageRef: string;
}): MarketingAssetUsageReference[] {
  const refs: MarketingAssetUsageReference[] = [];
  const seen = new Set<string>();

  for (const campaign of marketingCampaignStore.listMemory(input.organizationId)) {
    const versions = marketingCampaignStore.listVersionsMemory(campaign.id);
    for (const version of versions) {
      if (!documentUsesAsset(version.content, input)) continue;
      const key = `campaign:${campaign.id}:${version.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({
        kind: "campaign",
        id: campaign.id,
        name: campaign.name,
        versionId: version.id,
        versionNumber: version.versionNumber,
      });
    }
  }

  for (const template of marketingTemplateStore.list(input.organizationId)) {
    if (!documentUsesAsset(template.content, input)) continue;
    const key = `template:${template.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({
      kind: "template",
      id: template.id,
      name: template.name,
      versionId: null,
      versionNumber: template.versionNumber,
    });
  }

  return refs;
}

export function marketingAssetIsReferenced(input: {
  organizationId: string;
  id: string;
  url: string;
  storageRef: string;
}): boolean {
  return collectMarketingAssetUsage(input).length > 0;
}

export function forbidDestructiveMarketingAssetDelete(): never {
  throw Object.assign(
    new Error("Referenced Marketing assets cannot be deleted. Archive them instead."),
    { statusCode: 409, code: "ASSET_DELETE_FORBIDDEN" },
  );
}
