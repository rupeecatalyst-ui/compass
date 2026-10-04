/**
 * Multiselect may span Linked Parties only inside one locked transaction + organisation.
 */

export type DocumentWorkspaceSelectionCandidate = {
  id: string;
  organizationId?: string | null;
  opportunityId?: string | null;
  dealId?: string | null;
};

export function validateLockedDocumentSelection(input: {
  organizationId: string;
  opportunityId: string;
  dealId?: string | null;
  selected: DocumentWorkspaceSelectionCandidate[];
}): { ok: true } | { ok: false; code: "EMPTY" | "CROSS_TRANSACTION" | "CROSS_ORGANIZATION" } {
  if (!input.selected.length) return { ok: false, code: "EMPTY" };
  const org = input.organizationId.trim();
  const opportunityId = input.opportunityId.trim();
  const dealId = input.dealId?.trim() || "";
  for (const row of input.selected) {
    const rowOrg = row.organizationId?.trim();
    if (rowOrg && rowOrg !== org) return { ok: false, code: "CROSS_ORGANIZATION" };
    const rowOpp = row.opportunityId?.trim();
    if (rowOpp && rowOpp !== opportunityId) return { ok: false, code: "CROSS_TRANSACTION" };
    const rowDeal = row.dealId?.trim() || "";
    if (dealId && rowDeal && rowDeal !== dealId) return { ok: false, code: "CROSS_TRANSACTION" };
    if (!dealId && rowDeal) return { ok: false, code: "CROSS_TRANSACTION" };
  }
  return { ok: true };
}
