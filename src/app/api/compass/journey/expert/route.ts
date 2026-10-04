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
    const data = await compassJourneyService.talkToExpert(token);
    return compassGatewaySuccess(data);
  } catch (error) {
    const failure = toCompassGatewayFailure(
      error,
      "EXPERT_REQUEST_FAILED",
      "Unable to register Talk to an Expert right now.",
    );
    return compassGatewayError(failure.httpStatus, failure.code, failure.message);
  }
}
