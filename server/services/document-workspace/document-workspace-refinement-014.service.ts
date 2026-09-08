import "server-only";

import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { readOpportunityParticipantsFromExtension } from "@/lib/lead-opportunity-journey/opportunity-loan-structure";
import {
  defaultLinkedPartyKey,
  mergeLinkedParties,
  type DealParticipantSnapshot,
  type DocumentWorkspaceLinkedParty,
} from "@/lib/document-workspace/linked-parties";
import { validateLockedDocumentSelection } from "@/lib/document-workspace/selection";
import { planDocumentWorkspaceZip } from "@/lib/document-workspace/zip-package";
import { buildStoreZipBlob } from "@/lib/document-package/zip";
import {
  createEmailOtp,
  createOpaqueUploadToken,
  defaultUploadExpiry,
  hashOpaqueToken,
  isDocumentWorkspaceOtpDeliveryEnabled,
  otpAttemptsExceeded,
  otpMatches,
} from "@/lib/document-workspace/upload-session-crypto";
import {
  DOCUMENT_WORKSPACE_OTP_RATE_LIMIT_MS,
  DOCUMENT_WORKSPACE_OTP_TTL_MS,
} from "@/constants/document-workspace-refinement-014";
import { enforceMandatoryInitiatingSenderCc } from "@/lib/enterprise-communication-center/initiating-sender-cc";
import { htmlToPlainTextFallback, sanitizeDocumentWorkspaceHtml } from "@/lib/document-workspace/sanitize-html";
import {
  filterUnseenInboundEmailDocuments,
  inboundEmailVersionKey,
} from "@/lib/document-workspace/inbound-email-new";
import { isValidEmailAddress } from "@/lib/enterprise-communication-center/recipient-router";

function requireDb() {
  if (!isDatabaseAvailable()) {
    throw Object.assign(new Error("Document Workspace durability requires enterprise persistence."), {
      statusCode: 503,
      code: "DOCUMENT_WORKSPACE_UNAVAILABLE",
    });
  }
}

async function requireOrg() {
  const organizationId = await resolvePilotOrganizationId();
  if (!organizationId) {
    throw Object.assign(new Error("Organization context unavailable."), {
      statusCode: 503,
      code: "ORG_CONTEXT_UNAVAILABLE",
    });
  }
  return organizationId;
}

async function loadActiveUserEmail(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, email: true, isActive: true },
  });
  return user;
}

export async function listDocumentWorkspaceLinkedParties(input: {
  opportunityId: string;
  dealId?: string | null;
}): Promise<{ parties: DocumentWorkspaceLinkedParty[]; defaultKey: string }> {
  requireDb();
  const organizationId = await requireOrg();
  const opportunity = await prisma.enterpriseOpportunity.findFirst({
    where: { id: input.opportunityId, organizationId, isDeleted: false },
    select: { id: true, lendingExtension: true },
  });
  if (!opportunity) {
    throw Object.assign(new Error("Opportunity was not found."), { statusCode: 404, code: "NOT_FOUND" });
  }

  const opportunityParticipants = readOpportunityParticipantsFromExtension(opportunity.lendingExtension);
  let dealParticipants: DealParticipantSnapshot[] = [];
  const dealId = input.dealId?.trim() || "";
  if (dealId) {
    const deal = await prisma.enterpriseDeal.findFirst({
      where: { id: dealId, organizationId, isDeleted: false },
      select: { id: true, opportunityId: true },
    });
    if (!deal || deal.opportunityId !== opportunity.id) {
      throw Object.assign(new Error("Deal does not belong to the selected Opportunity."), {
        statusCode: 409,
        code: "OPPORTUNITY_DEAL_MISMATCH",
      });
    }
    const rows = await prisma.enterpriseDealParticipant.findMany({
      where: { dealId, organizationId, isDeleted: false },
      include: { ecmContact: { select: { id: true, name: true, officialEmail: true, primaryRole: true } } },
      orderBy: { sortOrder: "asc" },
    });
    dealParticipants = rows.map((row) => ({
      id: row.id,
      ecmContactId: row.ecmContactId,
      role: row.role,
      displayName: row.ecmContact.name,
      email: row.ecmContact.officialEmail,
      entityKind: "contact",
    }));
  }

  const parties = mergeLinkedParties({
    opportunityParticipants,
    dealParticipants,
    lockKind: dealId ? "deal" : "opportunity",
  });
  return { parties, defaultKey: defaultLinkedPartyKey(parties) };
}

