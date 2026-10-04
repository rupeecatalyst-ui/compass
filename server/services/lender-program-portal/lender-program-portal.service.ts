/**
 * CO-LEND-001 — Lender Program Portal service.
 * Submissions stage in portal tables; live EnterpriseLenderProgram updates only on publish.
 */
import { randomUUID } from "node:crypto";
import {
  LENDER_PORTAL_LAUNCH_DOCUMENT_UPLOAD,
  LENDER_PORTAL_OTP_REQUEST_WINDOW_MS,
  LENDER_PROGRAM_PORTAL_DEFAULT_TTL_DAYS,
  resolveProgramTemplateForProductCode,
} from "@/constants/lender-program-portal";
import {
  assertPortalAdministrator,
  assertRecipientEmail,
  decideOtpAttempt,
  emailsMatch,
  mapPortalPayloadToProgrammeBody,
  PortalLaunchError,
  publicOtpDelivery,
  submissionCanPublish,
} from "@/lib/lender-program-portal/launch-closure";
import { ProgrammePermissionError, ProgrammeValidationError } from "@/types/product-programme-operations";
import { productProgrammeOperationsService } from "@server/services/product-programme-operations/programme.service";
import { sendLenderPortalEmail } from "./portal-mail";
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
import {
  assertProductsInMatrix,
  inviteAllowsProductCode,
  listInviteProductRows,
  normalizeInviteProductIds,
  resolveMatrixProductsForLender,
  type InviteProductSnapshot,
} from "./invite-products";

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
  products: InviteProductSnapshot[] = [],
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
    products: products.map((p) => ({
      productId: p.productId,
      productCode: p.productCode,
      productLabel: p.productLabel,
    })),
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

function portalAbsoluteUrl(path: string): string | null {
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").trim().replace(/\/$/, "");
  return base ? `${base}${path}` : null;
}

async function countRecentPortalAudits(inviteId: string, action: string) {
  const since = new Date(Date.now() - LENDER_PORTAL_OTP_REQUEST_WINDOW_MS);
  return prisma.lenderProgramPortalAudit.count({
    where: { inviteId, action, createdAt: { gte: since } },
  });
}

