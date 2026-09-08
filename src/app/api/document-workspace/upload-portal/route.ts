import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";
import {
  describeUploadPortal,
  issueUploadOtp,
  receiveCustomerPortalUpload,
  verifyUploadOtp,
} from "@server/services/document-workspace/document-workspace-refinement-014.service";
import { documentWorkspaceHttpError } from "@/lib/document-workspace/access-decision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function wrap(err: unknown) {
  const mapped = documentWorkspaceHttpError(err);
  return errorResponse(mapped.status, mapped.code, mapped.message);
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
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const token = String(form.get("token") || "");
      const requestItemId = String(form.get("requestItemId") || "");
      const file = form.get("file");
      if (!(file instanceof Blob)) {
        return errorResponse(400, "VALIDATION", "file is required");
      }
      const filename =
        (file instanceof File && file.name) || String(form.get("filename") || "document");
      const bytes = new Uint8Array(await file.arrayBuffer());
      return successResponse(
        await receiveCustomerPortalUpload({
          token,
          requestItemId,
          filename,
          declaredMime: file.type || null,
          bytes,
        }),
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "");
    const token = String(body.token || "");
    if (action === "issue_otp") return successResponse(await issueUploadOtp({ token }));
    if (action === "verify_otp") {
      return successResponse(await verifyUploadOtp({ token, otp: String(body.otp || "") }));
    }
    if (action === "customer_uploaded") {
      return errorResponse(400, "VALIDATION", "Upload the file through the secure upload form.");
    }
    return errorResponse(400, "VALIDATION", "Unknown upload portal action.");
  } catch (err) {
    return wrap(err);
  }
}
