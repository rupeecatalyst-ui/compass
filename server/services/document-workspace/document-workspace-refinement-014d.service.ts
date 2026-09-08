/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014D
 * Inbound review, LOD checklist, and user-initiated Email/WhatsApp handoff.
 * SMTP, automated WhatsApp, OTP delivery, and malware scanning stay disabled here.
 */
import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { DOCUMENT_WORKSPACE_AUDIT_ACTIONS } from "@/constants/document-workspace-audit";
import {
  DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
  DOCUMENT_WORKSPACE_AUDIT_ACTOR_SYSTEM,
} from "@/constants/document-workspace-audit";
import {
  DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES,
  DOCUMENT_WORKSPACE_INCOMPLETE_PROGRAMME_DISCLAIMER,
  DOCUMENT_WORKSPACE_OTHER_REQUIRES_CONFIRMATION,
  DOCUMENT_WORKSPACE_REASSIGNMENT_DENIED,
  DOCUMENT_WORKSPACE_REVIEW_REASON_REQUIRED,
} from "@/constants/document-workspace-inbound";
import { DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE } from "@/constants/document-workspace-security";
import { isOperationalSmtpDeliveryEnabled } from "@/constants/enterprise-communication-center/operational-delivery";
import { DOCUMENT_WORKSPACE_STATUS_QUARANTINED } from "@/constants/document-workspace-lifecycle";
import { isUnclassifiedDocumentTypeRef } from "@/constants/document-intake";
import { generateOpportunityLod, EdieLodCertificationError } from "@/lib/document-requests/generate-lod";
import { getDocumentRequestState } from "@/lib/document-requests/store";
import { canCitePublishedProgramme } from "@/lib/product-programme-operations/legacy-review";
import { enforceMandatoryInitiatingSenderCc } from "@/lib/enterprise-communication-center/initiating-sender-cc";
import { isValidEmailAddress } from "@/lib/enterprise-communication-center/recipient-router";
import {
  decideSilentOtherAssignment,
  inboundOutcomeIsNewEligible,
  inboundOutcomeCountsTowardReadiness,
  parseInboundClassificationJson,
  type InboundClassificationSnapshot,
} from "@/lib/document-workspace/inbound-classification";
import {
  countUnseenInboundByOwner,
  countUnseenInboundByTransaction,
  filterUnseenInboundEmailDocuments,
  inboundEmailVersionKey,
} from "@/lib/document-workspace/inbound-email-new";
import {
  revalidateChecklistSelection,
  toChecklistSelectionItems,
  overlayChecklistStatusFromReviews,
  type ChecklistSelectionItem,
} from "@/lib/document-workspace/checklist-selection";
import { deriveDocumentWorkspaceReviewStatus } from "@/lib/document-workspace/review-status";
import type { DocumentRegistryRecord } from "@/types/document-registry";
import type { DocumentRequestItemState } from "@/types/document-requests";
import {
  buildDocumentWorkspaceRequestMessageDto,
  formatRequestMessagePlainText,
  type DocumentWorkspaceRequestMessageChannel,
  type DocumentWorkspaceRequestMessageDto,
} from "@/lib/document-workspace/request-message-dto";
import { buildWhatsAppHandoffPayload } from "@/lib/document-workspace/whatsapp-handoff";
import { htmlToPlainTextFallback, sanitizeDocumentWorkspaceHtml } from "@/lib/document-workspace/sanitize-html";
import { decideParticipantBelongsToTransaction } from "@/lib/document-workspace/access-decision";
import { listEdieDocumentTypeOptions } from "@/lib/document-requests/resolve-program-lod";
import { appendDocumentWorkspaceAuditBestEffort } from "@server/services/document-workspace/document-workspace-audit.service";
import {
  resolveDocumentWorkspaceAccess,
  type DocumentWorkspaceAuthorisedContext,
} from "@server/services/document-workspace/document-workspace-access.service";
import type { DocumentWorkspaceCapability } from "@/lib/document-workspace/access-decision";

function portalFailure(statusCode: number, code: string, message: string): never {
  throw Object.assign(new Error(message), { statusCode, code, expose: false });
}

function requireDb() {
  if (!isDatabaseAvailable()) {
    throw Object.assign(new Error("Document Workspace durability requires enterprise persistence."), {
      statusCode: 503,
      code: "DOCUMENT_WORKSPACE_UNAVAILABLE",
    });
  }
}

