import type { ProductCompositionAsset } from "@/types/product-library";

export const EMPTY_COMPOSITION_ASSETS: ProductCompositionAsset[] = [];

/** Full enterprise composition blueprint for Home Loan v2 — EAL-ready metadata. */
export const HOME_LOAN_V2_COMPOSITION_ASSETS: ProductCompositionAsset[] = [
  { assetId: "asset_001", assetType: "DOCUMENT_PACK", version: "v1.0", status: "published", description: "Home loan mandatory document pack" },
  { assetId: "asset_002", assetType: "SLA_PACK", version: "v1.0", status: "published", description: "Standard SLA pack for retail lending" },
  { assetId: "asset_003", assetType: "NOTIFICATION_PACK", version: "v1.0", status: "published", description: "Home loan lifecycle notification templates" },
  { assetId: "asset_004", assetType: "CHECKLIST_PACK", version: "v1.0", status: "published", description: "Home loan origination checklist" },
  { assetId: "asset_005", assetType: "COMPLIANCE_PACK", version: "v1.0", status: "published", description: "RBI retail lending compliance pack" },
  { assetId: "asset_006", assetType: "FEE_TEMPLATE", version: "v1.0", status: "published", description: "Standard fee schedule template" },
  { assetId: "asset_007", assetType: "CALCULATOR", version: "v1.0", status: "published", description: "Home loan EMI calculator pack — metadata only" },
  { assetId: "asset_008", assetType: "AI_PROMPT", version: "v0.1", status: "draft", description: "Home loan AI assistant prompt pack — reserved" },
  { assetId: "asset_009", assetType: "API_INTEGRATION", version: "v2.0", status: "published", description: "CIBIL bureau integration pack reference" },
  { assetId: "asset_010", assetType: "UI_EXPERIENCE", version: "v1.0", status: "published", description: "Home loan customer UI experience pack" },
];

export const LAP_COMPOSITION_ASSETS: ProductCompositionAsset[] = [
  { assetId: "asset_lap_001", assetType: "DOCUMENT_PACK", version: "v1.0", status: "published", description: "LAP property document pack" },
  { assetId: "asset_lap_002", assetType: "SLA_PACK", version: "v1.0", status: "published", description: "Standard SLA pack for retail lending" },
  { assetId: "asset_lap_003", assetType: "FEE_TEMPLATE", version: "v1.0", status: "published", description: "Standard fee schedule template" },
  { assetId: "asset_lap_004", assetType: "CHECKLIST_PACK", version: "v1.0", status: "published", description: "LAP origination checklist" },
  { assetId: "asset_lap_005", assetType: "API_INTEGRATION", version: "v2.0", status: "published", description: "CIBIL bureau integration pack reference" },
  { assetId: "asset_lap_006", assetType: "COMPLIANCE_PACK", version: "v1.0", status: "published", description: "RBI secured lending compliance pack" },
];

export const PERSONAL_LOAN_COMPOSITION_ASSETS: ProductCompositionAsset[] = [
  { assetId: "asset_pl_001", assetType: "DOCUMENT_PACK", version: "v1.0", status: "published", description: "Personal loan KYC document pack" },
  { assetId: "asset_pl_002", assetType: "SLA_PACK", version: "v1.0", status: "published", description: "Express SLA pack for unsecured products" },
  { assetId: "asset_pl_003", assetType: "NOTIFICATION_PACK", version: "v1.0", status: "published", description: "Personal loan notification templates" },
  { assetId: "asset_pl_004", assetType: "FEE_TEMPLATE", version: "v1.0", status: "published", description: "Standard fee schedule template" },
  { assetId: "asset_pl_005", assetType: "CALCULATOR", version: "v1.0", status: "published", description: "Personal loan calculator pack — metadata only" },
  { assetId: "asset_pl_006", assetType: "API_INTEGRATION", version: "v1.0", status: "published", description: "eKYC integration pack reference" },
  { assetId: "asset_pl_007", assetType: "UI_EXPERIENCE", version: "v1.0", status: "published", description: "Personal loan customer UI experience pack" },
];

export const WORKING_CAPITAL_COMPOSITION_ASSETS: ProductCompositionAsset[] = [
  { assetId: "asset_wc_001", assetType: "SLA_PACK", version: "v1.0", status: "published", description: "Standard SLA pack for SME lending" },
  { assetId: "asset_wc_002", assetType: "FEE_TEMPLATE", version: "v0.9", status: "draft", description: "SME fee schedule template" },
];

export const MUTUAL_FUND_COMPOSITION_ASSETS: ProductCompositionAsset[] = [
  { assetId: "asset_mf_001", assetType: "COMPLIANCE_PACK", version: "v0.1", status: "draft", description: "SEBI mutual fund distribution compliance pack" },
];
