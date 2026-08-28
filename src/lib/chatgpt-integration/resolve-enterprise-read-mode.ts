/**
 * CO-CHANAKYA-CHATGPT-ENTERPRISE-READ-CLOSURE-038
 * Resolve enterprise-read mode so ChatGPT entity refs always unlock 360 depth.
 * Pure — no duplicate intelligence formulas.
 */

import {
  CHANAKYA_ENTERPRISE_READ_MODES,
  type ChanakyaEnterpriseReadMode,
} from "@/types/chanakya-enterprise-read-context";

export type ChatGptEnterpriseReadModeResolveInput = {
  modeRaw?: string | null;
  opportunityRef?: string | null;
  dealRef?: string | null;
};

/**
 * When ChatGPT passes Opportunity/Deal refs with the default `enterprise` mode,
 * coerce to a mode that loads Opportunity/Deal 360 (and therefore credit /
 * product-lender / document evidence). Portfolio-only `enterprise` remains when
 * no entity refs are supplied.
 */
export function resolveChatGptEnterpriseReadMode(
  input: ChatGptEnterpriseReadModeResolveInput,
): ChanakyaEnterpriseReadMode {
  const raw = (input.modeRaw || "enterprise").trim();
  const mode = (CHANAKYA_ENTERPRISE_READ_MODES as readonly string[]).includes(raw)
    ? (raw as ChanakyaEnterpriseReadMode)
    : "enterprise";

  const hasOpp = Boolean(input.opportunityRef?.trim());
  const hasDeal = Boolean(input.dealRef?.trim());

  if (!hasOpp && !hasDeal) return mode;

  // Explicit modes requested by the caller are respected.
  if (mode !== "enterprise") return mode;

  if (hasOpp && !hasDeal) return "opportunity";
  if (hasDeal && !hasOpp) return "transaction";
  // Both refs: transaction mode loads deal + opportunity when opportunityRef set
  return "transaction";
}