export async function createDocumentCustomerRequest(input: {
  actorUserId: string;
  opportunityId: string;
  dealId?: string | null;
  partyEntityId: string;
  partyEntityKind: "contact" | "company" | "context";
  participantRowId?: string | null;
  participantRole?: string | null;
  items: Array<{ typeRef: string; categoryLabel: string; requestRef: string }>;
}) {
  requireDb();
  const organizationId = await requireOrg();
  if (!input.items.length) {
    throw Object.assign(new Error("Select at least one document category."), {
      statusCode: 400,
      code: "EMPTY_REQUEST",
    });
  }
  if (input.partyEntityKind === "context") {
    throw Object.assign(new Error("Shared and property documents cannot be requested against an individual party."), {
      statusCode: 400,
      code: "INVALID_PARTY",
    });
  }
  const token = createOpaqueUploadToken();
  const expiresAt = defaultUploadExpiry();
  const request = await prisma.enterpriseDocumentCustomerRequest.create({
    data: {
      organizationId,
      opportunityId: input.opportunityId,
      dealId: input.dealId?.trim() || null,
      partyEntityId: input.partyEntityId,
      partyEntityKind: input.partyEntityKind,
      participantRowId: input.participantRowId ?? null,
      participantRole: input.participantRole ?? null,
      createdByUserId: input.actorUserId,
      expiresAt,
      items: {
        create: input.items.map((item) => ({
          organizationId,
          typeRef: item.typeRef,
          categoryLabel: item.categoryLabel,
          requestRef: item.requestRef,
          status: "requested",
        })),
      },
      sessions: {
        create: {
          organizationId,
          tokenHash: token.hash,
          tokenPrefix: token.prefix,
          expiresAt,
          active: true,
        },
      },
      audits: {
        create: {
          organizationId,
          action: "request_created",
          actorUserId: input.actorUserId,
          detail: JSON.stringify({ itemCount: input.items.length, partyEntityId: input.partyEntityId }),
        },
      },
    },
    include: { items: true, sessions: true },
  });

  return {
    requestId: request.id,
    expiresAt: expiresAt.toISOString(),
    uploadPath: `/document-upload/${encodeURIComponent(token.token)}`,
    tokenPrefix: token.prefix,
    items: request.items.map((item) => ({
      id: item.id,
      typeRef: item.typeRef,
      categoryLabel: item.categoryLabel,
      requestRef: item.requestRef,
      status: item.status,
    })),
    otpDeliveryEnabled: isDocumentWorkspaceOtpDeliveryEnabled(),
  };
}

async function loadActiveSessionByToken(token: string) {
  requireDb();
  const hash = hashOpaqueToken(token);
  const session = await prisma.enterpriseDocumentUploadSession.findFirst({
    where: { tokenHash: hash },
    include: { request: { include: { items: true } } },
  });
  if (!session || !session.active || session.revokedAt) {
    return { ok: false as const, code: "REVOKED" as const };
  }
  if (session.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, code: "EXPIRED" as const };
  }
  return { ok: true as const, session };
}

