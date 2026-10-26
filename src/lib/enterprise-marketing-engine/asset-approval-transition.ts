/**
 * Draft → Review → Approved. Same asset-manage permission. No new role.
 * An approved image is never rejected. Archive hides it from new emails
 * and leaves the historical checksum URL in place.
 * This decision does not consult campaign usage memory.
 */

import type { MarketingAssetApprovalStatus } from "@/constants/enterprise-marketing-engine/assets";

const NEXT: Record<MarketingAssetApprovalStatus, readonly MarketingAssetApprovalStatus[]> = {
  DRAFT: ["PENDING_REVIEW", "REJECTED"],
  PENDING_REVIEW: ["APPROVED", "REJECTED", "DRAFT"],
  REJECTED: ["DRAFT", "PENDING_REVIEW"],
  APPROVED: [],
};

export function assertMarketingAssetApprovalTransition(
  from: MarketingAssetApprovalStatus,
  to: MarketingAssetApprovalStatus,
): void {
  if (from === to) return;
  if (from === "APPROVED") {
    throw Object.assign(
      new Error(
        "An approved image cannot be rejected. Archive it to hide it from new emails. Mail already sent keeps the public URL.",
      ),
      { statusCode: 409, code: "ASSET_APPROVAL_LOCKED" },
    );
  }
  if (!NEXT[from].includes(to)) {
    throw Object.assign(
      new Error("Images move from Draft to Review before they can be approved."),
      { statusCode: 409, code: "ASSET_APPROVAL_TRANSITION" },
    );
  }
}
