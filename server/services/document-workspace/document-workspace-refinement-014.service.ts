import "server-only";

import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { readOpportunityParticipantsFromExtension } from "@/lib/lead-opportunity-journey/opportunity-loan-structure";
import {
  defaultLinkedPartyKey,
  mergeLinkedParties,
  type DealParticipantSnapshot,
  type DocumentWorkspaceLinkedParty,
} from "@/lib/document-workspace/linked-parties";
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
import {
  DOCUMENT_WORKSPACE_GENERIC_FILE_REJECTED,
  DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE,
  DOCUMENT_WORKSPACE_GENERIC_UPLOAD_LINK,
} from "@/constants/document-workspace-security";
import { validateDocumentWorkspaceUpload } from "@/lib/document-workspace/file-security";
import { consumeUploadPortalRateLimit } from "@/lib/document-workspace/upload-portal-rate-limit";
import {
  resolveDocumentWorkspaceAccess,
  assertDocumentsInAuthorisedContext,
  type DocumentWorkspaceAuthorisedContext,
} from "@server/services/document-workspace/document-workspace-access.service";
import { enterpriseTransactionDocumentService } from "@server/services/enterprise-transaction-documents/enterprise-transaction-document.service";
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

async function loadActiveUserEmail(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, email: true, isActive: true },
  });
  return user;
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

export async function listDocumentWorkspaceLinkedParties(input: {
  actorUserId: string;
  opportunityId: string;
  dealId?: string | null;
  claimedOrganizationId?: string | null;
}): Promise<{ parties: DocumentWorkspaceLinkedParty[]; defaultKey: string }> {
  const authorised = await requireAuthorisedWorkspace({
    userId: input.actorUserId,
    capability: "view",
    opportunityId: input.opportunityId,
    dealId: input.dealId,
    claimedOrganizationId: input.claimedOrganizationId,
  });
  return loadLinkedPartiesForAuthorised(authorised);
}