export async function issueUploadOtp(input: { token: string }) {
  const loaded = await loadActiveSessionByToken(input.token);
  if (!loaded.ok) {
    return { ok: false as const, code: loaded.code, message: "Upload link is not available." };
  }
  const latest = await prisma.enterpriseDocumentUploadOtp.findFirst({
    where: { sessionId: loaded.session.id },
    orderBy: { createdAt: "desc" },
  });
  if (
    latest?.createdAt &&
    Date.now() - latest.createdAt.getTime() < DOCUMENT_WORKSPACE_OTP_RATE_LIMIT_MS
  ) {
    await prisma.enterpriseDocumentUploadAudit.create({
      data: {
        organizationId: loaded.session.organizationId,
        sessionId: loaded.session.id,
        action: "otp_rate_limited",
      },
    });
    return { ok: false as const, code: "RATE_LIMITED" as const, message: "Please wait before requesting another code." };
  }

  const otp = createEmailOtp();
  await prisma.enterpriseDocumentUploadOtp.create({
    data: {
      organizationId: loaded.session.organizationId,
      sessionId: loaded.session.id,
      otpHash: otp.hash,
      expiresAt: new Date(Date.now() + DOCUMENT_WORKSPACE_OTP_TTL_MS),
    },
  });
  await prisma.enterpriseDocumentUploadAudit.create({
    data: {
      organizationId: loaded.session.organizationId,
      sessionId: loaded.session.id,
      action: "otp_issued",
      detail: isDocumentWorkspaceOtpDeliveryEnabled() ? "delivery_enabled" : "delivery_disabled",
    },
  });

  return {
    ok: true as const,
    deliveryEnabled: isDocumentWorkspaceOtpDeliveryEnabled(),
    maskedHint: loaded.session.request.partyEntityKind === "contact" ? "canonical party email" : "party email",
  };
}

export async function verifyUploadOtp(input: { token: string; otp: string }) {
  const loaded = await loadActiveSessionByToken(input.token);
  if (!loaded.ok) {
    return { ok: false as const, code: loaded.code, message: "Upload link is not available." };
  }
  const latest = await prisma.enterpriseDocumentUploadOtp.findFirst({
    where: { sessionId: loaded.session.id },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) {
    return { ok: false as const, code: "NO_OTP" as const, message: "No verification code is pending." };
  }
  if (latest.verifiedAt) {
    return { ok: true as const, requestId: loaded.session.requestId };
  }
  if (latest.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, code: "OTP_EXPIRED" as const, message: "Verification code expired." };
  }
  if (otpAttemptsExceeded(latest.attemptCount, latest.maxAttempts)) {
    return { ok: false as const, code: "OTP_LOCKED" as const, message: "Too many attempts." };
  }

  const nextAttempts = latest.attemptCount + 1;
  const match = otpMatches(input.otp.trim(), latest.otpHash);
  await prisma.enterpriseDocumentUploadOtp.update({
    where: { id: latest.id },
    data: {
      attemptCount: nextAttempts,
      lastAttemptAt: new Date(),
      verifiedAt: match ? new Date() : null,
    },
  });
  await prisma.enterpriseDocumentUploadAudit.create({
    data: {
      organizationId: loaded.session.organizationId,
      sessionId: loaded.session.id,
      action: match ? "otp_verified" : "otp_failed",
    },
  });
  if (!match) {
    return { ok: false as const, code: "OTP_INVALID" as const, message: "Verification failed." };
  }
  return { ok: true as const, requestId: loaded.session.requestId };
}

export async function describeUploadPortal(input: { token: string }) {
  const loaded = await loadActiveSessionByToken(input.token);
  if (!loaded.ok) {
    return { ok: false as const, code: loaded.code };
  }
  const request = loaded.session.request;
  return {
    ok: true as const,
    opportunityId: request.opportunityId,
    dealId: request.dealId,
    partyEntityId: request.partyEntityId,
    partyEntityKind: request.partyEntityKind,
    participantRowId: request.participantRowId,
    participantRole: request.participantRole,
    items: request.items.map((item) => ({
      id: item.id,
      typeRef: item.typeRef,
      categoryLabel: item.categoryLabel,
      requestRef: item.requestRef,
      status: item.status,
    })),
    expiresAt: loaded.session.expiresAt.toISOString(),
  };
}

