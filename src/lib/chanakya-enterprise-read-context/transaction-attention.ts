/**

 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 / 003B / 003C

 * Transaction-level attention — delegates to attention-intelligence joins.

 */



import "server-only";



import { CHANAKYA_FIELD_AVAILABILITY } from "@/types/chanakya-enterprise-read-context";

import { redactCustomerContactPiiForAiContext } from "./redact-pii";

import { projectPortfolioCommercialSnapshot } from "./commercial-projections";



export {

  buildTransactionAttentionContext,

  buildEntityAttentionExplanation,

  buildPortfolioAttentionLists,

  buildAttentionReasonsFromRadarRow,

  mapRadarRowToAttentionEvidence,

  sortAttentionRows,

  attentionExplanationStatus,

} from "./attention-intelligence";



export async function buildCommercialAttentionContext(input: {

  organizationId: string;

  limit?: number;

}): Promise<Record<string, unknown>> {

  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);

  const portfolio = await projectPortfolioCommercialSnapshot({

    organizationId: input.organizationId,

    limit,

  });



  return redactCustomerContactPiiForAiContext({

    ...portfolio,

    readOnly: true,

    status: portfolio.availability ?? CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,

    note: "Portfolio commercial snapshot from existing Accounting SSOT — read-only, no mutations.",

    provenance: [

      "enterprise_accounting_invoice",

      "deriveInvoiceReceivable",

      "enterprise_accounting_payment",

      "enterprise_accounting_credit_note",

      "enterprise_deal (post_disbursement_confirmation)",

    ],

  });

}

