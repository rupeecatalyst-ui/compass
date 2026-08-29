import type { NextRequest } from "next/server";
import type { CompassProductCode } from "@/types/compass-customer-gateway";
import {
  assertCompassGatewayAuthorized,
  compassGatewayError,
  compassGatewaySuccess,
} from "@/lib/compass-customer-gateway/route-utils";
import { compassJourneyService } from "@server/services/compass-customer-gateway/compass-journey.service";

function parseProductCode(value: string | null): CompassProductCode | null {
  if (value === "home-loan" || value === "home-loan-balance-transfer") return value;
  return null;
}

export async function GET(request: NextRequest) {
  const auth = assertCompassGatewayAuthorized(request);
  if (auth instanceof Response) return auth;

  const productCode = parseProductCode(request.nextUrl.searchParams.get("productCode"));
  if (!productCode) {
    return compassGatewayError(400, "INVALID_PRODUCT", "productCode is required.");
  }

  return compassGatewaySuccess(compassJourneyService.getConfig(productCode));
}
