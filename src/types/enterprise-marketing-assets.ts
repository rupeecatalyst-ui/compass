/**
 * CO-MARKETING-REDESIGN-011 — Organisation-scoped Marketing Asset Library.
 * Separate from Enterprise Document Registry / Opportunity documents.
 */

import type {
  MarketingAssetApprovalStatus,
  MarketingAssetProductCategory,
  MarketingAssetType,
} from "@/constants/enterprise-marketing-engine/assets";
import type { MarketingAssetCategory } from "@/constants/enterprise-marketing-engine/content";

export type MarketingAssetUsageKind = "campaign" | "template";

export type MarketingAssetUsageReference = {
  kind: MarketingAssetUsageKind;
  id: string;
  name: string;
  versionId?: string | null;
  versionNumber?: number | null;
};

export type MarketingAssetVersion = {
  versionNumber: number;
  storageRef: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  altText: string;
  uploadedByUserId: string | null;
  uploadedAt: string;
  checksum: string;
};

export type MarketingAssetRecord = {
  id: string;
  organizationId: string;
  name: string;
  /** Compatibility alias used by MKT-04/08 — same as name. */
  title: string;
  assetType: MarketingAssetType;
  /** Legacy campaign creative grouping (logo/banner/hero/…). */
  category: MarketingAssetCategory;
  mimeType: string;
  storageProvider: "fixture";
  storageRef: string;
  /** Fixture preview URL (data: or https reference). Never a Hostinger put. */
  url: string;
  byteSize: number;
  fileSize: number;
  width: number | null;
  height: number | null;
  uploadedByUserId: string | null;
  uploadedAt: string;
  tags: string[];
  productCategory: MarketingAssetProductCategory;
  approvalStatus: MarketingAssetApprovalStatus;
  altText: string;
  usageReferences: MarketingAssetUsageReference[];
  archived: boolean;
  active: boolean;
  permissionScope: "ORG_MARKETING";
  currentVersionNumber: number;
  versions: MarketingAssetVersion[];
  checksum: string;
  suggestedMaxWidth?: number | null;
  optimizationWarnings?: string[];
  createdAt: string;
  updatedAt: string;
};

export type MarketingAssetSelectPayload = {
  assetId: string;
  organizationId: string;
  url: string;
  alt: string;
  assetType: MarketingAssetType;
  name: string;
};
