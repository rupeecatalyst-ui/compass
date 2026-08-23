/**
 * CO-C1-COMMUNICATION-002 — Read-only inbound email detail for Activity & Dialogue.
 * Authenticated enterprise users only. Never returns IMAP credentials.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { prisma } from "@server/lib/prisma";

async function resolveOrganizationId(): Promise<string> {
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!org) throw Object.assign(new Error("No organization found"), { statusCode: 503 });
  return org.id;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ inboundEmailId: string }> },
) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }
    requireAccessToken(request);
    const { inboundEmailId } = await context.params;
    const id = inboundEmailId?.trim();
    if (!id) {
      return errorResponse(400, "VALIDATION", "inboundEmailId is required");
    }

    const organizationId = await resolveOrganizationId();
    const row = await prisma.enterpriseInboundEmailMessage.findFirst({
      where: { id, organizationId },
      include: {
        attachments: {
          select: {
            id: true,
            filename: true,
            mimeType: true,
            sizeBytes: true,
            documentId: true,
          },
        },
      },
    });
    if (!row) {
      return errorResponse(404, "NOT_FOUND", "Inbound email not found");
    }

    return successResponse({
      item: {
        id: row.id,
        messageId: row.messageId,
        fromEmail: row.fromEmail,
        fromName: row.fromName,
        toEmails: Array.isArray(row.toEmailsJson) ? row.toEmailsJson : [],
        ccEmails: Array.isArray(row.ccEmailsJson) ? row.ccEmailsJson : [],
        replyToEmail: row.replyToEmail,
        subject: row.subject,
        textBody: row.textBody,
        receivedAt: row.receivedAt.toISOString(),
        senderRole: row.senderRole,
        matchStatus: row.matchStatus,
        matchReason: row.matchReason,
        opportunityId: row.opportunityId,
        dealId: row.dealId,
        contactId: row.contactId,
        attachmentCount: row.attachmentCount,
        attachments: row.attachments,
      },
    });
  } catch (err) {
    const mapped = err as { status?: number; body?: unknown; statusCode?: number };
    if (mapped.status && mapped.body) return fromAuthError(mapped as { status: number; body: never });
    return errorResponse(
      mapped.statusCode ?? 500,
      "INBOUND_EMAIL_DETAIL_FAILED",
      err instanceof Error ? err.message : "Failed to load inbound email",
    );
  }
}
