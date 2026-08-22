/**
 * CO-C1-COMMUNICATION-002 — Manually associate an inbound email with a transaction.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { inboundEmailIngestionService } from "@server/services/enterprise-inbound-email/inbound-email-ingestion.service";
import { prisma } from "@server/lib/prisma";

async function resolveOrganizationId(): Promise<string> {
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!org) throw Object.assign(new Error("No organization found"), { statusCode: 503 });
  return org.id;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ inboundEmailId: string }> },
) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }
    const actor = requireAccessToken(request);
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
      return errorResponse(403, "FORBIDDEN", "Admin role required for inbound email matching.");
    }

    const { inboundEmailId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const opportunityId = String(body.opportunityId || "").trim();
    const dealId = body.dealId ? String(body.dealId).trim() : null;

    if (!opportunityId) {
      return errorResponse(400, "VALIDATION_ERROR", "opportunityId is required");
    }

    const organizationId = await resolveOrganizationId();
    const result = await inboundEmailIngestionService.manuallyMatchEmail({
      organizationId,
      inboundEmailId,
      opportunityId,
      dealId,
      actorUserId: actor.userId,
      actorName: actor.email || "Admin",
    });

    return successResponse(result);
  } catch (err) {
    const mapped = err as { status?: number; body?: unknown; statusCode?: number };
    if (mapped.status && mapped.body) return fromAuthError(mapped as { status: number; body: never });
    const status = mapped.statusCode ?? 500;
    return errorResponse(
      status,
      "INBOUND_EMAIL_MATCH_FAILED",
      err instanceof Error ? err.message : "Failed to match inbound email",
    );
  }
}
