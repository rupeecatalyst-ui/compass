/**
 * CO-ARCH-005 — Deal Pipeline Runtime (no LoanFile).
 * Enterprise Deal Registry is the only business entity after Move to Deal.
 */

import type { LoanLenderExecution } from "@/types/catalyst-one";
import type { LoanCommercialPayeeType } from "@/constants/loan-commercial-payee";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";

/** Slim context for Lender Pipeline UI — not a LoanFile, not a projection of Soft Go-Live. */
export type DealPipelineContext = {
  dealId: string;
  dealNumber: string;
  opportunityId?: string | null;
  opportunityNumber?: string | null;
  requiredAmount: number;
  interestRate?: number;
  tenure?: number;
  loanProduct: string;
  productCode?: string;
  relationshipManager: string;
  relationshipManagerUserId?: string | null;
  rcEmployeeAssignmentSource?: "inherited" | "override" | null;
  customerName: string;
  customerId?: string | null;
  invoicePartyId?: string | null;
  commissionAccountingPayeeId?: string | null;
  commercialPayee?: LoanCommercialPayeeType;
  commercialPayeeSpecify?: string | null;
  rowVersion: number;
};

export type DealPipelineRuntime = {
  /** Anchor Deal used to open the workspace route (`/deals/:dealId`). */
  deal: EnterpriseDealApiRecord;
  context: DealPipelineContext;
  /**
   * CO-ARCH-007 — One LoanLenderExecution per sibling EnterpriseDeal under the Opportunity.
   * Never reconstructed from multi-lender snapshot.lenders as SSOT.
   */
  lenders: LoanLenderExecution[];
  /** All Enterprise Deals for the Opportunity (SSOT). */
  siblingDeals: EnterpriseDealApiRecord[];
};

export type DealSnapshotLender = {
  id?: string;
  name?: string;
  status?: string;
  caseStage?: string;
  /** CO-WF-006 — Sub-stage visible on Kanban */
  caseSubStage?: string | null;
  lenderRegistryId?: string | null;
  lenderRef?: string | null;
  isPrimary?: boolean;
  opportunityId?: string | null;
  expectedLoanAmount?: number;
  product?: string;
  /** CO-LR-013 — ECM Banker (Sales) contact linked to this lender negotiation. */
  lenderSalesContactId?: string | null;
  lenderSalesContactName?: string | null;
  lenderSalesContactMobile?: string | null;
  lenderSalesContactDesignationId?: string | null;
  lenderSalesContactDesignationLabel?: string | null;
  lenderSalesContactOfficialEmail?: string | null;
  lenderSalesContactInstitutionId?: string | null;
  lenderSalesContactInstitutionLabel?: string | null;
  /** CO-UX-017 — operational dates / priority on derived lender snapshot */
  loginDate?: string | null;
  disbursementDate?: string | null;
  probability?: string | null;
  relationshipManager?: string | null;
};
