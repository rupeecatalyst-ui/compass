/**
 * Stage-sensitive My Deals Kanban navigation.
 * Accounting → existing Accounting Case. All other stages → lender Deal workflow.
 */

import { buildAccountingCaseHref } from "@/lib/accounting-workspace";
import { isAccountingKanbanColumn } from "@/lib/my-deals/kanban-board";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";
import type { DealRegistryRow } from "@/types/deal-registry";

export const MY_DEALS_KANBAN_ACCOUNTING_CTA = "Open Accounting Case";
export const MY_DEALS_KANBAN_LENDER_CTA = "Open Lender Workflow";

export { buildAccountingCaseHref };

export function resolveMyDealsKanbanCta(
  row: DealRegistryRow,
  columnId: string,
): {
  label: string;
  href: string | null;
  disabledReason?: string;
} {
  if (isAccountingKanbanColumn(columnId)) {
    const caseId = row.accountingCaseId?.trim();
    if (!caseId) {
      return {
        label: MY_DEALS_KANBAN_ACCOUNTING_CTA,
        href: null,
        disabledReason: "No linked Accounting Case exists for this Deal yet.",
      };
    }
    return {
      label: MY_DEALS_KANBAN_ACCOUNTING_CTA,
      href: buildAccountingCaseHref(caseId),
    };
  }

  const dealId = row.enterpriseDealId?.trim() || row.id;
  return {
    label: MY_DEALS_KANBAN_LENDER_CTA,
    href: buildDealWorkspaceHref({
      dealId,
      fileId: row.id,
      opportunityId: row.opportunityId,
      tab: "lenders",
    }),
  };
}
