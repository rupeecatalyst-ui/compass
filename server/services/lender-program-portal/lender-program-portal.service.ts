/**
 * CO-LEND-001 — Lender Program Portal service.
 * Submissions stage in portal tables; live EnterpriseLenderProgram updates only on publish.
 */
import { randomUUID } from "node:crypto";
import {
  LENDER_PROGRAM_PORTAL_DEFAULT_TTL_DAYS,
  resolveProgramTemplateForProductCode,
} from "@/constants/lender-program-portal";
import {
  buildLenderProgramPortalPath,
  generateLenderProgramPortalToken,
  generateOtpCode,
  hashOtp,
  inviteExpiresAt,
  otpExpiresAt,
} from "@/lib/lender-program-portal/security";
import { prisma } from "@server/lib/prisma";
import type { Prisma } from "@prisma/client";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { lenderRegistryRepository } from "@server/repositories/lender-registry";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";
import type {
  LenderProgramDocumentLink,
  LenderProgramPayload,
  LenderProgramPortalInvite,
  LenderProgramSubmission,
  LenderProgramVerifier,
} from "@/types/lender-program-portal";
import { resolveOrCreateLenderRepresentativeContact } from "./contact-resolve";
import {
  appendProgramDialogueMessage,
  buildSubmissionReceivedMessage,
  createProgramDialogueThread,
  listProgramDialogueMessages,
  resolveAssignedRmParticipant,
} from "./dialogue";

function createId() {
  return randomUUID().replace(/-/g, "");
}