function rethrowProgramme(error: unknown): never {
  if (error instanceof ProgrammeValidationError) {
    const detail = error.fieldErrors.map((item) => item.message).filter(Boolean).join(" ") || error.message;
    throw new PortalLaunchError(400, "PROGRAMME_NOT_PUBLISHABLE", detail);
  }
  if (error instanceof ProgrammePermissionError) {
    throw new PortalLaunchError(403, error.code, error.message);
  }
  if (error instanceof PortalLaunchError) throw error;
  throw error;
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
  /** Products currently mapped to a lender in the Product–Lender Matrix (for invite create UI). */
  async listMatrixProductsForLender(lenderId: string) {
    const organizationId = await resolvePilotOrganizationId();
    return resolveMatrixProductsForLender({
      db: prisma,
      organizationId,
      lenderId,
    });
  },

  async createInvite(input: {
    lenderId: string;
    productIds: string[];
    recipientEmail: string;
    ttlDays?: number;
    maxUses?: number | null;
    notes?: string;
    actorUserId: string;
    actorName: string;
    actorRole: string;
  }) {
    assertPortalAdministrator(input.actorRole);
    const recipientEmail = assertRecipientEmail(input.recipientEmail);
    const organizationId = await resolvePilotOrganizationId();
    const lender = await lenderRegistryRepository.findLenderById(input.lenderId);
    if (!lender || lender.organizationId !== organizationId) {
      throw Object.assign(new Error("Lender not found."), { statusCode: 404 });
    }
    const productIds = normalizeInviteProductIds(input.productIds);
    const selected = await assertProductsInMatrix({
      db: prisma,
      organizationId,
      lenderId: lender.id,
      productIds,
    });

    const token = generateLenderProgramPortalToken();
    const row = await prisma.$transaction(async (tx) => {
      const invite = await tx.lenderProgramPortalInvite.create({
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
      let sortOrder = 0;
      for (const product of selected) {
        await tx.lenderProgramPortalInviteProduct.create({
          data: {
            organizationId,
            inviteId: invite.id,
            productId: product.productId,
            productCode: product.productCode,
            productLabel: product.productLabel,
            sortOrder,
          },
        });
        sortOrder += 1;
      }
      return invite;
    });

    await audit(
      organizationId,
      "invite_created",
      input.actorName,
      {
        lenderId: lender.id,
        recipientEmail,
        expiresAt: row.expiresAt.toISOString(),
        productIds: selected.map((p) => p.productId),
        productCodes: selected.map((p) => p.productCode),
      },
      { inviteId: row.id },
    );
    const portalPath = buildLenderProgramPortalPath(row.token);
    const absolute = portalAbsoluteUrl(portalPath);
    const lenderName = lenderLabel(lender) || "your institution";
    const productLabels = selected.map((product) => product.productLabel).join(", ");
    const delivery = absolute
      ? await sendLenderPortalEmail({
          to: recipientEmail,
          subject: "Rupee Catalyst — secure Product Programme link",
          textBody: [
            `Rupee Catalyst has invited ${lenderName} to submit Product Programme information.`,
            `Products: ${productLabels}.`,
            `Open this secure link: ${absolute}`,
            `This link expires on ${row.expiresAt.toISOString()}.`,
            "A separate one-time code will be emailed when you open the link. Do not share this link.",
          ].join("\n"),
        })
      : { ok: false as const, deliveryStatus: "failed" as const };
    await audit(
      organizationId,
      "link_sent",
      input.actorName,
      { recipientEmail, deliveryStatus: delivery.deliveryStatus },
      { inviteId: row.id },
    );
    return {
      ...serializeInvite(row, lenderLabel(lender), selected),
      linkDelivery: { status: delivery.deliveryStatus, recipientEmail },
    };
  },

  async listInvites() {
    const organizationId = await resolvePilotOrganizationId();
    const rows = await prisma.lenderProgramPortalInvite.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        products: {
          orderBy: [{ sortOrder: "asc" }, { productLabel: "asc" }],
          select: {
            productId: true,
            productCode: true,
            productLabel: true,
          },
        },
      },
    });
    const lenders = await prisma.enterpriseLender.findMany({
      where: { organizationId, id: { in: [...new Set(rows.map((r) => r.lenderId))] } },
      select: { id: true, displayName: true, legalName: true },
    });
    const nameById = new Map<string, string | undefined>(
      lenders.map((l) => [l.id, lenderLabel(l)]),
    );
    return rows.map((r) =>
      serializeInvite(r, nameById.get(r.lenderId), r.products),
    );
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
    const products = await listInviteProductRows(prisma, updated.id);
    return serializeInvite(updated, undefined, products);
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
    const inviteProducts = await listInviteProductRows(prisma, invite.id);
    if (inviteProducts.length === 0) {
      throw Object.assign(
        new Error(
          "This invitation has no product scope. Contact the administrator to issue a new multi-product invitation.",
        ),
        { statusCode: 403, code: "INVITE_PRODUCT_SCOPE_MISSING" },
      );
    }
    return {
      inviteId: invite.id,
      lenderId: invite.lenderId,
      lenderName: lender?.displayName || lender?.legalName || "Lender",
      expiresAt: invite.expiresAt.toISOString(),
      otpRequired: true,
      otpVerified: Boolean(invite.otpVerifiedAt),
      /** Explicit invitation products only — never live Matrix expansion. */
      products: inviteProducts.map((p) => ({
        productId: p.productId,
        code: p.productCode,
        label: p.productLabel,
      })),
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
    const bound = await prisma.lenderProgramPortalAudit.findFirst({
      where: { inviteId: invite.id, action: "invite_created" },
      orderBy: { createdAt: "desc" },
    });
    const recipientEmail =
      bound && typeof bound.detail === "object" && bound.detail && "recipientEmail" in bound.detail
        ? String((bound.detail as { recipientEmail?: unknown }).recipientEmail ?? "")
        : "";
    if (!recipientEmail || !emailsMatch(verifier.officialEmail, recipientEmail)) {
      throw new PortalLaunchError(
        403,
        "OTP_RECIPIENT_MISMATCH",
        "The one-time code can only be sent to the invited lender email.",
      );
    }
    const decision = decideOtpAttempt({
      recentRequests: await countRecentPortalAudits(invite.id, "otp_requested"),
      recentFailures: await countRecentPortalAudits(invite.id, "otp_failed"),
    });
    if (!decision.ok) {
      throw new PortalLaunchError(
        429,
        decision.code,
        decision.code === "OTP_LOCKED"
          ? "Too many incorrect codes. Request a new code later."
          : "Too many code requests. Wait before trying again.",
      );
    }
    const emailCode = generateOtpCode();
    const expires = otpExpiresAt();
    await prisma.lenderProgramPortalInvite.update({
      where: { id: invite.id },
      data: {
        emailOtpHash: hashOtp(emailCode),
        emailOtpExpiresAt: expires,
        emailOtpVerifiedAt: null,
        mobileOtpHash: null,
        mobileOtpExpiresAt: null,
        mobileOtpVerifiedAt: null,
        otpVerifiedAt: null,
        pendingVerifier: verifier as unknown as Prisma.InputJsonValue,
        otpHash: null,
        otpExpiresAt: null,
      },
    });
    const delivered = await sendLenderPortalEmail({
      to: recipientEmail,
      subject: "Rupee Catalyst — Product Programme verification code",
      textBody: [
        "Rupee Catalyst",
        `Your Product Programme verification code is ${emailCode}.`,
        `It expires at ${expires.toISOString()}.`,
        "This code was sent only by email. It is not shown on the portal page.",
      ].join("\n"),
    });
    if (!delivered.ok) {
      await prisma.lenderProgramPortalInvite.update({
        where: { id: invite.id },
        data: { emailOtpHash: null, emailOtpExpiresAt: null },
      });
      throw new PortalLaunchError(503, "OTP_DELIVERY_FAILED", "The verification code could not be emailed.");
    }
    await audit(
      organizationId,
      "otp_requested",
      verifier.employeeName,
      { channel: "email", delivered: true },
      { inviteId: invite.id, ipAddress },
    );
    return publicOtpDelivery();
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
    const locked = decideOtpAttempt({
      recentRequests: 0,
      recentFailures: await countRecentPortalAudits(invite.id, "otp_failed"),
    });
    if (!locked.ok) {
      throw new PortalLaunchError(429, "OTP_LOCKED", "Too many incorrect codes. Request a new code later.");
    }

    // Email OTP is the launch channel. A stored mobile hash is still checked when present.
    if (typeof input === "string") {
      if (!invite.otpHash || !invite.otpExpiresAt || invite.otpExpiresAt.getTime() < Date.now()) {
        throw Object.assign(new Error("OTP expired. Request a new code."), { statusCode: 400 });
      }
      if (hashOtp(input) !== invite.otpHash) {
        await audit(organizationId, "otp_failed", "lender", { channel: "legacy" }, { inviteId: invite.id, ipAddress });
        throw new PortalLaunchError(401, "OTP_INVALID", "Invalid verification code.");
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

    if (!invite.emailOtpHash || !invite.emailOtpExpiresAt || invite.emailOtpExpiresAt.getTime() < Date.now()) {
      throw new PortalLaunchError(400, "OTP_EXPIRED", "OTP expired. Request a new code.");
    }
    const emailOk = hashOtp(input.emailCode) === invite.emailOtpHash;
    const mobileRequired = Boolean(invite.mobileOtpHash);
    const mobileOk = !mobileRequired || (Boolean(input.mobileCode) && hashOtp(input.mobileCode) === invite.mobileOtpHash);
    if (!emailOk || !mobileOk) {
      await audit(organizationId, "otp_failed", "lender", { channel: "email" }, { inviteId: invite.id, ipAddress });
      throw new PortalLaunchError(401, "OTP_INVALID", "Invalid verification code.");
    }
    const now = new Date();
    await prisma.lenderProgramPortalInvite.update({
      where: { id: invite.id },
      data: {
        otpVerifiedAt: now,
        emailOtpVerifiedAt: now,
        mobileOtpVerifiedAt: mobileRequired ? now : null,
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
      { emailVerified: true, mobileVerified: mobileRequired },
      { inviteId: invite.id, ipAddress },
    );
    return { ok: true as const, emailVerified: true, mobileVerified: mobileRequired };
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

    const inviteProducts = await listInviteProductRows(prisma, invite.id);
    if (inviteProducts.length === 0) {
      throw Object.assign(
        new Error(
          "This invitation has no product scope. Contact the administrator to issue a new invitation.",
        ),
        { statusCode: 403, code: "INVITE_PRODUCT_SCOPE_MISSING" },
      );
    }
    const scopedProduct = inviteAllowsProductCode(inviteProducts, input.productCode);
    if (!scopedProduct) {
      throw Object.assign(
        new Error(
          "Selected product is not authorized for this invitation.",
        ),
        { statusCode: 403, code: "PRODUCT_NOT_IN_INVITE_SCOPE" },
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

    const template = resolveProgramTemplateForProductCode(scopedProduct.productCode);
    const productLabel = scopedProduct.productLabel || template.label;
    const existing = await prisma.enterpriseLenderProgram.findFirst({
      where: {
        organizationId,
        lenderId: invite.lenderId,
        productCode: scopedProduct.productCode,
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
      payload: { productCode: scopedProduct.productCode, productId: scopedProduct.productId },
    });

    const row = await prisma.lenderProgramSubmission.create({
      data: {
        id: createId(),
        organizationId,
        inviteId: invite.id,
        lenderId: invite.lenderId,
        productCode: scopedProduct.productCode,
        productId: scopedProduct.productId,
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
        documentLinks: LENDER_PORTAL_LAUNCH_DOCUMENT_UPLOAD ? (input.documentLinks ?? []) : [],
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
        productCode: scopedProduct.productCode,
        productId: scopedProduct.productId,
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
      policyVersionId?: string;
      actorUserId: string;
      actorName: string;
      actorRole: string;
    },
  ) {
    assertPortalAdministrator(input.actorRole);
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

    if (!submissionCanPublish(row.status)) {
      throw new PortalLaunchError(
        409,
        "PUBLISH_REQUIRES_APPROVAL",
        "Approve the submission before publishing. Approval does not publish it.",
      );
    }
    const policyVersionId = input.policyVersionId?.trim();
    if (!policyVersionId) {
      throw new PortalLaunchError(
        400,
        "POLICY_VERSION_REQUIRED",
        "Select a published policy version before publishing.",
      );
    }
    const payload = (row.proposedPayload ?? {}) as LenderProgramPayload;
    const programmeBody = mapPortalPayloadToProgrammeBody({
      lenderId: row.lenderId,
      productId: row.productId,
      productCode: row.productCode,
      programName: row.programName,
      payload,
      policyVersionId,
    });
    const intakeActorId = `portal-intake:${row.id}`;
    let draftId: string;
    let programId: string | null = null;
    try {
      if (row.previousProgramId) {
        const revision = await productProgrammeOperationsService.update({
          organizationId,
          actorUserId: intakeActorId,
          actorName: "Lender programme intake",
          actorRole: "ADMIN",
          programId: row.previousProgramId,
          body: { ...programmeBody, createDraftRevision: true },
        });
        draftId = revision.id;
      } else {
        const created = await productProgrammeOperationsService.create({
          organizationId,
          actorUserId: intakeActorId,
          actorName: "Lender programme intake",
          actorRole: "ADMIN",
          body: programmeBody,
        });
        draftId = created.id;
      }
      await productProgrammeOperationsService.submit({
        organizationId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        actorName: input.actorName,
        programId: draftId,
      });
      await productProgrammeOperationsService.approve({
        organizationId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        actorName: input.actorName,
        programId: draftId,
        approvalReason: "Approved lender portal submission published by an internal administrator.",
      });
      const published = await productProgrammeOperationsService.publish({
        organizationId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        actorName: input.actorName,
        programId: draftId,
      });
      programId = published.id;
    } catch (error) {
      rethrowProgramme(error);
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
        `Previous program ${row.previousProgramId} remains in programme history. Version ${row.versionNumber} is the live published programme.`,
      );
    }
    const lender = await lenderRegistryRepository.findLenderById(row.lenderId);
    return serializeSubmission(updated, lenderLabel(lender));
  },
};
