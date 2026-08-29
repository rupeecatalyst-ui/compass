import type { NextRequest } from "next/server";
import {
  assertCompassGatewayAuthorized,
  compassGatewayError,
  compassGatewaySuccess,
  readBearerJourneyToken,
} from "@/lib/compass-customer-gateway/route-utils";
import { compassJourneyService } from "@server/services/compass-customer-gateway/compass-journey.service";
import { toCompassGatewayFailure } from "@server/services/compass-customer-gateway/compass-journey-errors";

export async function POST(request: NextRequest) {
  const auth = assertCompassGatewayAuthorized(request);
  if (auth instanceof Response) return auth;

  const token = readBearerJourneyToken(request);
  if (!token) {
    return compassGatewayError(401, "MISSING_SESSION", "Journey session token is required.");
  }

  try {
    const data = await compassJourneyService.analyze(token);
    return compassGatewaySuccess(data);
  } catch (error) {
    const failure = toCompassGatewayFailure(
      error,
      "ANALYSIS_UNAVAILABLE",
      "Analysis is temporarily unavailable.",
    );
    return compassGatewayError(
      failure.code === "ANALYSIS_UNAVAILABLE" ? 503 : failure.httpStatus,
      failure.code,
      failure.message,
    );
  }
}
