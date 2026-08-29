import type { NextRequest } from "next/server";
import {
  assertCompassGatewayAuthorized,
  compassGatewaySuccess,
  requireActiveCompassProduct,
} from "@/lib/compass-customer-gateway/route-utils";
import { compassJourneyService } from "@server/services/compass-customer-gateway/compass-journey.service";

export async function GET(request: NextRequest) {
  const auth = assertCompassGatewayAuthorized(request);
  if (auth instanceof Response) return auth;

  const productCode = requireActiveCompassProduct(request.nextUrl.searchParams.get("productCode"));
  if (productCode instanceof Response) return productCode;

  return compassGatewaySuccess(compassJourneyService.getConfig(productCode));
}
