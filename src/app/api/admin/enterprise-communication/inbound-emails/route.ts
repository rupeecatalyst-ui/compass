/**
 * CO-C1-COMMUNICATION-002 — Admin review queue for unmatched inbound emails.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { enterpriseInboundEmailRepository } from "@server/repositories/enterprise-inbound-email/enterprise-inbound-email.repository";
import { prisma } from "@server/lib/prisma";

async function resolveOrganizationId(): Promise<string> {
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!org) throw Object.assign(new Error("No organization found"), { statusCode: 503 });
  return org.id;
}

export async function GET(request: Request) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }
    const actor = requireAccessToken(request);
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
      return errorResponse(403, "FORBIDDEN", "Admin role required for inbound email review.");
    }

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 100);
    const statusParam = url.searchParams.get("status");
    const statuses = statusParam
      ? statusParam.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const organizationId = await resolveOrganizationId();
    const rows = await enterpriseInboundEmailRepository.listReviewQueue({
      organizationId,
      statuses,
      limit,
    });

    return successResponse({
      items: rows.map((row) => ({
        id: row.id,
        messageId: row.messageId,
        fromEmail: row.fromEmail,
        fromName: row.fromName,
        subject: row.subject,
        receivedAt: row.receivedAt.toISOString(),
        matchStatus: row.matchStatus,
        matchReason: row.matchReason,
        attachmentCount: row.attachmentCount,
        opportunityId: row.opportunityId,
        dealId: row.dealId,
        senderRole: row.senderRole,
        attachments: row.attachments.map((a) => ({
          id: a.id,
          filename: a.filename,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          documentId: a.documentId,
        })),
      })),
    });
  } catch (err) {
    const mapped = err as { status?: number; body?: unknown; statusCode?: number };
    if (mapped.status && mapped.body) return fromAuthError(mapped as { status: number; body: never });
    const status = mapped.statusCode ?? 500;
    return errorResponse(
      status,
      "INBOUND_EMAIL_LIST_FAILED",
      err instanceof Error ? err.message : "Failed to list inbound emails",
    );
  }
}
