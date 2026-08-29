import type { NextRequest } from "next/server";
import type { CompassJourneyStartRequest } from "@/types/compass-customer-gateway";
import {
  assertCompassGatewayAuthorized,
  compassGatewayError,
  compassGatewaySuccess,
} from "@/lib/compass-customer-gateway/route-utils";
import { compassJourneyService } from "@server/services/compass-customer-gateway/compass-journey.service";

export async function POST(request: NextRequest) {
  const auth = assertCompassGatewayAuthorized(request);
  if (auth instanceof Response) return auth;

  try {
    const body = (await request.json()) as CompassJourneyStartRequest;
    if (body.productCode !== "home-loan" && body.productCode !== "home-loan-balance-transfer") {
      return compassGatewayError(400, "INVALID_PRODUCT", "Unsupported product.");
    }
    const data = await compassJourneyService.startJourney(body);
    return compassGatewaySuccess(data, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start journey.";
    return compassGatewayError(400, "JOURNEY_START_FAILED", message);
  }
}
