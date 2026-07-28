/**

 * CO-ARCH-007 — Manual lender selection is user intent only.

 * Read Lender Registry · store selected lender ID. No heavy engines on select.

 */



export const MANUAL_LENDER_SELECTION_PROGRAM = "CO-ARCH-007" as const;



export const MANUAL_LENDER_SELECTION_ALLOWED = [

  "read_enterprise_lender_registry",

  "store_selected_lender_id",

  "create_or_upsert_enterprise_deal",

  "upsert_strategic_shortlist_item",

] as const;



export const MANUAL_LENDER_SELECTION_FORBIDDEN = [
  "recommendation_engine",
  "programme_engine",
  "policy_engine",
  "eligibility_engine",
  "ai_engine",
  "product_eligibility_filter",
] as const;



/**

 * Lightweight intent record — never triggers scoring / recommendation / policy.

 */

export type ManualLenderSelectionIntent = {

  opportunityId: string;

  lenderId: string;

  lenderName?: string;

  selectedBy: "manual" | "chanakya_display" | "identify";

  recordedAt: string;

};



export function createManualLenderSelectionIntent(input: {

  opportunityId: string;

  lenderId: string;

  lenderName?: string;

  selectedBy?: ManualLenderSelectionIntent["selectedBy"];

}): ManualLenderSelectionIntent {

  return {

    opportunityId: input.opportunityId.trim(),

    lenderId: input.lenderId.trim(),

    lenderName: input.lenderName?.trim() || undefined,

    selectedBy: input.selectedBy ?? "manual",

    recordedAt: new Date().toISOString(),

  };

}


