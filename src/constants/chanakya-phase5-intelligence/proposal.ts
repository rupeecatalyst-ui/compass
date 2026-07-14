import type { ChanakyaProposalConfig } from "@/types/chanakya-phase5-intelligence";
import { CP5_PROPOSAL_BUTTON_LABEL } from "./lifecycle";

/**
 * Configurable Proposal Intelligence defaults.
 * Enabled only for configured products meeting minimum loan amount.
 */
export const CP5_DEFAULT_PROPOSAL_CONFIG: ChanakyaProposalConfig = {
  buttonLabel: CP5_PROPOSAL_BUTTON_LABEL,
  forbiddenButtonLabels: ["SEND PROPOSAL"],
  readinessThresholdPct: 80,
  products: [
    {
      productId: "construction_finance",
      productName: "Construction Finance",
      enabled: true,
      minimumLoanAmount: 50_00_000,
    },
    {
      productId: "lap",
      productName: "Loan Against Property",
      enabled: true,
      minimumLoanAmount: 25_00_000,
    },
    {
      productId: "project_finance",
      productName: "Project Finance",
      enabled: true,
      minimumLoanAmount: 1_00_00_000,
    },
    {
      productId: "working_capital",
      productName: "Working Capital",
      enabled: true,
      minimumLoanAmount: 50_00_000,
    },
  ],
};
