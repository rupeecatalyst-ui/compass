import type { NextRequest } from "next/server";
import { searchCities } from "@/constants/city-master";
import { resolveCityMasterIdentity } from "@/lib/compass-customer-gateway/public-programme-match";
import {
  assertCompassGatewayAuthorized,
  compassGatewayError,
  compassGatewaySuccess,
} from "@/lib/compass-customer-gateway/route-utils";

/**
 * Public journey city search. Enterprise City Master only.
 * Results appear after the customer types. An id lookup resolves one governed city.
 */
export async function GET(request: NextRequest) {
  const auth = assertCompassGatewayAuthorized(request);
  if (auth instanceof Response) return auth;

  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (id) {
    const city = resolveCityMasterIdentity(id);
    if (!city || city.id !== id) {
      return compassGatewaySuccess({ cities: [] });
    }
    return compassGatewaySuccess({
      cities: [
        {
          id: city.id,
          city: city.city,
          state: city.state,
          label: `${city.city}, ${city.state}`,
        },
      ],
    });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return compassGatewaySuccess({ cities: [] });
  const cities = searchCities(query)
    .slice()
    .sort((a, b) => a.city.localeCompare(b.city) || a.state.localeCompare(b.state))
    .slice(0, 8)
    .map((city) => ({
      id: city.id,
      city: city.city,
      state: city.state,
      label: `${city.city}, ${city.state}`,
    }));
  return compassGatewaySuccess({ cities });
}
