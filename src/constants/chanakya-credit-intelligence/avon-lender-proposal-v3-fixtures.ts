/**
 * CO-CHANAKYA-027 — Avon lender proposal V3 regression fixtures (OPP-2026-000060).
 */

export const AVON_027_LOAN_AMOUNT = 500_000_000;

export const AVON_027_OPPORTUNITY = {
  opportunityId: "opp_avon_027",
  opportunityNumber: "OPP-2026-000060",
  productName: "Project Finance",
  productCode: "PROJECT_FINANCE",
  borrowerName: "Avon Appliances Private Ltd",
  companyName: "Avon Appliances Private Ltd",
  lenderName: "ICICI Bank",
  city: "Ahmedabad",
};

export const AVON_027_ASSIGNED_LENDER = {
  dealId: "deal_avon_icici_060",
  dealNumber: "DEAL-060-ICICI",
  lenderId: "lender_icici",
  lenderName: "ICICI Bank",
  lenderCode: "ICICI",
  grossStage: "Login",
  subStage: "Documents Pending",
  stageEnteredAt: "2026-01-15T00:00:00.000Z",
};
