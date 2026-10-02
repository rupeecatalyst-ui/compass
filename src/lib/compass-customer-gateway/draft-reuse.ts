/**
 * Draft Opportunity reuse for the same contact and product.
 * Submitted, deleted, and archived rows are not drafts.
 * A different product never reuses the draft.
 */

export type DraftReuseCandidate = {
  id: string;
  productCode?: string | null;
  productUniquenessKey?: string | null;
  lifecycleStatus?: string | null;
  isDeleted?: boolean | null;
  archived?: boolean | null;
};

function isOpenDraft(row: DraftReuseCandidate): boolean {
  return (
    !row.isDeleted &&
    !row.archived &&
    (row.lifecycleStatus === "dialogue" || row.lifecycleStatus === "draft")
  );
}

export function selectReusableDraft<T extends DraftReuseCandidate>(
  rows: T[],
  enterpriseProductCode: string,
  productUniquenessKey: string | null,
): T | null {
  return (
    rows.find((row) => isOpenDraft(row) && row.productCode === enterpriseProductCode) ??
    rows.find(
      (row) =>
        isOpenDraft(row) &&
        productUniquenessKey != null &&
        row.productUniquenessKey === productUniquenessKey,
    ) ??
    null
  );
}
