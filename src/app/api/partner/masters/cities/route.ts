import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { searchCities } from "@/constants/city-master";

/** CC-SSOT-001 — Partner City Master search (Enterprise City Master SSOT). */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    requirePartnerAccessToken(request);
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const cities = searchCities(q)
      .slice()
      .sort((a, b) => a.city.localeCompare(b.city) || a.state.localeCompare(b.state))
      .slice(0, 8)
      .map((c) => ({
        id: c.id,
        city: c.city,
        state: c.state,
        label: `${c.city}, ${c.state}`,
      }));
    return partnerSuccess(request, { cities });
  } catch (err) {
    return partnerError(request, err);
  }
}
