/**
 * CO-MARKETING-REDESIGN-011 — Marketing Asset Library constants.
 * Campaign collateral only. Not the Enterprise Document Registry.
 * Fixture storage only — never Hostinger or an external provider.
 */

export const MARKETING_ASSET_TYPES = [
  "image",
  "logo",
  "campaign_banner",
  "email_header",
  "social_creative",
  "video",
  "pdf",
  "collateral",
] as const;

export type MarketingAssetType = (typeof MARKETING_ASSET_TYPES)[number];

export const MARKETING_ASSET_TYPE_LABELS: Record<MarketingAssetType, string> = {
  image: "Image",
  logo: "Logo",
  campaign_banner: "Campaign banner",
  email_header: "Email header image",
  social_creative: "Social-media creative",
  video: "Video (reference / downloadable)",
  pdf: "PDF",
  collateral: "Approved campaign collateral",
};

export const MARKETING_ASSET_APPROVAL_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;

export type MarketingAssetApprovalStatus = (typeof MARKETING_ASSET_APPROVAL_STATUSES)[number];

export const MARKETING_ASSET_PRODUCT_CATEGORIES = [
  "Home Loan",
  "LAP",
  "Business Loan",
  "Personal Loan",
  "Insurance",
  "Mutual Fund",
  "General",
  "Unspecified",
] as const;

export type MarketingAssetProductCategory = (typeof MARKETING_ASSET_PRODUCT_CATEGORIES)[number];

export const MARKETING_ASSET_STORAGE_PROVIDER = "fixture" as const;

export const MARKETING_ASSET_FIXTURE_SCHEME = "fixture://marketing-assets" as const;

export const MARKETING_SELECTED_ASSET_STORAGE_KEY = "catalyst.marketing.selectedAsset" as const;

/** Image MIME types accepted for visual campaign assets. SVG is rejected (scriptable). */
export const MARKETING_ASSET_ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MARKETING_ASSET_ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;

export const MARKETING_ASSET_ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf"] as const;

export const MARKETING_ASSET_ALLOWED_MIME_TYPES = [
  ...MARKETING_ASSET_ALLOWED_IMAGE_MIME_TYPES,
  ...MARKETING_ASSET_ALLOWED_VIDEO_MIME_TYPES,
  ...MARKETING_ASSET_ALLOWED_DOCUMENT_MIME_TYPES,
] as const;

export const MARKETING_ASSET_DANGEROUS_MIME_TYPES = [
  "application/javascript",
  "text/javascript",
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-executable",
  "application/x-sh",
  "application/x-bat",
  "application/octet-stream",
] as const;

export const MARKETING_ASSET_DANGEROUS_EXTENSIONS = [
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".js",
  ".mjs",
  ".html",
  ".htm",
  ".svg",
  ".php",
  ".sh",
  ".ps1",
] as const;

export const MARKETING_ASSET_IMAGE_BLOCK_TYPES = [
  "image",
  "logo",
  "hero_image",
  "image_text",
] as const;

export const MARKETING_ASSET_DOCUMENT_REGISTRY_NOTICE =
  "Marketing Asset Library is campaign collateral only. Transaction documents remain in the Enterprise Document Registry." as const;

export const MARKETING_ASSET_FIXTURE_NOTICE =
  "Assets are stored in local fixture storage. Nothing is uploaded to Hostinger or an external provider." as const;
