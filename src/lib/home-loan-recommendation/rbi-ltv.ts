import type { RegulatoryLtvSlab } from "@/constants/home-loan-recommendation/rbi-ltv-slabs";
import { AUTHORISED_INDIVIDUAL_HOUSING_LTV_SLABS } from "@/constants/home-loan-recommendation/rbi-ltv-slabs";

export type RegulatoryLtvResult = {
  propertyValueRupees: number;
  maxValidLoanAmountRupees: number;
  appliedLtvPercent: number;
  slabMaxLoanAmountRupeesInclusive: number | null;
  provenance: "authorised_library_default" | "active_master";
};

function floorRupees(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

/**
 * Highest loan amount that is valid under slab-based LTV:
 * the resulting loan must sit inside a slab whose LTV ceiling covers that amount.
 */
export function calculateRegulatoryMaxLoanAmount(input: {
  propertyValueRupees: number;
  slabs?: readonly RegulatoryLtvSlab[];
  provenance?: RegulatoryLtvResult["provenance"];
}): RegulatoryLtvResult {
  const propertyValueRupees = floorRupees(input.propertyValueRupees);
  const slabs = [...(input.slabs ?? AUTHORISED_INDIVIDUAL_HOUSING_LTV_SLABS)].sort((a, b) => {
    const aMax = a.maxLoanAmountRupeesInclusive ?? Number.POSITIVE_INFINITY;
    const bMax = b.maxLoanAmountRupeesInclusive ?? Number.POSITIVE_INFINITY;
    return aMax - bMax;
  });

  let previousMax = 0;
  let bestAmount = 0;
  let bestSlab: RegulatoryLtvSlab | null = null;

  for (const slab of slabs) {
    const slabCap = slab.maxLoanAmountRupeesInclusive;
    const ltvAmount = floorRupees((propertyValueRupees * slab.maxLtvPercent) / 100);
    const candidate = slabCap == null ? ltvAmount : Math.min(slabCap, ltvAmount);
    if (candidate > previousMax) {
      bestAmount = candidate;
      bestSlab = slab;
    }
    previousMax = slabCap ?? Number.POSITIVE_INFINITY;
  }

  const appliedLtvPercent =
    propertyValueRupees > 0 && bestAmount > 0
      ? Math.round((bestAmount / propertyValueRupees) * 10000) / 100
      : bestSlab?.maxLtvPercent ?? 0;

  return {
    propertyValueRupees,
    maxValidLoanAmountRupees: bestAmount,
    appliedLtvPercent,
    slabMaxLoanAmountRupeesInclusive: bestSlab?.maxLoanAmountRupeesInclusive ?? null,
    provenance: input.provenance ?? "authorised_library_default",
  };
}

export function applyStricterLenderLtvCap(input: {
  regulatoryMaxRupees: number;
  propertyValueRupees: number;
  lenderMaxLtvPercent: number | null | undefined;
}): { amountRupees: number; appliedLtvPercent: number | null; capSource: "regulatory" | "lender" } {
  const regulatory = floorRupees(input.regulatoryMaxRupees);
  if (input.lenderMaxLtvPercent == null || !Number.isFinite(input.lenderMaxLtvPercent)) {
    return {
      amountRupees: regulatory,
      appliedLtvPercent: null,
      capSource: "regulatory",
    };
  }
  const lenderCap = floorRupees((floorRupees(input.propertyValueRupees) * input.lenderMaxLtvPercent) / 100);
  if (lenderCap < regulatory) {
    return {
      amountRupees: lenderCap,
      appliedLtvPercent: input.lenderMaxLtvPercent,
      capSource: "lender",
    };
  }
  return {
    amountRupees: regulatory,
    appliedLtvPercent: input.lenderMaxLtvPercent,
    capSource: "regulatory",
  };
}
