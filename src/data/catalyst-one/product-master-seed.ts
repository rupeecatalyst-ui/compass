import type { LendingType } from "@/types/catalyst-one";
import { CANONICAL_PRODUCT_MASTER_SEED } from "@/constants/enterprise-product-master";

/**
 * CRC-10.3 / CO-ADMIN-005 — Product Master seed (Admin Product Master overrides at runtime via registry).
 */
export interface ProductMasterEntry {
  id: string;
  name: string;
  isSecured: boolean;
  enabled: boolean;
  lendingType: LendingType;
  sortOrder: number;
}

export const DEFAULT_PRODUCT_MASTER: ProductMasterEntry[] =
  CANONICAL_PRODUCT_MASTER_SEED.map((p) => ({
    id: p.code.toLowerCase(),
    name: p.label,
    isSecured: p.isSecured,
    enabled: true,
    lendingType: (p.isSecured ? "secured" : "unsecured") as LendingType,
    sortOrder: p.sortOrder,
  }));
