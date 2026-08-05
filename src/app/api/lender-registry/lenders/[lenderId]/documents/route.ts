import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import type { CreateLenderDocumentInput, LenderDocumentKind } from "@/types/enterprise-lender-registry";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";

import {
  lenderRegistryPersistenceGuard,
  mapRouteError,
  requireLenderRegistryAdmin,
  resolveActorDisplayName,
} from "../../../_lib/route-utils";

type RouteContext = { params: Promise<{ lenderId: string }> };

const KINDS = new Set<LenderDocumentKind>([
  "agreement",
  "policy",
  "program_circular",
  "rate_sheet",
  "sanction_format",
  "kfs",
  "other",
]);

export async function GET(request: Request, context: RouteContext) {
  try {
    lenderRegistryPersistenceGuard();
    requireAccessToken(request);
    const { lenderId } = await context.params;
    const items = await lenderRegistryService.listDocuments(lenderId);
    return successResponse(items);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    if (mapped.status === 400 || mapped.status === 403) {
      return errorResponse(mapped.status, "LENDER_DOCUMENTS_FAILED", mapped.body.error?.message ?? "Failed");
    }
    return errorResponse(500, "LENDER_DOCUMENTS_FAILED", "Failed to load lender documents");
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    lenderRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireLenderRegistryAdmin(actor);
    const { lenderId } = await context.params;
    const body = await request.json();
    const raw = Array.isArray(body?.documents) ? body.documents : Array.isArray(body) ? body : null;
    if (!raw) {
      return errorResponse(400, "INVALID_BODY", "Expected { documents: [...] }");
    }

    const documents: CreateLenderDocumentInput[] = raw.map((d: Record<string, unknown>) => {
      const kind = String(d.kind ?? "other") as LenderDocumentKind;
      if (!KINDS.has(kind)) {
        throw Object.assign(new Error("Invalid document kind"), { status: 400 });
      }
      return {
        id: typeof d.id === "string" ? d.id : undefined,
        lenderId,
        kind,
        title: String(d.title ?? "").trim(),
        fileName: d.fileName != null ? String(d.fileName) : undefined,
        fileUrl: d.fileUrl != null ? String(d.fileUrl) : undefined,
        mimeType: d.mimeType != null ? String(d.mimeType) : undefined,
        notes: d.notes != null ? String(d.notes) : undefined,
        enabled: d.enabled === undefined ? true : Boolean(d.enabled),
        createdBy: actor.userId,
      };
    });

    for (const d of documents) {
      if (!d.title) {
        return errorResponse(400, "INVALID_DOCUMENT", "Document title is required");
      }
    }

    const actorName = await resolveActorDisplayName(actor.userId);
    const items = await lenderRegistryService.replaceDocuments(
      lenderId,
      documents,
      actor.userId,
      actorName,
    );
    return successResponse(items);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    if (mapped.status === 400 || mapped.status === 403) {
      return errorResponse(
        mapped.status,
        "LENDER_DOCUMENTS_REPLACE_FAILED",
        mapped.body.error?.message ?? "Failed",
      );
    }
    return errorResponse(500, "LENDER_DOCUMENTS_REPLACE_FAILED", "Failed to replace lender documents");
  }
}
