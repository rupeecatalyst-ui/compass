/**
 * CO-BIZ-003 — Business Intelligence snapshot / dashboard / export (administrators).
 */

import { formatAuthError } from "@server/validators/auth.validators";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import {
  buildEbiReportCsv,
  composeBusinessIntelligenceSnapshot,
  getEbiDashboard,
} from "@/lib/enterprise-business-intelligence";
import type {
  EbiDashboardProviderId,
  EbiReportKind,
} from "@/types/enterprise-business-intelligence";
import { NextResponse } from "next/server";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can access BI APIs"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

const REPORT_KINDS = new Set<EbiReportKind>([
  "daily_business_summary",
  "pipeline_summary",
  "employee_performance",
  "stage_distribution",
  "task_performance",
  "business_health_summary",
]);

const DASHBOARDS = new Set<EbiDashboardProviderId>([
  "mission_control",
  "manager",
  "relationship_manager",
  "branch",
]);

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "snapshot";

    if (view === "export") {
      const kind = (url.searchParams.get("kind") ??
        "daily_business_summary") as EbiReportKind;
      if (!REPORT_KINDS.has(kind)) {
        return errorResponse(400, "INVALID_REPORT_KIND", `Unsupported kind: ${kind}`);
      }
      const file = buildEbiReportCsv(kind);
      return new NextResponse(file.body, {
        status: 200,
        headers: {
          "Content-Type": file.contentType,
          "Content-Disposition": `attachment; filename="${file.filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (view === "dashboard") {
      const id = (url.searchParams.get("id") ??
        "mission_control") as EbiDashboardProviderId;
      if (!DASHBOARDS.has(id)) {
        return errorResponse(400, "INVALID_DASHBOARD", `Unsupported dashboard: ${id}`);
      }
      const focus = url.searchParams.get("focus") ?? undefined;
      return successResponse(getEbiDashboard(id, focus));
    }

    return successResponse(composeBusinessIntelligenceSnapshot());
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
