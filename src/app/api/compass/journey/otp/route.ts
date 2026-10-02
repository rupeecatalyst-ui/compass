import type { NextRequest } from "next/server";
import {
  assertCompassGatewayAuthorized,
  compassGatewayError,
  compassGatewaySuccess,
} from "@/lib/compass-customer-gateway/route-utils";
import { requestCompassCustomerOtp, verifyCompassCustomerOtp } from "@server/services/compass-customer-gateway/compass-otp.service";
import { toCompassGatewayFailure } from "@server/services/compass-customer-gateway/compass-journey-errors";
import { assertCompassCustomerRateLimit } from "@server/services/compass-customer-gateway/compass-customer-rate-limit";

export async function POST(request: NextRequest) {
  const auth = assertCompassGatewayAuthorized(request);
  if (auth instanceof Response) return auth;
  try {
    const body = (await request.json()) as { mobile?: string; otp?: string; action?: string };
    assertCompassCustomerRateLimit(body.mobile || "otp");
    if (body.action === "verify") {
      const result = verifyCompassCustomerOtp({ mobile: body.mobile || "", otp: body.otp || "" });
      return compassGatewaySuccess({
        verified: result.verified,
        error: result.verified ? null : "That code was not accepted.",
      });
    }
    requestCompassCustomerOtp(body.mobile || "");
    return compassGatewaySuccess({ sent: false });
  } catch (error) {
    const failure = toCompassGatewayFailure(
      error,
      "OTP_UNAVAILABLE",
      "We cannot verify your mobile number yet. Please try again later.",
    );
    return compassGatewayError(failure.httpStatus, failure.code, failure.message);
  }
}
