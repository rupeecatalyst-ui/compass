/**
 * Campaign link recipient reference.
 * Snapshot recipient ids are opaque frozen-audience keys.
 * Email addresses and email fingerprints are never issuable and are never rewritten into another id.
 */

import type { CampaignIdentityDecision, CampaignRecipientClaims } from "@/lib/product-journey/campaign-link";

export type CampaignRecipientRefKind = "snapshot" | "contact" | "rejected";

const SNAPSHOT_RECIPIENT_PREFIX = "mkt-snap-";

export function classifyCampaignRecipientRef(recipientRef: string): CampaignRecipientRefKind {
  const ref = recipientRef.trim();
  if (!isIssuableCampaignRecipientRef(ref)) return "rejected";
  if (ref.startsWith(SNAPSHOT_RECIPIENT_PREFIX)) return "snapshot";
  return "contact";
}

export function isIssuableCampaignRecipientRef(recipientRef: string): boolean {
  const ref = recipientRef.trim();
  if (!ref || ref.length > 200 || /\s/.test(ref) || ref.includes("@")) return false;
  const lower = ref.toLowerCase();
  if (lower.startsWith("audience:") || lower.startsWith("email:")) return false;
  return true;
}

export type FrozenSnapshotRecipientBindingInput = {
  claims: Pick<CampaignRecipientClaims, "campaignId" | "recipientRef">;
  recipient: {
    id: string;
    campaignId: string;
    snapshotId: string;
    normalizedMobile?: string | null;
  } | null;
  snapshot: { id: string; campaignId: string; campaignVersionId: string } | null;
  approvedSnapshot: { id: string; campaignId: string; campaignVersionId: string } | null;
  /** Used when the campaign row has no approvedSnapshotId. Production approval is the published version. */
  approvedVersionId?: string | null;
};

export type FrozenSnapshotRecipientBinding =
  | {
      ok: true;
      recipientRef: string;
      campaignId: string;
      snapshotId: string;
      mobile: string | null;
    }
  | {
      ok: false;
      reason: "not_snapshot_ref" | "missing_recipient" | "campaign_mismatch" | "snapshot_mismatch" | "not_approved_snapshot";
    };

/**
 * A snapshot-recipient token is valid only for the signed campaign and a frozen
 * snapshot of the approved campaign version. A different version is not accepted.
 * The recipient email is not an input and is not returned.
 */
export function bindFrozenSnapshotRecipient(
  input: FrozenSnapshotRecipientBindingInput,
): FrozenSnapshotRecipientBinding {
  if (classifyCampaignRecipientRef(input.claims.recipientRef) !== "snapshot") {
    return { ok: false, reason: "not_snapshot_ref" };
  }
  const recipient = input.recipient;
  if (!recipient || recipient.id !== input.claims.recipientRef.trim()) {
    return { ok: false, reason: "missing_recipient" };
  }
  if (recipient.campaignId !== input.claims.campaignId) {
    return { ok: false, reason: "campaign_mismatch" };
  }
  const snapshot = input.snapshot;
  if (
    !snapshot ||
    snapshot.id !== recipient.snapshotId ||
    snapshot.campaignId !== input.claims.campaignId
  ) {
    return { ok: false, reason: "snapshot_mismatch" };
  }
  const approved = input.approvedSnapshot;
  const sameApprovedSnapshot = approved?.id === snapshot.id && approved.campaignId === input.claims.campaignId;
  const sameApprovedVersion =
    Boolean(approved) &&
    approved?.campaignId === input.claims.campaignId &&
    approved?.campaignVersionId === snapshot.campaignVersionId;
  const publishedVersion =
    !approved &&
    Boolean(input.approvedVersionId) &&
    snapshot.campaignId === input.claims.campaignId &&
    snapshot.campaignVersionId === input.approvedVersionId;
  if (!sameApprovedSnapshot && !sameApprovedVersion && !publishedVersion) {
    return { ok: false, reason: "not_approved_snapshot" };
  }
  const mobile = recipient.normalizedMobile?.trim() || null;
  return {
    ok: true,
    recipientRef: recipient.id,
    campaignId: input.claims.campaignId,
    snapshotId: snapshot.id,
    mobile,
  };
}

export function campaignOpportunityAttributionFields(input: {
  claims: Pick<CampaignRecipientClaims, "campaignId" | "recipientRef" | "sourceCode" | "campaignLabel">;
  decision: CampaignIdentityDecision;
  snapshotId?: string | null;
}): Record<string, string> {
  return {
    compassCampaignId: input.claims.campaignId,
    compassCampaignRecipientRef: input.claims.recipientRef,
    compassCampaignIdentity: input.decision,
    ...(input.snapshotId ? { compassCampaignSnapshotId: input.snapshotId } : {}),
  };
}
