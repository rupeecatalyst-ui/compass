/**
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002
 * Employee JWT — read-only enterprise context compile.
 * Mutations (POST/PUT/PATCH/DELETE) are rejected.
 */

import { NextResponse } from "next/server";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { createCorrelationId, OPS_CORRELATION_HEADER } from "@/lib/ops/correlation";
import { compileChanakyaEnterpriseReadContext } from "@/lib/chanakya-enterprise-read-context";
import {
  CHANAKYA_ENTERPRISE_READ_DOMAINS,
  CHANAKYA_ENTERPRISE_READ_MODES,
  type ChanakyaEnterpriseReadDomain,
  type ChanakyaEnterpriseReadMode,
} from "@/types/chanakya-enterprise-read-context";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { recordBusinessAudit } from "@/lib/ops/record";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function methodNotAllowed(correlationId: string): NextResponse {
  return errorResponse(
    405,
    "METHOD_NOT_ALLOWED",
    "CHANAKYA Enterprise Read Context is read-only. Only GET is permitted.",
    undefined,
    {
      correlationId,
      module: "ChanakyaEnterpriseReadContext",
      action: "METHOD_NOT_ALLOWED",
    },
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  const correlationId = createCorrelationId();
  try {
    const auth = requireAccessToken(request);
    const url = new URL(request.url);
    const modeRaw = (url.searchParams.get("mode") || "summary").trim();
    const mode = (CHANAKYA_ENTERPRISE_READ_MODES as readonly string[]).includes(modeRaw)
      ? (modeRaw as ChanakyaEnterpriseReadMode)
      : null;
    if (!mode) {
      return errorResponse(
        400,
        "INVALID_MODE",
        `mode must be one of: ${CHANAKYA_ENTERPRISE_READ_MODES.join(", ")}`,
        undefined,
        { correlationId },
      );
    }

    const domainsParam = url.searchParams.get("domains");
    const domains = domainsParam
      ? (domainsParam
          .split(",")
          .map((d) => d.trim())
          .filter((d) =>
            (CHANAKYA_ENTERPRISE_READ_DOMAINS as readonly string[]).includes(d),
          ) as ChanakyaEnterpriseReadDomain[])
      : undefined;

    const organizationId = await resolvePilotOrganizationId();
    if (!organizationId?.trim()) {
      return errorResponse(503, "ORG_CONTEXT_UNAVAILABLE", "Organization context unavailable.", undefined, {
        correlationId,
      });
    }

    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;

    const result = await compileChanakyaEnterpriseReadContext({
      mode,
      organizationId,
      opportunityRef: url.searchParams.get("opportunityId") || url.searchParams.get("opportunityRef"),
      dealRef: url.searchParams.get("dealId") || url.searchParams.get("dealRef"),
      domains,
      includeDocumentExcerpts: url.searchParams.get("includeDocumentExcerpts") === "1",
      limit: Number.isFinite(limit) ? limit : undefined,
      actorUserId: auth.userId,
      correlationId,
      requestHint: url.searchParams.get("q"),
    });

    recordBusinessAudit({
      actorUserId: auth.userId,
      module: "ChanakyaEnterpriseReadContext",
      action: "enterprise_read.compile",
      entityId:
        result.deal360?.dealId ??
        result.opportunity360?.opportunityId ??
        organizationId,
      previousValue: null,
      newValue: {
        mode: result.mode,
        domains: result.domains.map((d) => d.domain),
        // Never log email/mobile/document bodies
      },
      result: "Success",
      correlationId,
    });

    const res = successResponse(result, 200, correlationId);
    res.headers.set(OPS_CORRELATION_HEADER, correlationId);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      "body" in err
    ) {
      return fromAuthError(
        err as { status: number; body: import("@/types/api").ApiResponse },
        { correlationId },
      );
    }
    const status =
      err && typeof err === "object" && "statusCode" in err
        ? Number((err as { statusCode?: number }).statusCode) || 500
        : 500;
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "ENTERPRISE_READ_FAILED";
    return errorResponse(
      status,
      code,
      err instanceof Error ? err.message : "Enterprise read context failed.",
      undefined,
      { correlationId },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  void request;
  return methodNotAllowed(createCorrelationId());
}
export async function PUT(request: Request): Promise<NextResponse> {
  void request;
  return methodNotAllowed(createCorrelationId());
}
export async function PATCH(request: Request): Promise<NextResponse> {
  void request;
  return methodNotAllowed(createCorrelationId());
}
export async function DELETE(request: Request): Promise<NextResponse> {
  void request;
  return methodNotAllowed(createCorrelationId());
}
