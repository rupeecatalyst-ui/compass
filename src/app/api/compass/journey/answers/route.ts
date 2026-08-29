import type { NextRequest } from "next/server";
import type { CompassJourneyAnswersPatch } from "@/types/compass-customer-gateway";
import {
  assertCompassGatewayAuthorized,
  compassGatewayError,
  compassGatewaySuccess,
  readBearerJourneyToken,
} from "@/lib/compass-customer-gateway/route-utils";
import { compassJourneyService } from "@server/services/compass-customer-gateway/compass-journey.service";

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
    const message = error instanceof Error ? error.message : "Unable to save answers.";
    return compassGatewayError(400, "ANSWERS_PATCH_FAILED", message);
  }
}