function serializeInvite(
  row: {
    id: string;
    lenderId: string;
    token: string;
    status: string;
    expiresAt: Date;
    revokedAt: Date | null;
    createdBy: string;
    notes: string | null;
    useCount: number;
    maxUses: number | null;
    otpVerifiedAt: Date | null;
    emailOtpVerifiedAt?: Date | null;
    mobileOtpVerifiedAt?: Date | null;
    createdAt: Date;
  },
  lenderName?: string,
): LenderProgramPortalInvite {
  return {
    id: row.id,
    lenderId: row.lenderId,
    lenderName,
    token: row.token,
    status: row.status as LenderProgramPortalInvite["status"],
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdBy: row.createdBy,
    notes: row.notes,
    useCount: row.useCount,
    maxUses: row.maxUses,
    otpVerifiedAt: row.otpVerifiedAt?.toISOString() ?? null,
    emailOtpVerifiedAt: row.emailOtpVerifiedAt?.toISOString() ?? null,
    mobileOtpVerifiedAt: row.mobileOtpVerifiedAt?.toISOString() ?? null,
    portalPath: buildLenderProgramPortalPath(row.token),
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeSubmission(row: {
  id: string;
  inviteId: string;
  lenderId: string;
  productCode: string;
  productId: string | null;
  templateKey: string;
  programName: string;
  status: string;
  verifierName: string | null;
  verifierEmployeeId: string | null;
  verifierEmail: string | null;
  verifierMobile: string | null;
  verifierDesignation: string | null;
  verifierBranch: string | null;
  verifierRegion: string | null;
  ecmContactId?: string | null;
  dialogueThreadId?: string | null;
  emailVerifiedAt?: Date | null;
  mobileVerifiedAt?: Date | null;
  approvedAt?: Date | null;
  proposedPayload: unknown;
  currentSnapshot: unknown;
  documentLinks: unknown;
  versionNumber: number;
  previousProgramId: string | null;
  publishedProgramId: string | null;
  submittedAt: Date | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  publishedBy: string | null;
  publishedAt: Date | null;
  schedulePublishAt: Date | null;
  adminComments: string | null;
  clarificationNotes: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}, lenderName?: string): LenderProgramSubmission {
  const verifier: LenderProgramVerifier | null =
    row.verifierName && row.verifierEmail && row.verifierMobile
      ? {
          lenderName: lenderName || "",
          employeeName: row.verifierName,
          employeeId: row.verifierEmployeeId ?? undefined,
          officialEmail: row.verifierEmail,
          officialMobile: row.verifierMobile,
          designation: row.verifierDesignation || undefined,
          branch: row.verifierBranch || undefined,
          region: row.verifierRegion ?? undefined,
        }
      : null;
  return {
    id: row.id,
    inviteId: row.inviteId,
    lenderId: row.lenderId,
    lenderName,
    productCode: row.productCode,
    templateKey: row.templateKey,
    programName: row.programName,
    status: row.status as LenderProgramSubmission["status"],
    verifier,
    ecmContactId: row.ecmContactId ?? null,
    dialogueThreadId: row.dialogueThreadId ?? null,
    emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
    mobileVerifiedAt: row.mobileVerifiedAt?.toISOString() ?? null,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    proposedPayload: (row.proposedPayload ?? {}) as LenderProgramPayload,
    currentSnapshot: (row.currentSnapshot ?? null) as LenderProgramPayload | null,
    documentLinks: (row.documentLinks as LenderProgramDocumentLink[] | null) ?? [],
    versionNumber: row.versionNumber,
    previousProgramId: row.previousProgramId,
    publishedProgramId: row.publishedProgramId,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    publishedBy: row.publishedBy,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    schedulePublishAt: row.schedulePublishAt?.toISOString() ?? null,
    adminComments: row.adminComments,
    clarificationNotes: row.clarificationNotes,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function audit(
  organizationId: string,
  action: string,
  actor: string,
  detail: Record<string, unknown>,
  refs?: { inviteId?: string; submissionId?: string; ipAddress?: string },
) {
  await prisma.lenderProgramPortalAudit.create({
    data: {
      id: createId(),
      organizationId,
      action,
      actor,
      detail: detail as Prisma.InputJsonValue,
      inviteId: refs?.inviteId,
      submissionId: refs?.submissionId,
      ipAddress: refs?.ipAddress,
    },
  });
}

function lenderLabel(lender?: {
  displayName?: string | null;
  legalName?: string | null;
} | null): string | undefined {
  return lender?.displayName || lender?.legalName || undefined;
}

function assertInviteUsable(invite: {
  status: string;
  expiresAt: Date;
  revokedAt: Date | null;
  maxUses: number | null;
  useCount: number;
}) {
  if (invite.status === "revoked" || invite.revokedAt) {
    throw Object.assign(new Error("This program link has been revoked."), {
      statusCode: 410,
      code: "INVITE_REVOKED",
    });
  }
  if (invite.expiresAt.getTime() < Date.now() || invite.status === "expired") {
    throw Object.assign(new Error("This program link has expired."), {
      statusCode: 410,
      code: "INVITE_EXPIRED",
    });
  }
  if (invite.maxUses != null && invite.useCount >= invite.maxUses) {
    throw Object.assign(new Error("This program link has reached its use limit."), {
      statusCode: 410,
      code: "INVITE_EXHAUSTED",
    });
  }
}

export const lenderProgramPortalService = {
  async createInvite(input: {
    lenderId: string;
    ttlDays?: number;
    maxUses?: number | null;
    notes?: string;
    actorUserId: string;
    actorName: string;
  }) {
    const organizationId = await resolvePilotOrganizationId();
    const lender = await lenderRegistryRepository.findLenderById(input.lenderId);
    if (!lender || lender.organizationId !== organizationId) {
      throw Object.assign(new Error("Lender not found."), { statusCode: 404 });
    }
    const token = generateLenderProgramPortalToken();
    const row = await prisma.lenderProgramPortalInvite.create({
      data: {
        id: createId(),
        organizationId,
        lenderId: lender.id,
        token,
        status: "active",
        expiresAt: inviteExpiresAt(
          input.ttlDays ?? LENDER_PROGRAM_PORTAL_DEFAULT_TTL_DAYS,
        ),
        maxUses: input.maxUses ?? null,
        createdBy: input.actorName || input.actorUserId,
        notes: input.notes?.trim() || null,
      },
    });
    await audit(organizationId, "invite_created", input.actorName, {
      lenderId: lender.id,
      expiresAt: row.expiresAt.toISOString(),
    }, { inviteId: row.id });
    return serializeInvite(row, lenderLabel(lender));
  },

  async listInvites() {
    const organizationId = await resolvePilotOrganizationId();
    const rows = await prisma.lenderProgramPortalInvite.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const lenders = await prisma.enterpriseLender.findMany({
      where: { organizationId, id: { in: [...new Set(rows.map((r) => r.lenderId))] } },
      select: { id: true, displayName: true, legalName: true },
    });
    const nameById = new Map<string, string | undefined>(
      lenders.map((l) => [l.id, lenderLabel(l)]),
    );
    return rows.map((r) => serializeInvite(r, nameById.get(r.lenderId)));
  },

  async revokeInvite(inviteId: string, actorName: string, reason?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const row = await prisma.lenderProgramPortalInvite.findFirst({
      where: { id: inviteId, organizationId },
    });
    if (!row) throw Object.assign(new Error("Invite not found."), { statusCode: 404 });
    const updated = await prisma.lenderProgramPortalInvite.update({
      where: { id: row.id },
      data: {
        status: "revoked",
        revokedAt: new Date(),
        revokedBy: actorName,
        revokeReason: reason?.trim() || null,
      },
    });
    await audit(organizationId, "invite_revoked", actorName, { reason }, { inviteId: row.id });
    return serializeInvite(updated);
  },

  async resolveToken(token: string) {
    const organizationId = await resolvePilotOrganizationId();
    const invite = await prisma.lenderProgramPortalInvite.findFirst({
      where: { organizationId, token },
    });
    if (!invite) {
      throw Object.assign(new Error("Invalid program link."), { statusCode: 404 });
    }
    assertInviteUsable(invite);
    const lender = await lenderRegistryRepository.findLenderById(invite.lenderId);
    const productsSupported = Array.isArray(lender?.productsSupported)
      ? (lender!.productsSupported as string[])
      : typeof lender?.productsSupported === "string"
        ? (() => {
            try {
              return JSON.parse(lender.productsSupported as string) as string[];
            } catch {
              return [];
            }
          })()
        : [];
    const products = productsSupported.map((code) => ({
      code,
      label: code.replace(/_/g, " "),
    }));
    return {
      inviteId: invite.id,
      lenderId: invite.lenderId,
      lenderName: lender?.displayName || lender?.legalName || "Lender",
      expiresAt: invite.expiresAt.toISOString(),
      otpRequired: true,
      otpVerified: Boolean(invite.otpVerifiedAt),
      products:
        products.length > 0
          ? products
          : [
              { code: "HOME_LOAN", label: "Home Loan" },
              { code: "LAP", label: "Loan Against Property" },
              { code: "BUSINESS_LOAN", label: "Business Loan" },
              { code: "WORKING_CAPITAL", label: "Working Capital" },
              { code: "COMM_PURCHASE", label: "Commercial Purchase" },
              { code: "PERSONAL_LOAN", label: "Personal Loan" },
            ],
    };
  },

  async requestOtp(token: string, verifier: LenderProgramVerifier, ipAddress?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const invite = await prisma.lenderProgramPortalInvite.findFirst({
      where: { organizationId, token },
    });
    if (!invite) throw Object.assign(new Error("Invalid program link."), { statusCode: 404 });
    assertInviteUsable(invite);
    if (!verifier.employeeName?.trim() || !verifier.officialEmail?.trim() || !verifier.officialMobile?.trim()) {
      throw Object.assign(
        new Error("Full Name, Official Email and Official Mobile are required."),
        { statusCode: 400 },
      );
    }
    const emailCode = generateOtpCode();
    const mobileCode = generateOtpCode();
    const expires = otpExpiresAt();
    await prisma.lenderProgramPortalInvite.update({
      where: { id: invite.id },
      data: {
        emailOtpHash: hashOtp(emailCode),
        emailOtpExpiresAt: expires,
        emailOtpVerifiedAt: null,
        mobileOtpHash: hashOtp(mobileCode),
        mobileOtpExpiresAt: expires,
        mobileOtpVerifiedAt: null,
        otpVerifiedAt: null,
        pendingVerifier: verifier as unknown as Prisma.InputJsonValue,
        // Legacy single-OTP columns cleared
        otpHash: null,
        otpExpiresAt: null,
      },
    });
    await audit(
      organizationId,
      "otp_requested",
      verifier.employeeName,
      {
        email: verifier.officialEmail,
        mobile: verifier.officialMobile,
        designation: verifier.designation,
        branch: verifier.branch,
        dualChannel: true,
      },
      { inviteId: invite.id, ipAddress },
    );
    return {
      ok: true as const,
      emailOtpPreview: emailCode,
      mobileOtpPreview: mobileCode,
      /** @deprecated use emailOtpPreview / mobileOtpPreview */
      otpPreview: emailCode,
    };
  },

  async verifyOtp(
    token: string,
    input: { emailCode: string; mobileCode: string } | string,
    ipAddress?: string,
  ) {
    const organizationId = await resolvePilotOrganizationId();
    const invite = await prisma.lenderProgramPortalInvite.findFirst({
      where: { organizationId, token },
    });
    if (!invite) throw Object.assign(new Error("Invalid program link."), { statusCode: 404 });
    assertInviteUsable(invite);

    // Dual-channel OTP (canonical). Legacy single-code path kept for older clients.
    if (typeof input === "string") {
      if (!invite.otpHash || !invite.otpExpiresAt || invite.otpExpiresAt.getTime() < Date.now()) {
        throw Object.assign(new Error("OTP expired. Request a new code."), { statusCode: 400 });
      }
      if (hashOtp(input) !== invite.otpHash) {
        throw Object.assign(new Error("Invalid OTP."), { statusCode: 401, code: "OTP_INVALID" });
      }
      const now = new Date();
      await prisma.lenderProgramPortalInvite.update({
        where: { id: invite.id },
        data: {
          otpVerifiedAt: now,
          emailOtpVerifiedAt: now,
          mobileOtpVerifiedAt: now,
          otpHash: null,
          otpExpiresAt: null,
        },
      });
      await audit(organizationId, "otp_verified", "lender", { mode: "legacy" }, { inviteId: invite.id, ipAddress });
      return { ok: true as const, emailVerified: true, mobileVerified: true };
    }

    if (
      !invite.emailOtpHash ||
      !invite.emailOtpExpiresAt ||
      invite.emailOtpExpiresAt.getTime() < Date.now() ||
      !invite.mobileOtpHash ||
      !invite.mobileOtpExpiresAt ||
      invite.mobileOtpExpiresAt.getTime() < Date.now()
    ) {
      throw Object.assign(new Error("OTP expired. Request a new code."), { statusCode: 400 });
    }
    const emailOk = hashOtp(input.emailCode) === invite.emailOtpHash;
    const mobileOk = hashOtp(input.mobileCode) === invite.mobileOtpHash;
    if (!emailOk || !mobileOk) {
      throw Object.assign(
        new Error(
          !emailOk && !mobileOk
            ? "Invalid email and mobile OTP."
            : !emailOk
              ? "Invalid email OTP."
              : "Invalid mobile OTP.",
        ),
        { statusCode: 401, code: "OTP_INVALID" },
      );
    }
    const now = new Date();
    await prisma.lenderProgramPortalInvite.update({
      where: { id: invite.id },
      data: {
        otpVerifiedAt: now,
        emailOtpVerifiedAt: now,
        mobileOtpVerifiedAt: now,
        emailOtpHash: null,
        emailOtpExpiresAt: null,
        mobileOtpHash: null,
        mobileOtpExpiresAt: null,
      },
    });
    await audit(
      organizationId,
      "otp_verified",
      "lender",
      { emailVerified: true, mobileVerified: true },
      { inviteId: invite.id, ipAddress },
    );
    return { ok: true as const, emailVerified: true, mobileVerified: true };
  },

  async submitProgram(
    token: string,
    input: {
      productCode: string;
      programName: string;
      payload: LenderProgramPayload;
      documentLinks?: LenderProgramDocumentLink[];
      verifier: LenderProgramVerifier;
      ipAddress?: string;
    },
  ) {
    const organizationId = await resolvePilotOrganizationId();
    const invite = await prisma.lenderProgramPortalInvite.findFirst({
      where: { organizationId, token },
    });
    if (!invite) throw Object.assign(new Error("Invalid program link."), { statusCode: 404 });
    assertInviteUsable(invite);
    if (!invite.otpVerifiedAt) {
      throw Object.assign(new Error("Verify Official Email and Mobile OTP before submitting."), {
        statusCode: 403,
        code: "OTP_REQUIRED",
      });
    }
    const pending = (invite.pendingVerifier ?? null) as LenderProgramVerifier | null;
    const verifier: LenderProgramVerifier = {
      ...input.verifier,
      employeeName: input.verifier.employeeName || pending?.employeeName || "",
      officialEmail: input.verifier.officialEmail || pending?.officialEmail || "",
      officialMobile: input.verifier.officialMobile || pending?.officialMobile || "",
      designation: input.verifier.designation || pending?.designation,
      branch: input.verifier.branch || pending?.branch,
      region: input.verifier.region || pending?.region,
      employeeId: input.verifier.employeeId || pending?.employeeId,
    };
    if (!verifier.employeeName.trim() || !verifier.officialEmail.trim() || !verifier.officialMobile.trim()) {
      throw Object.assign(
        new Error("Full Name, Official Email and Official Mobile are required."),
        { statusCode: 400 },
      );
    }

    const lender = await lenderRegistryRepository.findLenderById(invite.lenderId);
    const lenderName = lenderLabel(lender) || "Lender";
    const { contact, created: contactCreated } = await resolveOrCreateLenderRepresentativeContact({
      organizationId,
      lenderId: invite.lenderId,
      lenderName,
      verifier: { ...verifier, lenderName },
    });

    const template = resolveProgramTemplateForProductCode(input.productCode);
    const productLabel = template.label;
    const existing = await prisma.enterpriseLenderProgram.findFirst({
      where: {
        organizationId,
        lenderId: invite.lenderId,
        productCode: input.productCode,
        isDeleted: false,
        status: "active",
        enabled: true,
      },
      orderBy: { versionNumber: "desc" },
    });
    const currentSnapshot: LenderProgramPayload | null = existing
      ? {
          programName: existing.label,
          interestRate: existing.roiPercent ?? "",
          processingFee: existing.processingFeeLabel || existing.processingFeePct || "",
          maxLoanAmount: existing.maxFundingAmount ?? "",
          minIncome: existing.minIncomeAmount ?? "",
          minCibil: existing.minCibil ?? "",
          maxTenureMonths: existing.maxTenureMonths ?? "",
          remarks: existing.remarks ?? "",
        }
      : null;

    const rm = resolveAssignedRmParticipant(lender?.rmMapping);
    const participants = [
      {
        kind: "lender_representative" as const,
        id: contact.id,
        name: contact.name,
        email: verifier.officialEmail,
        role: "Lender Representative",
      },
      ...(rm ? [rm] : []),
      {
        kind: "administrator" as const,
        name: "Administrator",
        role: "Administrator",
      },
    ];

    const thread = await createProgramDialogueThread({
      organizationId,
      lenderId: invite.lenderId,
      ecmContactId: contact.id,
      subject: `${productLabel} program update · ${lenderName}`,
      participants,
    });

    const submittedAt = new Date();
    const initial = buildSubmissionReceivedMessage({
      submitterName: verifier.employeeName,
      lenderName,
      designation: verifier.designation,
      productLabel,
      at: submittedAt,
    });
    await appendProgramDialogueMessage({
      organizationId,
      threadId: thread.id,
      eventKind: "submission_received",
      title: initial.title,
      body: initial.body,
      actorId: contact.id,
      actorName: verifier.employeeName,
      actorRole: "Lender Representative",
      payload: { productCode: input.productCode },
    });

    const row = await prisma.lenderProgramSubmission.create({
      data: {
        id: createId(),
        organizationId,
        inviteId: invite.id,
        lenderId: invite.lenderId,
        productCode: input.productCode,
        templateKey: template.key,
        programName: input.programName.trim() || String(input.payload.programName || "Program"),
        status: "pending_review",
        verifierName: verifier.employeeName,
        verifierEmployeeId: verifier.employeeId ?? null,
        verifierEmail: verifier.officialEmail,
        verifierMobile: verifier.officialMobile,
        verifierDesignation: verifier.designation ?? null,
        verifierBranch: verifier.branch ?? null,
        verifierRegion: verifier.region ?? null,
        ecmContactId: contact.id,
        dialogueThreadId: thread.id,
        emailVerifiedAt: invite.emailOtpVerifiedAt ?? invite.otpVerifiedAt,
        mobileVerifiedAt: invite.mobileOtpVerifiedAt ?? invite.otpVerifiedAt,
        proposedPayload: {
          ...input.payload,
          programName: input.programName.trim() || input.payload.programName,
        },
        currentSnapshot: currentSnapshot ?? undefined,
        documentLinks: input.documentLinks ?? [],
        versionNumber: (existing?.versionNumber ?? 0) + 1,
        previousProgramId: existing?.id ?? null,
        submittedAt,
        ipAddress: input.ipAddress ?? null,
      },
    });
    await prisma.lenderProgramPortalInvite.update({
      where: { id: invite.id },
      data: { useCount: { increment: 1 } },
    });
    await audit(
      organizationId,
      "submission_created",
      verifier.employeeName,
      {
        productCode: input.productCode,
        programName: row.programName,
        ecmContactId: contact.id,
        dialogueThreadId: thread.id,
        contactCreated,
      },
      { inviteId: invite.id, submissionId: row.id, ipAddress: input.ipAddress },
    );
    await audit(
      organizationId,
      "notify_lender_submission_received",
      verifier.officialEmail,
      { submissionId: row.id, dialogueThreadId: thread.id },
      { inviteId: invite.id, submissionId: row.id },
    );
    await audit(
      organizationId,
      "notify_admin_pending_review",
      "administrator",
      { submissionId: row.id, lenderId: invite.lenderId, dialogueThreadId: thread.id },
      { submissionId: row.id },
    );
    return serializeSubmission(row, lenderName);
  },

  async listSubmissions(status?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const rows = await prisma.lenderProgramSubmission.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    const lenders = await prisma.enterpriseLender.findMany({
      where: { organizationId, id: { in: [...new Set(rows.map((r) => r.lenderId))] } },
      select: { id: true, displayName: true, legalName: true },
    });
    const nameById = new Map<string, string | undefined>(
      lenders.map((l) => [l.id, lenderLabel(l)]),
    );
    return rows.map((r) => serializeSubmission(r, nameById.get(r.lenderId)));
  },

  async getSubmission(id: string) {
    const organizationId = await resolvePilotOrganizationId();
    const row = await prisma.lenderProgramSubmission.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw Object.assign(new Error("Submission not found."), { statusCode: 404 });
    const lender = await lenderRegistryRepository.findLenderById(row.lenderId);
    const base = serializeSubmission(row, lenderLabel(lender));
    if (!row.dialogueThreadId) return base;
    const messages = await listProgramDialogueMessages(row.dialogueThreadId);
    return {
      ...base,
      dialogueMessages: messages.map((m) => ({
        id: m.id,
        threadId: m.threadId,
        eventKind: m.eventKind,
        title: m.title,
        body: m.body,
        actorId: m.actorId,
        actorName: m.actorName,
        actorRole: m.actorRole,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  },

  async reviewSubmission(
    id: string,
    input: {
      action: "approve" | "reject" | "clarify" | "publish" | "schedule" | "save_draft";
      comments?: string;
      clarificationNotes?: string;
      rejectionReason?: string;
      schedulePublishAt?: string;
      actorUserId: string;
      actorName: string;
    },
  ) {
    const organizationId = await resolvePilotOrganizationId();
    const row = await prisma.lenderProgramSubmission.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw Object.assign(new Error("Submission not found."), { statusCode: 404 });

    const appendDialogue = async (
      eventKind:
        | "clarification_requested"
        | "approved"
        | "rejected"
        | "published"
        | "version_updated"
        | "scheduled"
        | "internal_comment",
      title: string,
      body: string,
    ) => {
      if (!row.dialogueThreadId) return;
      await appendProgramDialogueMessage({
        organizationId,
        threadId: row.dialogueThreadId,
        eventKind,
        title,
        body,
        actorId: input.actorUserId,
        actorName: input.actorName,
        actorRole: "Administrator",
      });
    };

    if (input.action === "save_draft") {
      const updated = await prisma.lenderProgramSubmission.update({
        where: { id: row.id },
        data: {
          adminComments: input.comments ?? row.adminComments,
          reviewedBy: input.actorName,
          reviewedAt: new Date(),
        },
      });
      await audit(organizationId, "review_draft_saved", input.actorName, {}, { submissionId: id });
      if (input.comments?.trim()) {
        await appendDialogue(
          "internal_comment",
          "Internal comment saved",
          input.comments.trim(),
        );
      }
      return serializeSubmission(updated);
    }

    if (input.action === "reject") {
      const reason = input.rejectionReason || input.comments || "Rejected";
      const updated = await prisma.lenderProgramSubmission.update({
        where: { id: row.id },
        data: {
          status: "rejected",
          reviewedBy: input.actorName,
          reviewedAt: new Date(),
          rejectionReason: reason,
          adminComments: input.comments ?? row.adminComments,
        },
      });
      await audit(organizationId, "submission_rejected", input.actorName, {}, { submissionId: id });
      await audit(
        organizationId,
        "notify_lender_rejected",
        row.verifierEmail || "lender",
        { reason },
        { submissionId: id },
      );
      await appendDialogue(
        "rejected",
        "Submission rejected",
        `${input.actorName} rejected the program submission. Reason: ${reason}`,
      );
      return serializeSubmission(updated);
    }

    if (input.action === "clarify") {
      const notes = input.clarificationNotes || input.comments || "";
      const updated = await prisma.lenderProgramSubmission.update({
        where: { id: row.id },
        data: {
          status: "clarification_requested",
          reviewedBy: input.actorName,
          reviewedAt: new Date(),
          clarificationNotes: notes,
          adminComments: input.comments ?? row.adminComments,
        },
      });
      await audit(organizationId, "clarification_requested", input.actorName, {}, { submissionId: id });
      await audit(
        organizationId,
        "notify_lender_clarification_requested",
        row.verifierEmail || "lender",
        { notes },
        { submissionId: id },
      );
      await appendDialogue(
        "clarification_requested",
        "Clarification requested",
        `${input.actorName} requested clarification: ${notes || "Please provide additional information."}`,
      );
      return serializeSubmission(updated);
    }

    if (input.action === "schedule") {
      const when = input.schedulePublishAt ? new Date(input.schedulePublishAt) : null;
      if (!when || Number.isNaN(when.getTime())) {
        throw Object.assign(new Error("schedulePublishAt is required."), { statusCode: 400 });
      }
      const updated = await prisma.lenderProgramSubmission.update({
        where: { id: row.id },
        data: {
          status: "scheduled",
          schedulePublishAt: when,
          reviewedBy: input.actorName,
          reviewedAt: new Date(),
          adminComments: input.comments ?? row.adminComments,
        },
      });
      await audit(organizationId, "submission_scheduled", input.actorName, { when: when.toISOString() }, { submissionId: id });
      await appendDialogue(
        "scheduled",
        "Publication scheduled",
        `${input.actorName} scheduled publication for ${when.toISOString()}.`,
      );
      return serializeSubmission(updated);
    }

    if (input.action === "approve") {
      const approvedAt = new Date();
      const updated = await prisma.lenderProgramSubmission.update({
        where: { id: row.id },
        data: {
          status: "approved",
          reviewedBy: input.actorName,
          reviewedAt: approvedAt,
          approvedAt,
          adminComments: input.comments ?? row.adminComments,
        },
      });
      await audit(organizationId, "submission_approved", input.actorName, {}, { submissionId: id });
      await audit(
        organizationId,
        "notify_lender_approved",
        row.verifierEmail || "lender",
        {},
        { submissionId: id },
      );
      await appendDialogue(
        "approved",
        "Submission approved",
        `${input.actorName} approved the program submission. Publication may follow.`,
      );
      return serializeSubmission(updated);
    }

    // publish — create new EnterpriseLenderProgram version (never overwrite)
    const payload = (row.proposedPayload ?? {}) as LenderProgramPayload;
    const roi =
      typeof payload.interestRate === "number"
        ? payload.interestRate
        : Number.parseFloat(String(payload.interestRate ?? "")) || null;
    const feePct =
      typeof payload.processingFee === "number"
        ? payload.processingFee
        : Number.parseFloat(String(payload.processingFee ?? "")) || null;
    const maxLoan =
      typeof payload.maxLoanAmount === "number"
        ? payload.maxLoanAmount
        : Number.parseFloat(String(payload.maxLoanAmount ?? "")) || null;
    const minIncome =
      typeof payload.minIncome === "number"
        ? payload.minIncome
        : Number.parseFloat(String(payload.minIncome ?? "")) || null;
    const minCibil =
      typeof payload.minCibil === "number"
        ? payload.minCibil
        : Number.parseInt(String(payload.minCibil ?? ""), 10) || null;
    const maxTenure =
      typeof payload.maxTenureMonths === "number"
        ? payload.maxTenureMonths
        : Number.parseInt(String(payload.maxTenureMonths ?? ""), 10) || null;
    const ltv =
      typeof payload.ltvPercent === "number"
        ? payload.ltvPercent
        : Number.parseFloat(String(payload.ltvPercent ?? "")) || null;

    if (row.previousProgramId) {
      await lenderRegistryService.deactivateProgram(
        row.previousProgramId,
        input.actorUserId,
        input.actorName,
      ).catch(() => undefined);
    }

    const created = await lenderRegistryService.createProgram(
      {
        lenderId: row.lenderId,
        productCode: row.productCode,
        label: row.programName,
        code: `${row.productCode}_${Date.now().toString(36)}`.toUpperCase().slice(0, 40),
        roiPercent: roi ?? undefined,
        processingFeePct: feePct ?? undefined,
        processingFeeLabel:
          typeof payload.processingFee === "string" ? payload.processingFee : undefined,
        maxFundingAmount: maxLoan ?? undefined,
        maxLtvPercent: ltv ?? undefined,
        maxTenureMonths: maxTenure ?? undefined,
        minCibil: minCibil ?? undefined,
        minIncomeAmount: minIncome ?? undefined,
        remarks: typeof payload.remarks === "string" ? payload.remarks : undefined,
        notes:
          typeof payload.specialConditions === "string"
            ? payload.specialConditions
            : undefined,
        lifecycleStatus: "active",
        status: "active",
        enabled: true,
        createdBy: input.actorUserId,
      },
      input.actorName,
    );

    // Ensure published + approved stamps
    const programId = (created as { id?: string })?.id;
    if (programId) {
      await prisma.enterpriseLenderProgram.update({
        where: { id: programId },
        data: {
          approvalStatus: "approved",
          approvedBy: input.actorName,
          approvedAt: new Date(),
          lifecycleStatus: "active",
          status: "active",
          enabled: true,
        },
      }).catch(() => undefined);
    }

    const updated = await prisma.lenderProgramSubmission.update({
      where: { id: row.id },
      data: {
        status: "published",
        publishedAt: new Date(),
        publishedBy: input.actorName,
        publishedProgramId: programId ?? null,
        reviewedBy: input.actorName,
        reviewedAt: new Date(),
        adminComments: input.comments ?? row.adminComments,
      },
    });
    await audit(
      organizationId,
      "program_published",
      input.actorName,
      { programId, version: row.versionNumber },
      { submissionId: id },
    );
    await audit(
      organizationId,
      "notify_admin_program_published",
      "administrator",
      { programId, version: row.versionNumber },
      { submissionId: id },
    );
    await audit(
      organizationId,
      "notify_lender_published",
      row.verifierEmail || "lender",
      { programId },
      { submissionId: id },
    );
    await appendDialogue(
      "published",
      "Program published",
      `${input.actorName} published program version ${row.versionNumber}${programId ? ` (${programId})` : ""}. The program is now active across Catalyst One.`,
    );
    if (row.previousProgramId) {
      await appendDialogue(
        "version_updated",
        "Program version updated",
        `Previous program ${row.previousProgramId} was deactivated. New version ${row.versionNumber} is live.`,
      );
    }
    const lender = await lenderRegistryRepository.findLenderById(row.lenderId);
    return serializeSubmission(updated, lenderLabel(lender));
  },
};
