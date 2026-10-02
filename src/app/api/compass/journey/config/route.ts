import type { NextRequest } from "next/server";
import {
  assertCompassGatewayAuthorized,
  compassGatewayError,
  compassGatewaySuccess,
} from "@/lib/compass-customer-gateway/route-utils";
import { CompassJourneyError } from "@server/services/compass-customer-gateway/compass-journey-errors";
import { compassJourneyService } from "@server/services/compass-customer-gateway/compass-journey.service";

export async function GET(request: NextRequest) {
  const auth = assertCompassGatewayAuthorized(request);
  if (auth instanceof Response) return auth;

  const productCode = request.nextUrl.searchParams.get("productCode")?.trim() ?? "";
  if (!productCode) {
    return compassGatewayError(400, "INVALID_PRODUCT", "Unsupported product.");
  }
  const versionRaw = request.nextUrl.searchParams.get("journeyVersion");
  const pinnedVersion = versionRaw ? Number(versionRaw) : null;
  if (versionRaw && (!Number.isInteger(pinnedVersion) || (pinnedVersion ?? 0) < 1)) {
    return compassGatewayError(400, "INVALID_JOURNEY_VERSION", "That journey version is not valid.");
  }

  const campaignToken = request.nextUrl.searchParams.get("campaign");
  const requirePublished = request.nextUrl.searchParams.get("requirePublished") === "1";

  try {
    return compassGatewaySuccess(
      await compassJourneyService.getConfig(productCode, pinnedVersion, {
        campaignToken,
        requirePublished,
      }),
    );
  } catch (error) {
    if (error instanceof CompassJourneyError) {
      return compassGatewayError(error.httpStatus, error.code, error.message);
    }
    return compassGatewayError(404, "JOURNEY_UNAVAILABLE", "This product journey is not published.");
  }
}
