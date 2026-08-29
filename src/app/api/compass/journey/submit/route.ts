import type { NextRequest } from "next/server";
import type { CompassSubmitRequest } from "@/types/compass-customer-gateway";
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
    const body = (await request.json()) as CompassSubmitRequest;
    const data = await compassJourneyService.submit(token, body);
    return compassGatewaySuccess(data);
  } catch (error) {
    const failure = toCompassGatewayFailure(error, "SUBMIT_FAILED", "Submission failed.");
    return compassGatewayError(failure.httpStatus, failure.code, failure.message);
  }
}
