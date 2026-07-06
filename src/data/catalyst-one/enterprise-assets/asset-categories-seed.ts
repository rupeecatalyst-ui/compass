import type { EnterpriseAssetCategory } from "@/types/enterprise-asset-library";

/** Generic asset categories — not hardcoded to a single asset type. */
export const DEFAULT_ENTERPRISE_ASSET_CATEGORIES: EnterpriseAssetCategory[] = [
  {
    id: "eal_cat_lending",
    categoryCode: "LENDING",
    categoryName: "Lending Operations",
    description: "Reusable assets for retail and commercial lending products.",
    sortOrder: 1,
    enabled: true,
  },
  {
    id: "eal_cat_operations",
    categoryCode: "OPERATIONS",
    categoryName: "Operations",
    description: "SLA, checklist, and operational workflow assets.",
    sortOrder: 2,
    enabled: true,
  },
  {
    id: "eal_cat_compliance",
    categoryCode: "COMPLIANCE",
    categoryName: "Compliance & Risk",
    description: "Regulatory and compliance reference packs.",
    sortOrder: 3,
    enabled: true,
  },
  {
    id: "eal_cat_customer",
    categoryCode: "CUSTOMER",
    categoryName: "Customer Experience",
    description: "Notifications, UI experience, and customer journey assets.",
    sortOrder: 4,
    enabled: true,
  },
  {
    id: "eal_cat_platform",
    categoryCode: "PLATFORM",
    categoryName: "Platform Extensions",
    description: "Integration, AI, and custom extension assets.",
    sortOrder: 5,
    enabled: true,
  },
];
