import type { NextRequest } from "next/server";
import {
  assertCompassGatewayAuthorized,
  compassGatewayError,
  compassGatewaySuccess,
  readBearerJourneyToken,
} from "@/lib/compass-customer-gateway/route-utils";
import { compassJourneyService } from "@server/services/compass-customer-gateway/compass-journey.service";
import { toCompassGatewayFailure } from "@server/services/compass-customer-gateway/compass-journey-errors";

export async function GET(request: NextRequest) {
  const auth = assertCompassGatewayAuthorized(request);
  if (auth instanceof Response) return auth;

  const token = readBearerJourneyToken(request);
  if (!token) {
    return compassGatewayError(401, "MISSING_SESSION", "Journey session token is required.");
  }

  try {
    const data = await compassJourneyService.getLod(token);
    return compassGatewaySuccess(data);
  } catch (error) {
    const failure = toCompassGatewayFailure(error, "LOD_UNAVAILABLE", "LOD is temporarily unavailable.");
    return compassGatewayError(
      failure.code === "LOD_UNAVAILABLE" ? 503 : failure.httpStatus,
      failure.code,
      failure.message,
    );
  }
}
