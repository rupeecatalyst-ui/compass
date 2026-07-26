/**
 * CO-GOV-001 — Governance CSV export (administrators).
 * Excel-compatible UTF-8 CSV with BOM.
 */

import { formatAuthError } from "@server/validators/auth.validators";
import {
  fromAuthError,
  requireAccessToken,
  errorResponse,
} from "@/lib/api/auth-route-utils";
import { buildGovernanceExportCsv } from "@/lib/enterprise-governance";
import type { GovernanceExportKind } from "@/types/enterprise-governance";
import { NextResponse } from "next/server";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can export Governance reports"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

const KINDS = new Set<GovernanceExportKind>([
  "audit_trail",
  "change_history",
  "user_activity",
  "administrative_changes",
  "field_audit",
  "full_pack",
]);

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const url = new URL(request.url);
    const kind = (url.searchParams.get("kind") ?? "full_pack") as GovernanceExportKind;
    if (!KINDS.has(kind)) {
      return errorResponse(400, "INVALID_EXPORT_KIND", `Unsupported kind: ${kind}`);
    }
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 500) || 500, 2000);
    const file = buildGovernanceExportCsv(kind, limit);
    return new NextResponse(file.body, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