export async function revokeUploadSession(input: { requestId: string; actorUserId: string }) {
  requireDb();
  const organizationId = await requireOrg();
  await prisma.enterpriseDocumentUploadSession.updateMany({
    where: { requestId: input.requestId, organizationId, active: true },
    data: { active: false, revokedAt: new Date(), revokedByUserId: input.actorUserId },
  });
  await prisma.enterpriseDocumentRequestAudit.create({
    data: {
      organizationId,
      requestId: input.requestId,
      action: "session_revoked",
      actorUserId: input.actorUserId,
    },
  });
  return { ok: true };
}

export async function regenerateUploadSession(input: { requestId: string; actorUserId: string }) {
  await revokeUploadSession(input);
  requireDb();
  const organizationId = await requireOrg();
  const request = await prisma.enterpriseDocumentCustomerRequest.findFirst({
    where: { id: input.requestId, organizationId },
  });
  if (!request) {
    throw Object.assign(new Error("Request was not found."), { statusCode: 404, code: "NOT_FOUND" });
  }
  const token = createOpaqueUploadToken();
  const expiresAt = defaultUploadExpiry();
  await prisma.enterpriseDocumentUploadSession.create({
    data: {
      organizationId,
      requestId: request.id,
      tokenHash: token.hash,
      tokenPrefix: token.prefix,
      expiresAt,
      active: true,
    },
  });
  await prisma.enterpriseDocumentRequestAudit.create({
    data: {
      organizationId,
      requestId: request.id,
      action: "session_regenerated",
      actorUserId: input.actorUserId,
    },
  });
  return {
    uploadPath: `/document-upload/${encodeURIComponent(token.token)}`,
    expiresAt: expiresAt.toISOString(),
    tokenPrefix: token.prefix,
  };
}

export async function markCustomerUploadReceived(input: {
  token: string;
  requestItemId: string;
  registryRecordId: string;
}) {
  const loaded = await loadActiveSessionByToken(input.token);
  if (!loaded.ok) return loaded;
  const item = loaded.session.request.items.find((row) => row.id === input.requestItemId);
  if (!item) {
    return { ok: false as const, code: "UNKNOWN_ITEM" as const };
  }
  await prisma.enterpriseDocumentCustomerRequestItem.update({
    where: { id: item.id },
    data: { status: "under_review", registryRecordId: input.registryRecordId },
  });
  await prisma.enterpriseDocumentUploadAudit.create({
    data: {
      organizationId: loaded.session.organizationId,
      sessionId: loaded.session.id,
      action: "customer_uploaded",
      detail: input.registryRecordId,
    },
  });
  return { ok: true as const, status: "under_review" as const };
}

export async function listUnseenInboundEmailDocuments(input: {
  userId: string;
  opportunityId: string;
  dealId?: string | null;
}) {
  requireDb();
  const organizationId = await requireOrg();
  const records = await prisma.enterpriseTransactionDocument.findMany({
    where: {
      organizationId,
      opportunityId: input.opportunityId,
      status: "active",
      uploadSource: "email",
      ...(input.dealId?.trim() ? { dealId: input.dealId.trim() } : {}),
    },
    select: {
      id: true,
      contentVersion: true,
      updatedAt: true,
      uploadSource: true,
      originalFilename: true,
      contactId: true,
      ownerEntityId: true,
      documentScope: true,
    },
  });
  const seen = await prisma.enterpriseDocumentVersionSeen.findMany({
    where: {
      organizationId,
      userId: input.userId,
      documentId: { in: records.map((row) => row.id) },
    },
    select: { documentId: true, versionKey: true },
  });
  const candidates = records.map((row) => ({
    documentId: row.id,
    versionKey: inboundEmailVersionKey({
      versionNumber: row.contentVersion,
      uploadedAt: row.updatedAt.toISOString(),
    }),
    uploadSource: row.uploadSource,
    originalFilename: row.originalFilename,
    ownerEntityId: row.ownerEntityId || row.contactId,
    documentScope: row.documentScope,
  }));
  const unseen = filterUnseenInboundEmailDocuments({ candidates, seenKeys: seen });
  return { unseen, count: unseen.length };
}

