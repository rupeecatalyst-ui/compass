import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";
import {
  describeUploadPortal,
  issueUploadOtp,
  markCustomerUploadReceived,
  verifyUploadOtp,
} from "@server/services/document-workspace/document-workspace-refinement-014.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function wrap(err: unknown) {
  const e = err as { statusCode?: number; code?: string; message?: string };
  return errorResponse(
    e.statusCode || 500,
    e.code || "DOCUMENT_UPLOAD_PORTAL_FAILED",
    e.message || "Upload portal request failed",
  );
}

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token")?.trim() || "";
    return successResponse(await describeUploadPortal({ token }));
  } catch (err) {
    return wrap(err);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "");
    const token = String(body.token || "");
    if (action === "issue_otp") return successResponse(await issueUploadOtp({ token }));
    if (action === "verify_otp") {
      return successResponse(await verifyUploadOtp({ token, otp: String(body.otp || "") }));
    }
    if (action === "customer_uploaded") {
      return successResponse(
        await markCustomerUploadReceived({
          token,
          requestItemId: String(body.requestItemId || ""),
          registryRecordId: String(body.registryRecordId || ""),
        }),
      );
    }
    return errorResponse(400, "VALIDATION", "Unknown upload portal action.");
  } catch (err) {
    return wrap(err);
  }
}