async function requireAuthorisedWorkspace(input: {
  userId: string;
  capability: DocumentWorkspaceCapability;
  opportunityId?: string | null;
  dealId?: string | null;
  documentId?: string | null;
  participantEntityId?: string | null;
  claimedOrganizationId?: string | null;
}): Promise<DocumentWorkspaceAuthorisedContext> {
  requireDb();
  return resolveDocumentWorkspaceAccess(input);
}

function requireReviewReason(reason: string | null | undefined): string {
  const trimmed = String(reason || "").trim();
  if (trimmed.length < 3) {
    portalFailure(400, "REASON_REQUIRED", DOCUMENT_WORKSPACE_REVIEW_REASON_REQUIRED);
  }
  return trimmed;
}

function snapshotToJson(snapshot: InboundClassificationSnapshot): Prisma.InputJsonValue {
  return { ...snapshot };
}

export type InboundReviewQueueItem = {
  documentId: string;
  versionKey: string;
  inboundEmailId: string | null;
  inboundAttachmentId: string | null;
  filename: string;
  mimeType: string;
  receivedAt: string | null;
  senderDisplay: string | null;
  opportunityId: string;
  dealId: string | null;
  suggestedParticipantId: string | null;
  suggestedTypeRef: string | null;
  suggestedTypeLabel: string | null;
  outcome: string;
  method: string;
  confidenceBand: string;
  evidenceCodes: string[];
  previewAvailable: boolean;
};

export async function listInboundEmailReviewQueue(input: {
  actorUserId: string;
  opportunityId: string;
  dealId?: string | null;
}): Promise<{ items: InboundReviewQueueItem[] }> {
  const authorised = await requireAuthorisedWorkspace({
    userId: input.actorUserId,
    capability: "view",
    opportunityId: input.opportunityId,
    dealId: input.dealId,
  });
  const rows = await prisma.enterpriseTransactionDocument.findMany({
    where: {
      organizationId: authorised.organizationId,
      opportunityId: authorised.opportunityId,
      uploadSource: "email",
      ...(authorised.dealId ? { dealId: authorised.dealId } : {}),
      OR: [{ status: "active" }, { status: DOCUMENT_WORKSPACE_STATUS_QUARANTINED }],
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      inboundEmailId: true,
      inboundAttachmentId: true,
      originalFilename: true,
      mimeType: true,
      createdAt: true,
      opportunityId: true,
      dealId: true,
      participantId: true,
      typeRef: true,
      categoryLabel: true,
      status: true,
      inboundClassificationJson: true,
      contentBytes: true,
      storageKey: true,
      contentVersion: true,
      updatedAt: true,
    },
  });
  const emailIds = [...new Set(rows.map((row) => row.inboundEmailId).filter(Boolean))] as string[];
  const emails = emailIds.length
    ? await prisma.enterpriseInboundEmailMessage.findMany({
        where: { organizationId: authorised.organizationId, id: { in: emailIds } },
        select: { id: true, fromName: true, fromEmail: true, receivedAt: true },
      })
    : [];
  const emailById = new Map(emails.map((row) => [row.id, row]));
  const typeOptions = listEdieDocumentTypeOptions();
  const items: InboundReviewQueueItem[] = rows.map((row) => {
    const snapshot = parseInboundClassificationJson(row.inboundClassificationJson);
    const email = row.inboundEmailId ? emailById.get(row.inboundEmailId) : null;
    const suggestedTypeRef = snapshot?.suggestedTypeRef || (isUnclassifiedDocumentTypeRef(row.typeRef) ? null : row.typeRef);
    const suggestedLabel =
      typeOptions.find((item) => item.typeRef === suggestedTypeRef)?.label || row.categoryLabel;
    const rejected =
      snapshot?.outcome === DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.REJECTED_FILE_SECURITY ||
      row.status === DOCUMENT_WORKSPACE_STATUS_QUARANTINED;
    return {
      documentId: row.id,
      versionKey: inboundEmailVersionKey({
        versionNumber: row.contentVersion,
        uploadedAt: row.updatedAt.toISOString(),
      }),
      inboundEmailId: row.inboundEmailId,
      inboundAttachmentId: row.inboundAttachmentId,
      filename: row.originalFilename,
      mimeType: row.mimeType,
      receivedAt: (email?.receivedAt || row.createdAt).toISOString(),
      senderDisplay: email?.fromName || (email?.fromEmail ? "Authorised sender" : null),
      opportunityId: row.opportunityId,
      dealId: row.dealId,
      suggestedParticipantId: snapshot?.suggestedParticipantId || row.participantId,
      suggestedTypeRef,
      suggestedTypeLabel: suggestedTypeRef ? suggestedLabel : null,
      outcome: snapshot?.outcome || DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.UNCLASSIFIED_REVIEW_REQUIRED,
      method: snapshot?.method || "manual_review",
      confidenceBand: snapshot?.confidenceBand || "review_required",
      evidenceCodes: snapshot?.evidenceCodes || [],
      previewAvailable: !rejected && Boolean(row.storageKey || row.contentBytes),
    };
  });
  return { items };
}

