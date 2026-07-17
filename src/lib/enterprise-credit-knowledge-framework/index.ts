import { ECKF_PRODUCT_NAV } from "@/constants/enterprise-credit-knowledge-framework";
import { HOME_LOAN_BLUEPRINT } from "@/constants/enterprise-credit-knowledge-framework/home-loan-blueprint";
import type {
  EckfProductBlueprint,
  EckfProductId,
} from "@/types/enterprise-credit-knowledge-framework";

export function listEckfProducts() {
  return ECKF_PRODUCT_NAV;
}

export function getEckfProductBlueprint(productId: EckfProductId): EckfProductBlueprint | null {
  if (productId === "home-loan") return HOME_LOAN_BLUEPRINT;
  return null;
}

export function getDefaultEckfProductId(): EckfProductId {
  return "home-loan";
}
