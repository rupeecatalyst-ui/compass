/**
 * EFOE partner financial visibility — operational visibility, not accounting.
 */

import type { EfoePartnerFinancialVisibility } from "@/types/enterprise-financial-operations-engine";
import { getEfoePorts } from "./composition";

export function computeEfoePartnerFinancialVisibility(partnerRef: string): EfoePartnerFinancialVisibility {
  const beneficiary = getEfoePorts()
    .beneficiaries.list()
    .find((b) => b.beneficiaryRef === partnerRef);

  if (!beneficiary) {
    return {
      partnerRef,
      revenuePending: 0,
      revenueRecognized: 0,
      revenueUnderSettlement: 0,
      settlementReleased: 0,
      settlementPending: 0,
      agreementStatus: "unknown",
      pendingDocuments: [],
      bonusEligibility: false,
      computedOn: new Date().toISOString(),
    };
  }

  const distributions = getEfoePorts().distributions.listByBeneficiary(beneficiary.id);
  const settlements = getEfoePorts().settlements.listByBeneficiary(beneficiary.id);
  const eligibility = getEfoePorts().settlementEligibilities.findByBeneficiary(beneficiary.id);

  const revenueRecognized = distributions
    .filter((d) => d.status === "allocated" || d.status === "distributed")
    .reduce((sum, d) => sum + d.allocatedAmount, 0);

  const settlementReleased = settlements
    .filter((s) => s.status === "released")
    .reduce((sum, s) => sum + s.amount, 0);

  const settlementPending = settlements
    .filter((s) => s.status === "pending" || s.status === "processing")
    .reduce((sum, s) => sum + s.amount, 0);

  const revenueUnderSettlement = settlementPending;

  const pendingRecognitions = getEfoePorts()
    .revenueRecognitions.list()
    .filter((r) => r.status === "pending");
  const revenuePending = pendingRecognitions.reduce((sum, r) => sum + r.recognizedAmount, 0);

  return {
    partnerRef,
    revenuePending,
    revenueRecognized,
    revenueUnderSettlement,
    settlementReleased,
    settlementPending,
    agreementStatus: eligibility?.satisfied ? "compliant" : "pending_documents",
    pendingDocuments: eligibility?.pendingRequirements ?? [],
    bonusEligibility: getEfoePorts().bonuses.listByBeneficiary(beneficiary.id).some((b) => b.status === "eligible"),
    computedOn: new Date().toISOString(),
  };
}
