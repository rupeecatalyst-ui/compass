import type { NextRequest } from "next/server";
import {
  assertCompassGatewayAuthorized,
  compassGatewayError,
  compassGatewaySuccess,
  readBearerJourneyToken,
} from "@/lib/compass-customer-gateway/route-utils";
import { compassJourneyService } from "@server/services/compass-customer-gateway/compass-journey.service";
import { CompassUploadRejectedError } from "@server/services/compass-customer-gateway/compass-upload-validation";
import { toCompassGatewayFailure } from "@server/services/compass-customer-gateway/compass-journey-errors";

export async function POST(request: NextRequest) {
  const auth = assertCompassGatewayAuthorized(request);
  if (auth instanceof Response) return auth;

  const token = readBearerJourneyToken(request);
  if (!token) {
    return compassGatewayError(401, "MISSING_SESSION", "Journey session token is required.");
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return compassGatewayError(400, "INVALID_CONTENT_TYPE", "Multipart form data is required.");
  }

  try {
    const form = await request.formData();
    const files: Array<{ file: File; typeRef?: string | null; relativePath?: string | null }> = [];
    for (const [key, value] of form.entries()) {
      if (!(value instanceof File) || value.size <= 0) continue;
      const typeRef = form.get(`${key}:typeRef`);
      const relativePath = form.get(`${key}:relativePath`);
      files.push({
        file: value,
        typeRef: typeof typeRef === "string" ? typeRef : null,
        relativePath: typeof relativePath === "string" ? relativePath : value.name,
      });
    }
    if (files.length === 0) {
      return compassGatewayError(400, "NO_FILES", "At least one file is required.");
    }
    const data = await compassJourneyService.uploadDocuments(token, files);
    return compassGatewaySuccess(data, 201);
  } catch (error) {
    if (error instanceof CompassUploadRejectedError) {
      return compassGatewayError(error.httpStatus, error.code, error.message);
    }
    const failure = toCompassGatewayFailure(error, "UPLOAD_FAILED", "Upload failed.");
    return compassGatewayError(failure.httpStatus, failure.code, failure.message);
  }
}