export async function reviewInboundAttachment(input: {
  actorUserId: string;
  opportunityId: string;
  dealId?: string | null;
  documentId: string;
  decision: "confirm" | "change" | "duplicate" | "ignore" | "attach";
  typeRef?: string | null;
  categoryLabel?: string | null;
  participantId?: string | null;
  targetOpportunityId?: string | null;
  employeeConfirmedOther?: boolean;
  reason?: string | null;
}) {
  const authorised = await requireAuthorisedWorkspace({
    userId: input.actorUserId,
    capability: "review",
    opportunityId: input.opportunityId,
    dealId: input.dealId,
    documentId: input.documentId,
  });
  if (input.targetOpportunityId && input.targetOpportunityId.trim() !== authorised.opportunityId) {
    await appendDocumentWorkspaceAuditBestEffort({
      organizationId: authorised.organizationId,
      actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
      actorId: authorised.actor.userId,
      action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.SELECTION_REJECTED_CROSS_TRANSACTION,
      documentId: authorised.documentId,
      opportunityId: authorised.opportunityId,
      dealId: authorised.dealId,
      outcome: "denied",
      reason: "cross_transaction_reassignment",
      sourceChannel: "inbound_email",
    });
    portalFailure(404, "CROSS_TRANSACTION", DOCUMENT_WORKSPACE_REASSIGNMENT_DENIED);
  }

  const document = await prisma.enterpriseTransactionDocument.findFirst({
    where: { id: authorised.documentId || input.documentId, organizationId: authorised.organizationId },
  });
  if (!document) portalFailure(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);

  const prior = parseInboundClassificationJson(document.inboundClassificationJson);
  const now = new Date().toISOString();

  if (input.decision === "duplicate" || input.decision === "ignore") {
    const reason = requireReviewReason(input.reason);
    const outcome =
      input.decision === "duplicate"
        ? DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.DUPLICATE_CANDIDATE
        : DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.IGNORED;
    const snapshot: InboundClassificationSnapshot = {
      outcome,
      method: "manual_review",
      confidenceBand: "none",
      evidenceCodes: prior?.evidenceCodes || [],
      suggestedTypeRef: prior?.suggestedTypeRef ?? null,
      suggestedLodRequestRef: prior?.suggestedLodRequestRef ?? null,
      suggestedParticipantId: prior?.suggestedParticipantId ?? null,
      reviewReason: reason,
      decidedAt: now,
      decidedByUserId: authorised.actor.userId,
      otherExplicitlyConfirmed: false,
    };
    await prisma.enterpriseTransactionDocument.update({
      where: { id: document.id },
      data: { inboundClassificationJson: snapshotToJson(snapshot) },
    });
    await appendDocumentWorkspaceAuditBestEffort({
      organizationId: authorised.organizationId,
      actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
      actorId: authorised.actor.userId,
      action:
        input.decision === "duplicate"
          ? DOCUMENT_WORKSPACE_AUDIT_ACTIONS.INBOUND_DUPLICATE_MARKED
          : DOCUMENT_WORKSPACE_AUDIT_ACTIONS.INBOUND_IGNORED,
      documentId: document.id,
      opportunityId: authorised.opportunityId,
      dealId: authorised.dealId,
      sourceChannel: "inbound_email",
      reason,
      metadata: { outcome, evidenceCount: snapshot.evidenceCodes.length },
    });
    return { ok: true, outcome };
  }

  const nextTypeRef = String(input.typeRef || document.typeRef || "").trim();
  if (!nextTypeRef) portalFailure(400, "VALIDATION", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  const otherGate = decideSilentOtherAssignment({
    typeRef: nextTypeRef,
    employeeConfirmedOther: input.employeeConfirmedOther === true,
  });
  if (!otherGate.ok) {
    portalFailure(400, "SILENT_OTHER", DOCUMENT_WORKSPACE_OTHER_REQUIRES_CONFIRMATION);
  }
  if (input.decision === "change") requireReviewReason(input.reason);

  if (input.participantId) {
    const siblings = await prisma.enterpriseTransactionDocument.findMany({
      where: { organizationId: authorised.organizationId, opportunityId: authorised.opportunityId },
      select: { participantId: true, contactId: true, ownerEntityId: true },
    });
    const participantOk = decideParticipantBelongsToTransaction({
      requestedEntityId: input.participantId,
      allowedEntityIds: [
        document.contactId,
        document.ownerEntityId,
        document.participantId,
        authorised.contactId,
        authorised.companyId,
        ...siblings.map((row) => row.participantId),
        ...siblings.map((row) => row.contactId),
        ...siblings.map((row) => row.ownerEntityId),
      ],
    });
    if (!participantOk.ok) {
      portalFailure(404, "PARTICIPANT_MISMATCH", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
    }
  }

  const typeLabel =
    input.categoryLabel?.trim() ||
    listEdieDocumentTypeOptions().find((item) => item.typeRef === nextTypeRef)?.label ||
    document.categoryLabel;
  const snapshot: InboundClassificationSnapshot = {
    outcome:
      input.decision === "change"
        ? DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.ATTACHED_MANUALLY
        : DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.ATTACHED_MANUALLY,
    method: "manual_review",
    confidenceBand: "none",
    evidenceCodes: prior?.evidenceCodes || ["employee_confirmed"],
    suggestedTypeRef: nextTypeRef,
    suggestedLodRequestRef: prior?.suggestedLodRequestRef ?? null,
    suggestedParticipantId: input.participantId || prior?.suggestedParticipantId || document.participantId,
    reviewReason: input.reason?.trim() || null,
    decidedAt: now,
    decidedByUserId: authorised.actor.userId,
    otherExplicitlyConfirmed: input.employeeConfirmedOther === true,
  };

  await prisma.enterpriseTransactionDocument.update({
    where: { id: document.id },
    data: {
      typeRef: nextTypeRef,
      categoryLabel: typeLabel,
      participantId: input.participantId || document.participantId,
      inboundClassificationJson: snapshotToJson(snapshot),
    },
  });
  await appendDocumentWorkspaceAuditBestEffort({
    organizationId: authorised.organizationId,
    actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
    actorId: authorised.actor.userId,
    action:
      input.decision === "change"
        ? DOCUMENT_WORKSPACE_AUDIT_ACTIONS.INBOUND_CLASSIFICATION_CHANGED
        : DOCUMENT_WORKSPACE_AUDIT_ACTIONS.INBOUND_CLASSIFICATION_CONFIRMED,
    documentId: document.id,
    opportunityId: authorised.opportunityId,
    dealId: authorised.dealId,
    sourceChannel: "inbound_email",
    metadata: { outcome: snapshot.outcome, typeChanged: input.decision === "change" },
  });
  await appendDocumentWorkspaceAuditBestEffort({
    organizationId: authorised.organizationId,
    actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
    actorId: authorised.actor.userId,
    action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.INBOUND_ATTACHMENT_LINKED,
    documentId: document.id,
    opportunityId: authorised.opportunityId,
    dealId: authorised.dealId,
    sourceChannel: "inbound_email",
    metadata: { linked: true },
  });
  return { ok: true, outcome: snapshot.outcome };
}

export async function listUnseenInboundEmailSummary(input: {
  actorUserId: string;
  opportunityIds: string[];
}) {
  const ids = [...new Set(input.opportunityIds.map((id) => id.trim()).filter(Boolean))].slice(0, 80);
  if (!ids.length) {
    return { unseen: [], count: 0, byContactId: {}, byOpportunity: {}, byDeal: {} };
  }
  const authorisedIds: string[] = [];
  let organizationId = "";
  let actorUserId = "";
  for (const opportunityId of ids) {
    try {
      const authorised = await requireAuthorisedWorkspace({
        userId: input.actorUserId,
        capability: "view",
        opportunityId,
      });
      if (!organizationId) organizationId = authorised.organizationId;
      if (authorised.organizationId !== organizationId) continue;
      authorisedIds.push(opportunityId);
      actorUserId = authorised.actor.userId;
    } catch {
      continue;
    }
  }
  if (!authorisedIds.length) {
    return { unseen: [], count: 0, byContactId: {}, byOpportunity: {}, byDeal: {} };
  }
  const records = await prisma.enterpriseTransactionDocument.findMany({
    where: {
      organizationId,
      opportunityId: { in: authorisedIds },
      status: "active",
      uploadSource: "email",
      deletedAt: null,
    },
    select: {
      id: true,
      contentVersion: true,
      updatedAt: true,
      uploadSource: true,
      contactId: true,
      ownerEntityId: true,
      opportunityId: true,
      dealId: true,
      inboundClassificationJson: true,
    },
  });
  const seen = await prisma.enterpriseDocumentVersionSeen.findMany({
    where: {
      organizationId,
      userId: actorUserId,
      documentId: { in: records.map((row) => row.id) },
    },
    select: { documentId: true, versionKey: true },
  });
  const candidates = records.map((row) => {
    const snapshot = parseInboundClassificationJson(row.inboundClassificationJson);
    return {
      documentId: row.id,
      versionKey: inboundEmailVersionKey({
        versionNumber: row.contentVersion,
        uploadedAt: row.updatedAt.toISOString(),
      }),
      uploadSource: row.uploadSource,
      ownerEntityId: row.ownerEntityId || row.contactId,
      contactId: row.contactId,
      opportunityId: row.opportunityId,
      dealId: row.dealId,
      newEligible: inboundOutcomeIsNewEligible(snapshot?.outcome),
    };
  });
  const unseen = filterUnseenInboundEmailDocuments({ candidates, seenKeys: seen });
  return {
    unseen,
    count: unseen.length,
    byContactId: countUnseenInboundByOwner({ unseen }),
    ...countUnseenInboundByTransaction({ unseen }),
  };
}

async function loadChecklistItems(authorised: DocumentWorkspaceAuthorisedContext): Promise<{
  items: ChecklistSelectionItem[];
  lodVersionId: string | null;
  programmeVersionRef: string | null;
  incompleteProgramme: boolean;
  product: string;
  customerDisplayName: string;
  safeTransactionReference: string;
  authorisedMobile: string | null;
  authorisedEmail: string | null;
}> {
  const opportunity = await prisma.enterpriseOpportunity.findFirst({
    where: { id: authorised.opportunityId, organizationId: authorised.organizationId, isDeleted: false },
    select: {
      id: true,
      opportunityNumber: true,
      productLabel: true,
      employmentTypeCode: true,
      primaryContactName: true,
      primaryContactMobile: true,
      primaryContactEmail: true,
      primaryContactId: true,
    },
  });
  if (!opportunity) portalFailure(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);

  let programmeVersionRef: string | null = null;
  let publishedProgramme = null;
  let incompleteProgramme = false;
  if (authorised.dealId) {
    const deal = await prisma.enterpriseDeal.findFirst({
      where: {
        id: authorised.dealId,
        organizationId: authorised.organizationId,
        isDeleted: false,
      },
      select: {
        lenderProgramId: true,
        productLabel: true,
        primaryContactName: true,
        primaryContactMobile: true,
        primaryContactEmail: true,
        dealNumber: true,
      },
    });
    if (deal?.lenderProgramId) {
      const program = await prisma.enterpriseLenderProgram.findFirst({
        where: { id: deal.lenderProgramId, organizationId: authorised.organizationId },
        select: {
          id: true,
          versionNumber: true,
          isLivePublished: true,
          publicationState: true,
          completenessState: true,
          status: true,
          lifecycleStatus: true,
          requiredDocumentTypeIds: true,
          employmentType: true,
          borrowerType: true,
          label: true,
          enabled: true,
          isDeleted: true,
        },
      });
      if (program && canCitePublishedProgramme(program)) {
        programmeVersionRef = `${program.id}:v${program.versionNumber}`;
        publishedProgramme = {
          ...program,
          requiredDocumentTypeIds: program.requiredDocumentTypeIds as string[] | null,
        };
      } else {
        incompleteProgramme = true;
      }
    }
  }

  const existing = getDocumentRequestState(opportunity.id);
  let lodItems: DocumentRequestItemState[] = existing.lodItems;
  let lodVersionId = existing.lodVersions?.[0]?.id ?? null;
  try {
    const generated = generateOpportunityLod({
      productLabel: opportunity.productLabel || "Loan",
      employmentType: opportunity.employmentTypeCode,
      publishedProgramme,
    });
    if (!lodItems.length) {
      lodItems = generated.map((item) => ({ ...item, status: "pending" as const }));
    }
  } catch (err) {
    if (err instanceof EdieLodCertificationError) {
      incompleteProgramme = true;
      if (!lodItems.length) lodItems = [];
    } else {
      throw err;
    }
  }

  if (!lodVersionId && programmeVersionRef) lodVersionId = programmeVersionRef;

  const durable = await prisma.enterpriseTransactionDocument.findMany({
    where: {
      organizationId: authorised.organizationId,
      opportunityId: authorised.opportunityId,
      status: "active",
      deletedAt: null,
      ...(authorised.dealId ? { dealId: authorised.dealId } : {}),
    },
    select: {
      id: true,
      typeRef: true,
      categoryLabel: true,
      originalFilename: true,
      displayName: true,
      status: true,
      uploadSource: true,
      verifiedAt: true,
      createdAt: true,
      updatedAt: true,
      contentVersion: true,
      fileSizeBytes: true,
      mimeType: true,
      contentBytes: true,
      storageKey: true,
      inboundClassificationJson: true,
    },
  });
  const reviews = lodItems.map((item) => {
    const match = durable.find((row) => row.typeRef === item.typeRef);
    const snapshot = match ? parseInboundClassificationJson(match.inboundClassificationJson) : null;
    const hasFile = Boolean(match && (match.storageKey || match.contentBytes));
    const record = match
      ? ({
          id: match.id,
          typeRef: match.typeRef,
          categoryLabel: match.categoryLabel,
          originalFilename: match.originalFilename,
          displayName: match.displayName,
          status: match.status === "active" ? "active" : "archived",
          links: {},
          versions: hasFile
            ? [
                {
                  id: match.id,
                  version: match.contentVersion,
                  originalFilename: match.originalFilename,
                  displayName: match.displayName,
                  fileSizeBytes: match.fileSizeBytes,
                  mimeType: match.mimeType,
                  blobId: match.id,
                  uploadedBy: "system",
                  uploadedAt: match.createdAt.toISOString(),
                  isCurrent: true,
                },
              ]
            : [],
          uploadedBy: "system",
          uploadedAt: match.createdAt.toISOString(),
          updatedAt: match.updatedAt.toISOString(),
          version: match.contentVersion,
          fileSizeBytes: match.fileSizeBytes,
          mimeType: match.mimeType,
          uploadSource: (match.uploadSource || undefined) as DocumentRegistryRecord["uploadSource"],
          verifiedAt: match.verifiedAt?.toISOString(),
        } satisfies DocumentRegistryRecord)
      : null;
    if (snapshot && !inboundOutcomeCountsTowardReadiness(snapshot.outcome) && record) {
      record.verifiedAt = undefined;
    }
    return {
      requestRef: item.requestRef || item.typeRef,
      typeRef: item.typeRef,
      reviewStatus: deriveDocumentWorkspaceReviewStatus({ record, lodItem: item }),
    };
  });

  const items = overlayChecklistStatusFromReviews(
    toChecklistSelectionItems({
      items: lodItems,
      organizationId: authorised.organizationId,
      opportunityId: authorised.opportunityId,
      dealId: authorised.dealId,
      lodVersionId,
      programmeVersionRef,
    }),
    reviews,
  );

  await appendDocumentWorkspaceAuditBestEffort({
    organizationId: authorised.organizationId,
    actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_SYSTEM,
    actorId: authorised.actor.userId,
    action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.CHECKLIST_GENERATED,
    opportunityId: authorised.opportunityId,
    dealId: authorised.dealId,
    sourceChannel: "document_workspace",
    metadata: {
      itemCount: items.length,
      incompleteProgramme,
      programmeCited: Boolean(programmeVersionRef),
    },
  });

  return {
    items,
    lodVersionId,
    programmeVersionRef,
    incompleteProgramme,
    product: opportunity.productLabel || "Loan",
    customerDisplayName: opportunity.primaryContactName || "Customer",
    safeTransactionReference: opportunity.opportunityNumber || opportunity.id.slice(0, 8),
    authorisedMobile: opportunity.primaryContactMobile,
    authorisedEmail: opportunity.primaryContactEmail,
  };
}

export async function listDocumentWorkspaceLodChecklist(input: {
  actorUserId: string;
  opportunityId: string;
  dealId?: string | null;
}) {
  const authorised = await requireAuthorisedWorkspace({
    userId: input.actorUserId,
    capability: "view",
    opportunityId: input.opportunityId,
    dealId: input.dealId,
  });
  const checklist = await loadChecklistItems(authorised);
  return {
    ...checklist,
    incompleteProgrammeDisclaimer: checklist.incompleteProgramme
      ? DOCUMENT_WORKSPACE_INCOMPLETE_PROGRAMME_DISCLAIMER
      : null,
    desktopWorkspaceHref: `/document-workspace?opportunityId=${encodeURIComponent(authorised.opportunityId)}`,
  };
}

export async function prepareDocumentRequestHandoff(input: {
  actorUserId: string;
  opportunityId: string;
  dealId?: string | null;
  channel: DocumentWorkspaceRequestMessageChannel;
  selectedRefs: string[];
  browserSubmittedMobile?: string | null;
  to?: string[];
  cc?: string[];
  htmlBody?: string;
  queueEmail?: boolean;
}) {
  const authorised = await requireAuthorisedWorkspace({
    userId: input.actorUserId,
    capability: "share",
    opportunityId: input.opportunityId,
    dealId: input.dealId,
  });
  const checklist = await loadChecklistItems(authorised);
  const validated = revalidateChecklistSelection({
    organizationId: authorised.organizationId,
    opportunityId: authorised.opportunityId,
    dealId: authorised.dealId,
    lodVersionId: checklist.lodVersionId,
    selectedRefs: input.selectedRefs,
    canonicalItems: checklist.items,
  });
  if (!validated.ok) {
    await appendDocumentWorkspaceAuditBestEffort({
      organizationId: authorised.organizationId,
      actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
      actorId: authorised.actor.userId,
      action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.SELECTION_REJECTED_VALIDATION,
      opportunityId: authorised.opportunityId,
      dealId: authorised.dealId,
      outcome: "denied",
      metadata: { code: validated.code, rejectedCount: validated.rejectedRefs.length },
    });
    portalFailure(400, validated.code, "Selected requirements could not be validated for this transaction.");
  }

  const correlationId = randomUUID();
  const dto: DocumentWorkspaceRequestMessageDto = buildDocumentWorkspaceRequestMessageDto({
    organizationId: authorised.organizationId,
    correlationId,
    channel: input.channel,
    safeTransactionReference: checklist.safeTransactionReference,
    product: checklist.product,
    customerDisplayName: checklist.customerDisplayName,
    initiatingEmployeeId: authorised.actor.userId,
    programmeVersionRef: checklist.programmeVersionRef,
    lodVersionId: checklist.lodVersionId,
    incompleteProgramme: checklist.incompleteProgramme,
    items: validated.items,
  });
  const text = formatRequestMessagePlainText(dto);

  if (input.channel === "whatsapp") {
    const handoff = buildWhatsAppHandoffPayload({
      dto,
      authorisedContactMobile: checklist.authorisedMobile,
      browserSubmittedMobile: input.browserSubmittedMobile,
    });
    if (!handoff.ok) {
      await appendDocumentWorkspaceAuditBestEffort({
        organizationId: authorised.organizationId,
        actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
        actorId: authorised.actor.userId,
        action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.WHATSAPP_HANDOFF_CANCELLED,
        opportunityId: authorised.opportunityId,
        dealId: authorised.dealId,
        outcome: "denied",
        correlationId,
        metadata: { code: handoff.code, selectedCount: dto.selectedCount },
      });
      portalFailure(400, handoff.code, handoff.message);
    }
    await appendDocumentWorkspaceAuditBestEffort({
      organizationId: authorised.organizationId,
      actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
      actorId: authorised.actor.userId,
      action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.WHATSAPP_CHECKLIST_PREPARED,
      opportunityId: authorised.opportunityId,
      dealId: authorised.dealId,
      correlationId,
      sourceChannel: "whatsapp",
      metadata: { selectedCount: dto.selectedCount, delivered: false, sent: false },
    });
    return {
      ok: true,
      dto,
      text,
      whatsapp: {
        deepLink: handoff.deepLink,
        nativeShare: handoff.nativeShare,
        mobileDisplay: handoff.mobileDisplay,
        delivered: false,
        sent: false,
      },
      smtpEnabled: false,
      queued: false,
      sent: false,
    };
  }

  const user = await prisma.user.findFirst({
    where: { id: authorised.actor.userId },
    select: { id: true, email: true, isActive: true },
  });
  const sender = enforceMandatoryInitiatingSenderCc({
    to: input.to?.length ? input.to : checklist.authorisedEmail ? [checklist.authorisedEmail] : [],
    cc: input.cc ?? [],
    initiatingUser: {
      id: authorised.actor.userId,
      email: user?.email || authorised.actor.email,
      isActive: user?.isActive ?? authorised.actor.isActive,
    },
  });
  if (!sender.ok) {
    await appendDocumentWorkspaceAuditBestEffort({
      organizationId: authorised.organizationId,
      actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
      actorId: authorised.actor.userId,
      action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.EMAIL_PREPARATION_FAILED,
      opportunityId: authorised.opportunityId,
      dealId: authorised.dealId,
      outcome: "denied",
      correlationId,
      metadata: { code: sender.code, selectedCount: dto.selectedCount },
    });
    return sender;
  }
  const recipient = sender.to[0];
  if (!recipient || !isValidEmailAddress(recipient)) {
    portalFailure(400, "INVALID_EMAIL", "Recipient email is missing or invalid.");
  }
  const html = sanitizeDocumentWorkspaceHtml(input.htmlBody || `<p>${text.replace(/\n/g, "<br/>")}</p>`);
  await appendDocumentWorkspaceAuditBestEffort({
    organizationId: authorised.organizationId,
    actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
    actorId: authorised.actor.userId,
    action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.EMAIL_CHECKLIST_PREPARED,
    opportunityId: authorised.opportunityId,
    dealId: authorised.dealId,
    correlationId,
    sourceChannel: "email",
    metadata: { selectedCount: dto.selectedCount, smtpEnabled: isOperationalSmtpDeliveryEnabled() },
  });

  let queued = false;
  if (input.queueEmail) {
    const event = await prisma.enterpriseDocumentShareEvent.create({
      data: {
        organizationId: authorised.organizationId,
        opportunityId: authorised.opportunityId,
        dealId: authorised.dealId,
        actorUserId: authorised.actor.userId,
        recipientLabel: checklist.customerDisplayName,
        recipientEmail: recipient,
        recipientContactId: null,
        documentIdsJson: [],
        versionIdsJson: [],
        attachmentMode: "individual",
      },
    });
    await appendDocumentWorkspaceAuditBestEffort({
      organizationId: authorised.organizationId,
      actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
      actorId: authorised.actor.userId,
      action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.EMAIL_QUEUED,
      opportunityId: authorised.opportunityId,
      dealId: authorised.dealId,
      shareEventId: event.id,
      correlationId,
      sourceChannel: "email",
      metadata: { selectedCount: dto.selectedCount, sent: false, smtpEnabled: false },
    });
    queued = true;
  }

  return {
    ok: true,
    dto,
    text,
    html,
    plainText: htmlToPlainTextFallback(html),
    to: sender.to,
    cc: sender.cc,
    senderEmail: sender.senderEmail,
    smtpEnabled: isOperationalSmtpDeliveryEnabled(),
    queued,
    sent: false,
  };
}

export async function recordWhatsAppHandoffOpened(input: {
  actorUserId: string;
  opportunityId: string;
  dealId?: string | null;
  correlationId: string;
}) {
  const authorised = await requireAuthorisedWorkspace({
    userId: input.actorUserId,
    capability: "share",
    opportunityId: input.opportunityId,
    dealId: input.dealId,
  });
  await appendDocumentWorkspaceAuditBestEffort({
    organizationId: authorised.organizationId,
    actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
    actorId: authorised.actor.userId,
    action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.WHATSAPP_HANDOFF_OPENED,
    opportunityId: authorised.opportunityId,
    dealId: authorised.dealId,
    correlationId: input.correlationId,
    sourceChannel: "whatsapp",
    metadata: { delivered: false, sent: false, read: false },
  });
  return { ok: true, delivered: false, sent: false };
}

export async function recordWhatsAppHandoffCancelled(input: {
  actorUserId: string;
  opportunityId: string;
  dealId?: string | null;
  correlationId: string;
}) {
  const authorised = await requireAuthorisedWorkspace({
    userId: input.actorUserId,
    capability: "share",
    opportunityId: input.opportunityId,
    dealId: input.dealId,
  });
  await appendDocumentWorkspaceAuditBestEffort({
    organizationId: authorised.organizationId,
    actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
    actorId: authorised.actor.userId,
    action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.WHATSAPP_HANDOFF_CANCELLED,
    opportunityId: authorised.opportunityId,
    dealId: authorised.dealId,
    correlationId: input.correlationId,
    sourceChannel: "whatsapp",
    metadata: { delivered: false, sent: false, cancelled: true },
  });
  return { ok: true, delivered: false, sent: false, cancelled: true };
}

export function documentWorkspaceSmtpRemainsDisabled(): boolean {
  return isOperationalSmtpDeliveryEnabled() === false;
}

export { DOCUMENT_WORKSPACE_INCOMPLETE_PROGRAMME_DISCLAIMER };
