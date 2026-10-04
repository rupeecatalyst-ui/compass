import { NextResponse } from "next/server";
import { catalystOneGateway } from "@/lib/catalyst-one-gateway/server";
import { customerSafeError, rejectCrossOrigin } from "@/lib/public-request-guard";

/**
 * Forwards only the opaque campaign token. Decoded campaign metadata is ignored
 * so the Catalyst One start service can verify the token again before persistence.
 */
function governedJourneyStartBody(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const body = raw as Record<string, unknown>;
  const campaignToken = typeof body.campaignToken === "string" ? body.campaignToken.trim() : "";
  return {
    productCode: body.productCode,
    mobile: body.mobile,
    ...(typeof body.displayName === "string" ? { displayName: body.displayName } : {}),
    ...(typeof body.city === "string" ? { city: body.city } : {}),
    ...(typeof body.otpVerificationToken === "string"
      ? { otpVerificationToken: body.otpVerificationToken }
      : {}),
    ...(campaignToken ? { campaignToken } : {}),
  };
}

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  try {
    const data = await catalystOneGateway.startJourney(governedJourneyStartBody(await request.json()));
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = customerSafeError(error, "Unable to start journey.");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
