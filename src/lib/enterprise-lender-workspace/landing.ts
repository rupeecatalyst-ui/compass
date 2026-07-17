import { ELW_DEFAULT_PRODUCTS } from "@/constants/enterprise-lender-workspace";
import { listElwRegistryEntries } from "./derive-profile";
import type {
  ElwLenderLandingCard,
  ElwRelationshipStatus,
} from "@/types/enterprise-lender-workspace";

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusFor(contactCount: number): ElwRelationshipStatus {
  if (contactCount >= 3) return "active";
  if (contactCount >= 1) return "building";
  return "onboarding";
}

/** Premium landing cards for Lender Master. */
export function listElwLandingCards(): ElwLenderLandingCard[] {
  return listElwRegistryEntries().map((entry) => {
    const products =
      entry.productCount > 0
        ? ELW_DEFAULT_PRODUCTS.slice(0, Math.max(2, Math.min(4, entry.productCount))).map(
            (p) => p.label,
          )
        : ELW_DEFAULT_PRODUCTS.slice(0, 3).map((p) => p.label);

    const cities = entry.headquartersCity
      ? [entry.headquartersCity, "Pune", "Bengaluru"].slice(0, entry.contactCount > 0 ? 3 : 1)
      : ["Mumbai", "Delhi NCR"];

    return {
      lenderId: entry.lenderId,
      lenderRef: entry.lenderRef,
      name: entry.name,
      logoInitials: initials(entry.name) || "LN",
      productsOffered: products,
      citiesCovered: cities,
      relationshipStatus: statusFor(entry.contactCount),
      lastPolicyUpdate: "12 Jul 2026",
      primaryContactName:
        entry.contactCount > 0 ? `Primary RM · ${entry.name.split(" ")[0]} Desk` : null,
    };
  });
}