export async function markDocumentVersionSeen(input: {
  userId: string;
  documentId: string;
  versionKey: string;
}) {
  requireDb();
  const organizationId = await requireOrg();
  await prisma.enterpriseDocumentVersionSeen.upsert({
    where: {
      organizationId_userId_documentId_versionKey: {
        organizationId,
        userId: input.userId,
        documentId: input.documentId,
        versionKey: input.versionKey,
      },
    },
    update: { seenAt: new Date() },
    create: {
      organizationId,
      userId: input.userId,
      documentId: input.documentId,
      versionKey: input.versionKey,
    },
  });
  return { ok: true };
}

export async function recordShareEvent(input: {
  actorUserId: string;
  opportunityId: string;
  dealId?: string | null;
  recipientLabel: string;
  recipientEmail?: string | null;
  recipientContactId?: string | null;
  documentIds: string[];
  versionIds: string[];
  attachmentMode: "individual" | "zip";
  zipFilename?: string | null;
  outboxId?: string | null;
}) {
  requireDb();
  const organizationId = await requireOrg();
  const lock = validateLockedDocumentSelection({
    organizationId,
    opportunityId: input.opportunityId,
    dealId: input.dealId,
    selected: input.documentIds.map((id) => ({
      id,
      organizationId,
      opportunityId: input.opportunityId,
      dealId: input.dealId,
    })),
  });
  if (!lock.ok) {
    throw Object.assign(new Error("Selection is outside the locked transaction."), {
      statusCode: 409,
      code: lock.code,
    });
  }
  const event = await prisma.enterpriseDocumentShareEvent.create({
    data: {
      organizationId,
      opportunityId: input.opportunityId,
      dealId: input.dealId?.trim() || null,
      actorUserId: input.actorUserId,
      recipientLabel: input.recipientLabel,
      recipientEmail: input.recipientEmail ?? null,
      recipientContactId: input.recipientContactId ?? null,
      documentIdsJson: input.documentIds,
      versionIdsJson: input.versionIds,
      attachmentMode: input.attachmentMode,
      zipFilename: input.zipFilename ?? null,
      outboxId: input.outboxId ?? null,
    },
  });
  return { shareEventId: event.id };
}

export async function composeManualDocumentEmail(input: {
  actorUserId: string;
  to: string[];
  cc: string[];
  htmlBody: string;
}) {
  requireDb();
  const user = await loadActiveUserEmail(input.actorUserId);
  const sender = enforceMandatoryInitiatingSenderCc({
    to: input.to,
    cc: input.cc,
    initiatingUser: {
      id: input.actorUserId,
      email: user?.email,
      isActive: user?.isActive,
    },
  });
  if (!sender.ok) return sender;
  const html = sanitizeDocumentWorkspaceHtml(input.htmlBody);
  return {
    ...sender,
    html,
    text: htmlToPlainTextFallback(html || input.htmlBody),
  };
}

export function assertManualRecipientAllowed(email: string, canonicalEmails: string[]): {
  canonical: boolean;
  email: string;
} {
  const trimmed = email.trim();
  if (!isValidEmailAddress(trimmed)) {
    throw Object.assign(new Error("Recipient email is invalid."), { statusCode: 400, code: "INVALID_EMAIL" });
  }
  const canonical = canonicalEmails.some((item) => item.trim().toLowerCase() === trimmed.toLowerCase());
  return { canonical, email: trimmed };
}

export { planDocumentWorkspaceZip, buildStoreZipBlob };
