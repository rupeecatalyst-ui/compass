/**
 * CO-UX-021 — Enterprise Business Notes API.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { enterpriseBusinessNotesService } from "@server/services/enterprise-business-notes/enterprise-business-notes.service";
import type {
  CreateEnterpriseBusinessNoteInput,
  UpdateEnterpriseBusinessNoteInput,
} from "@/types/enterprise-business-notes";

function actorDisplayName(actor: { email?: string; userId: string }): string | null {
  return actor.email?.split("@")[0] ?? null;
}

export async function GET(request: Request) {
  try {
    requireAccessToken(request);
    const url = new URL(request.url);
    const items = await enterpriseBusinessNotesService.list({
      entityKind: url.searchParams.get("entityKind") ?? undefined,
      entityId: url.searchParams.get("entityId") ?? undefined,
      opportunityId: url.searchParams.get("opportunityId") ?? undefined,
      dealId: url.searchParams.get("dealId") ?? undefined,
      contactId: url.searchParams.get("contactId") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      includeDeleted: url.searchParams.get("includeDeleted") === "1",
      limit: Number(url.searchParams.get("limit") ?? "100") || 100,
    });
    return successResponse({
      items,
      durable: enterpriseBusinessNotesService.isDurable(),
    });
  } catch (err) {
    const e = err as { status?: number; statusCode?: number };
    if (e.status === 401 || e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      (err as { statusCode?: number }).statusCode || 500,
      (err as { code?: string }).code || "EBN_ERROR",
      err instanceof Error ? err.message : "Failed to list business notes",
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const body = (await request.json()) as CreateEnterpriseBusinessNoteInput;
    if (!body?.body?.trim() || !body.workspaceKind || !body.entityKind || !body.entityId) {
      return errorResponse(
        400,
        "VALIDATION",
        "body, workspaceKind, entityKind and entityId are required",
      );
    }
    const item = await enterpriseBusinessNotesService.create(body, {
      userId: actor.userId,
      displayName: actorDisplayName(actor),
    });
    if (!item) {
      return successResponse(
        {
          item: null,
          durable: false,
          message:
            "Business Notes durable persistence requires ENTERPRISE_PERSISTENCE_MODE=prisma",
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
      (err as { code?: string }).code || "EBN_ERROR",
      err instanceof Error ? err.message : "Failed to create business note",
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const body = (await request.json()) as UpdateEnterpriseBusinessNoteInput;
    if (!body?.id) {
      return errorResponse(400, "VALIDATION", "id is required");
    }
    const item = await enterpriseBusinessNotesService.update(body, {
      userId: actor.userId,
      displayName: actorDisplayName(actor),
    });
    if (!item) {
      return successResponse({ item: null, durable: false }, 202);
    }
    return successResponse({ item, durable: true });
  } catch (err) {
    const e = err as { status?: number; statusCode?: number };
    if (e.status === 401 || e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      (err as { statusCode?: number }).statusCode || 500,
      (err as { code?: string }).code || "EBN_ERROR",
      err instanceof Error ? err.message : "Failed to update business note",
    );
  }
}
