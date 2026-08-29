import type { NextRequest } from "next/server";
import type { CompassJourneyStartRequest } from "@/types/compass-customer-gateway";
import {
  assertCompassGatewayAuthorized,
  compassGatewayError,
  compassGatewaySuccess,
  requireActiveCompassProduct,
} from "@/lib/compass-customer-gateway/route-utils";
import { compassJourneyService } from "@server/services/compass-customer-gateway/compass-journey.service";
import { toCompassGatewayFailure } from "@server/services/compass-customer-gateway/compass-journey-errors";

export async function POST(request: NextRequest) {
  const auth = assertCompassGatewayAuthorized(request);
  if (auth instanceof Response) return auth;

  try {
    const body = (await request.json()) as CompassJourneyStartRequest;
    const productCode = requireActiveCompassProduct(body.productCode);
    if (productCode instanceof Response) return productCode;
    const data = await compassJourneyService.startJourney({ ...body, productCode });
    return compassGatewaySuccess(data, 201);
  } catch (error) {
    const failure = toCompassGatewayFailure(error, "JOURNEY_START_FAILED", "Unable to start journey.");
    return compassGatewayError(failure.httpStatus, failure.code, failure.message);
  }
}