async function loadLinkedPartiesForAuthorised(
  authorised: DocumentWorkspaceAuthorisedContext,
): Promise<{ parties: DocumentWorkspaceLinkedParty[]; defaultKey: string }> {
  const organizationId = authorised.organizationId;
  const opportunity = await prisma.enterpriseOpportunity.findFirst({
    where: { id: authorised.opportunityId, organizationId, isDeleted: false },
    select: { id: true, lendingExtension: true },
  });
  if (!opportunity) {
    portalFailure(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }

  const opportunityParticipants = readOpportunityParticipantsFromExtension(opportunity.lendingExtension);
  let dealParticipants: DealParticipantSnapshot[] = [];
  const dealId = authorised.dealId?.trim() || "";
  if (dealId) {
    const deal = await prisma.enterpriseDeal.findFirst({
      where: { id: dealId, organizationId, isDeleted: false },
      select: { id: true, opportunityId: true },
    });
    if (!deal || deal.opportunityId !== opportunity.id) {
      portalFailure(404, "OPPORTUNITY_DEAL_MISMATCH", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
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
  claimedOrganizationId?: string | null;
}) {
  const authorised = await requireAuthorisedWorkspace({
    userId: input.actorUserId,
    capability: "request",
    opportunityId: input.opportunityId,
    dealId: input.dealId,
    participantEntityId: input.partyEntityKind === "context" ? null : input.partyEntityId,
    claimedOrganizationId: input.claimedOrganizationId,
  });
  const organizationId = authorised.organizationId;
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
  const { parties } = await loadLinkedPartiesForAuthorised(authorised);
  const party = parties.find(
    (row) =>
      row.entityId === input.partyEntityId &&
      row.entityKind === input.partyEntityKind &&
      row.selectable,
  );
  if (!party) {
    portalFailure(404, "PARTICIPANT_MISMATCH", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  const token = createOpaqueUploadToken();
  const expiresAt = defaultUploadExpiry();
  const request = await prisma.enterpriseDocumentCustomerRequest.create({
    data: {
      organizationId,
      opportunityId: authorised.opportunityId,
      dealId: authorised.dealId,
      partyEntityId: party.entityId || input.partyEntityId,
      partyEntityKind: input.partyEntityKind,
      participantRowId: party.participantRowId ?? input.participantRowId ?? null,
      participantRole: party.role ?? input.participantRole ?? null,
      createdByUserId: authorised.actor.userId,
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
  if (!consumeUploadPortalRateLimit(hashOpaqueToken(token || "missing").slice(0, 24))) {
    portalFailure(429, "RATE_LIMITED", "Please wait and try again.");
  }
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

function throwPortalLinkFailure(code: "REVOKED" | "EXPIRED"): never {
  portalFailure(
    code === "EXPIRED" ? 410 : 401,
    "UPLOAD_LINK",
    DOCUMENT_WORKSPACE_GENERIC_UPLOAD_LINK,
  );
}

async function requireVerifiedUploadSession(token: string) {
  const loaded = await loadActiveSessionByToken(token);
  if (!loaded.ok) throwPortalLinkFailure(loaded.code);
  const verified = await prisma.enterpriseDocumentUploadOtp.findFirst({
    where: {
      sessionId: loaded.session.id,
      verifiedAt: { not: null },
    },
    orderBy: { verifiedAt: "desc" },
  });
  if (!verified) {
    portalFailure(401, "UPLOAD_LINK", DOCUMENT_WORKSPACE_GENERIC_UPLOAD_LINK);
  }
  return loaded.session;
}

export async function issueUploadOtp(input: { token: string }) {
  const loaded = await loadActiveSessionByToken(input.token);
  if (!loaded.ok) throwPortalLinkFailure(loaded.code);
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
  if (!loaded.ok) throwPortalLinkFailure(loaded.code);
  const latest = await prisma.enterpriseDocumentUploadOtp.findFirst({
    where: { sessionId: loaded.session.id },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) {
    portalFailure(401, "UPLOAD_LINK", DOCUMENT_WORKSPACE_GENERIC_UPLOAD_LINK);
  }
  if (latest.verifiedAt) {
    return { ok: true as const };
  }
  if (latest.expiresAt.getTime() < Date.now()) {
    portalFailure(410, "OTP_EXPIRED", DOCUMENT_WORKSPACE_GENERIC_UPLOAD_LINK);
  }
  if (otpAttemptsExceeded(latest.attemptCount, latest.maxAttempts)) {
    portalFailure(429, "OTP_LOCKED", "Please wait and try again.");
  }

  const incremented = await prisma.enterpriseDocumentUploadOtp.updateMany({
    where: {
      id: latest.id,
      verifiedAt: null,
      expiresAt: { gt: new Date() },
      attemptCount: { lt: latest.maxAttempts },
    },
    data: {
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });
  if (incremented.count !== 1) {
    const fresh = await prisma.enterpriseDocumentUploadOtp.findFirst({ where: { id: latest.id } });
    if (fresh?.verifiedAt) return { ok: true as const };
    if (fresh && otpAttemptsExceeded(fresh.attemptCount, fresh.maxAttempts)) {
      portalFailure(429, "OTP_LOCKED", "Please wait and try again.");
    }
    portalFailure(410, "OTP_EXPIRED", DOCUMENT_WORKSPACE_GENERIC_UPLOAD_LINK);
  }

  const match = otpMatches(input.otp.trim(), latest.otpHash);
  await prisma.enterpriseDocumentUploadAudit.create({
    data: {
      organizationId: loaded.session.organizationId,
      sessionId: loaded.session.id,
      action: match ? "otp_verified" : "otp_failed",
    },
  });
  if (!match) {
    portalFailure(401, "OTP_INVALID", "Verification failed.");
  }
  await prisma.enterpriseDocumentUploadOtp.updateMany({
    where: { id: latest.id, verifiedAt: null },
    data: { verifiedAt: new Date() },
  });
  return { ok: true as const };
}

export async function describeUploadPortal(input: { token: string }) {
  const loaded = await loadActiveSessionByToken(input.token);
  if (!loaded.ok) throwPortalLinkFailure(loaded.code);
  const request = loaded.session.request;
  return {
    ok: true as const,
    partyEntityKind: request.partyEntityKind,
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
  const request = await prisma.enterpriseDocumentCustomerRequest.findFirst({
    where: { id: input.requestId },
    select: { id: true, organizationId: true, opportunityId: true, dealId: true },
  });
  if (!request) {
    portalFailure(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  const authorised = await requireAuthorisedWorkspace({
    userId: input.actorUserId,
    capability: "request",
    opportunityId: request.opportunityId,
    dealId: request.dealId,
  });
  if (request.organizationId !== authorised.organizationId) {
    portalFailure(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  const organizationId = authorised.organizationId;
  await prisma.enterpriseDocumentUploadSession.updateMany({
    where: { requestId: request.id, organizationId, active: true },
    data: { active: false, revokedAt: new Date(), revokedByUserId: authorised.actor.userId },
  });
  await prisma.enterpriseDocumentRequestAudit.create({
    data: {
      organizationId,
      requestId: request.id,
      action: "session_revoked",
      actorUserId: authorised.actor.userId,
    },
  });
  return { ok: true };
}

export async function regenerateUploadSession(input: { requestId: string; actorUserId: string }) {
  await revokeUploadSession(input);
  requireDb();
  const request = await prisma.enterpriseDocumentCustomerRequest.findFirst({
    where: { id: input.requestId },
  });
  if (!request) {
    portalFailure(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  const authorised = await requireAuthorisedWorkspace({
    userId: input.actorUserId,
    capability: "request",
    opportunityId: request.opportunityId,
    dealId: request.dealId,
  });
  if (request.organizationId !== authorised.organizationId) {
    portalFailure(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  const organizationId = authorised.organizationId;
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

export async function receiveCustomerPortalUpload(input: {
  token: string;
  requestItemId: string;
  filename: string;
  declaredMime?: string | null;
  bytes: Uint8Array;
}) {
  const session = await requireVerifiedUploadSession(input.token);
  const item = session.request.items.find((row) => row.id === input.requestItemId);
  if (!item) {
    portalFailure(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  const validation = validateDocumentWorkspaceUpload({
    filename: input.filename,
    declaredMime: input.declaredMime,
    byteLength: input.bytes.byteLength,
    bytes: input.bytes,
  });
  if (!validation.ok) {
    portalFailure(422, "INVALID_FILE", validation.message || DOCUMENT_WORKSPACE_GENERIC_FILE_REJECTED);
  }

  if (item.registryRecordId) {
    const existing = await prisma.enterpriseTransactionDocument.findFirst({
      where: {
        id: item.registryRecordId,
        organizationId: session.organizationId,
      },
    });
    if (!existing || existing.opportunityId !== session.request.opportunityId) {
      portalFailure(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
    }
    if (existing.uploadSource !== "customer_portal") {
      portalFailure(403, "FORBIDDEN", "This document cannot be replaced through the upload link.");
    }
    await enterpriseTransactionDocumentService.putBinaryForOrganization({
      organizationId: session.organizationId,
      opportunityId: session.request.opportunityId,
      documentId: existing.id,
      mimeType: validation.mimeType,
      bytes: input.bytes,
    });
    await prisma.enterpriseDocumentCustomerRequestItem.update({
      where: { id: item.id },
      data: { status: "under_review" },
    });
  } else {
    const created = await enterpriseTransactionDocumentService.upsertForOrganization(
      session.organizationId,
      {
        opportunityId: session.request.opportunityId,
        dealId: session.request.dealId,
        contactId: session.request.partyEntityKind === "contact" ? session.request.partyEntityId : null,
        clientRecordId: `customer-portal:${session.requestId}:${item.id}`,
        typeRef: item.typeRef,
        categoryLabel: item.categoryLabel,
        originalFilename: validation.safeFilename,
        displayName: validation.safeFilename,
        mimeType: validation.mimeType,
        fileSizeBytes: input.bytes.byteLength,
        status: "active",
        uploadSource: "customer_portal",
        uploadedBy: "customer-portal",
        documentScope: session.request.partyEntityKind === "contact" ? "applicant" : "shared",
        contentBase64: Buffer.from(input.bytes).toString("base64"),
      },
    );
    await prisma.enterpriseDocumentCustomerRequestItem.update({
      where: { id: item.id },
      data: { status: "under_review", registryRecordId: created.id },
    });
  }

  await prisma.enterpriseDocumentUploadAudit.create({
    data: {
      organizationId: session.organizationId,
      sessionId: session.id,
      action: "customer_uploaded",
      detail: item.typeRef,
    },
  });
  return { ok: true as const, status: "under_review" as const };
}

export async function listUnseenInboundEmailDocuments(input: {
  userId: string;
  opportunityId: string;
  dealId?: string | null;
}) {
  const authorised = await requireAuthorisedWorkspace({
    userId: input.userId,
    capability: "view",
    opportunityId: input.opportunityId,
    dealId: input.dealId,
  });
  const organizationId = authorised.organizationId;
  const records = await prisma.enterpriseTransactionDocument.findMany({
    where: {
      organizationId,
      opportunityId: authorised.opportunityId,
      status: "active",
      uploadSource: "email",
      ...(authorised.dealId ? { dealId: authorised.dealId } : {}),
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
      userId: authorised.actor.userId,
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
  const authorised = await requireAuthorisedWorkspace({
    userId: input.userId,
    capability: "view",
    documentId: input.documentId,
  });
  const organizationId = authorised.organizationId;
  await prisma.enterpriseDocumentVersionSeen.upsert({
    where: {
      organizationId_userId_documentId_versionKey: {
        organizationId,
        userId: authorised.actor.userId,
        documentId: authorised.documentId || input.documentId,
        versionKey: input.versionKey,
      },
    },
    update: { seenAt: new Date() },
    create: {
      organizationId,
      userId: authorised.actor.userId,
      documentId: authorised.documentId || input.documentId,
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
  const authorised = await requireAuthorisedWorkspace({
    userId: input.actorUserId,
    capability: "share",
    opportunityId: input.opportunityId,
    dealId: input.dealId,
  });
  await assertDocumentsInAuthorisedContext({
    context: authorised,
    documentIds: input.documentIds,
  });
  const organizationId = authorised.organizationId;
  const event = await prisma.enterpriseDocumentShareEvent.create({
    data: {
      organizationId,
      opportunityId: authorised.opportunityId,
      dealId: authorised.dealId,
      actorUserId: authorised.actor.userId,
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
  opportunityId: string;
  dealId?: string | null;
  documentIds?: string[];
  to: string[];
  cc: string[];
  htmlBody: string;
}) {
  const authorised = await requireAuthorisedWorkspace({
    userId: input.actorUserId,
    capability: "share",
    opportunityId: input.opportunityId,
    dealId: input.dealId,
  });
  if (input.documentIds?.length) {
    await assertDocumentsInAuthorisedContext({
      context: authorised,
      documentIds: input.documentIds,
    });
  }
  requireDb();
  const user = await loadActiveUserEmail(authorised.actor.userId);
  if (!user?.isActive) {
    portalFailure(403, "INACTIVE_USER", "You are not allowed to perform this action.");
  }
  const sender = enforceMandatoryInitiatingSenderCc({
    to: input.to,
    cc: input.cc,
    initiatingUser: {
      id: authorised.actor.userId,
      email: user?.email || authorised.actor.email,
      isActive: user?.isActive ?? authorised.actor.isActive,
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
