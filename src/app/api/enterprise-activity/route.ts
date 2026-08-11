/**
 * CO-ORG-003 — Enterprise Activity Registry API.
 * GET list / POST emit — universal chronology SSOT.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { enterpriseActivityService } from "@server/services/enterprise-activity/enterprise-activity.service";
import type { EmitEnterpriseActivityInput } from "@/types/enterprise-activity-registry";

export async function GET(request: Request) {
  try {
    requireAccessToken(request);
    const url = new URL(request.url);
    const items = await enterpriseActivityService.list({
      limit: Number(url.searchParams.get("limit") ?? "50") || 50,
      eventKind: url.searchParams.get("eventKind") ?? undefined,
      opportunityId: url.searchParams.get("opportunityId") ?? undefined,
      dealId: url.searchParams.get("dealId") ?? undefined,
      contactId: url.searchParams.get("contactId") ?? undefined,
      sourceSystem: url.searchParams.get("sourceSystem") ?? undefined,
      since: url.searchParams.get("since") ?? undefined,
    });
    return successResponse({
      items,
      durable: enterpriseActivityService.isDurable(),
    });
  } catch (err) {
    const e = err as { status?: number; statusCode?: number };
    if (e.status === 401 || e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      (err as { statusCode?: number }).statusCode || 500,
      (err as { code?: string }).code || "EAR_ERROR",
      err instanceof Error ? err.message : "Failed to list enterprise activity",
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const body = (await request.json()) as EmitEnterpriseActivityInput;
    if (!body?.eventKind || !body?.sourceSystem || !body?.sourceEventId || !body?.title) {
      return errorResponse(
        400,
        "VALIDATION",
        "eventKind, sourceSystem, sourceEventId and title are required",
      );
    }
    const item = await enterpriseActivityService.emit({
      ...body,
      actorUserId: body.actorUserId ?? actor.userId,
    });
    if (!item) {
      return successResponse(
        {
          item: null,
          durable: false,
          message: "EAR durable persistence requires ENTERPRISE_PERSISTENCE_MODE=prisma",
        },
        202,
      );
    }
    return successResponse({ item, durable: true }, 201);
  } catch (err) {
    const e = err as { status?: number; statusCode?: number };
    if (e.status === 401 || e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      (err as { statusCode?: number }).statusCode || 500,
      (err as { code?: string }).code || "EAR_ERROR",
      err instanceof Error ? err.message : "Failed to emit enterprise activity",
    );
  }
}
