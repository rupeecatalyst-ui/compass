import type { NextRequest } from "next/server";
import type { CompassJourneyAnswersPatch } from "@/types/compass-customer-gateway";
import {
  assertCompassGatewayAuthorized,
  compassGatewayError,
  compassGatewaySuccess,
  readBearerJourneyToken,
} from "@/lib/compass-customer-gateway/route-utils";
import { compassJourneyService } from "@server/services/compass-customer-gateway/compass-journey.service";
import { toCompassGatewayFailure } from "@server/services/compass-customer-gateway/compass-journey-errors";

export async function PATCH(request: NextRequest) {
  const auth = assertCompassGatewayAuthorized(request);
  if (auth instanceof Response) return auth;

  const token = readBearerJourneyToken(request);
  if (!token) {
    return compassGatewayError(401, "MISSING_SESSION", "Journey session token is required.");
  }

  try {
    const body = (await request.json()) as CompassJourneyAnswersPatch;
    const data = await compassJourneyService.patchAnswers(token, body);
    return compassGatewaySuccess(data);
  } catch (error) {
    const failure = toCompassGatewayFailure(error, "ANSWERS_PATCH_FAILED", "Unable to save answers.");
    return compassGatewayError(failure.httpStatus, failure.code, failure.message);
  }
}
