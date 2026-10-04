/**
 * Server-side COMPASS OTP challenges.
 * No proof is issued until an authorised SMS provider can deliver the code.
 * Arbitrary numeric values are never accepted.
 */

import { randomBytes } from "node:crypto";
import { readCompassOtpConfig, verifyHashedOtp } from "@/lib/compass-otp/adapter";
import { CompassJourneyError } from "./compass-journey-errors";

type Proof = { mobile: string; exp: number };

const proofs = new Map<string, Proof>();

function digits(mobile: string): string {
  return mobile.replace(/\D/g, "").slice(-10);
}

export function issueOtpVerificationProof(mobile: string): string {
  const token = randomBytes(24).toString("hex");
  proofs.set(token, { mobile: digits(mobile), exp: Date.now() + 10 * 60 * 1000 });
  return token;
}

export function hasOtpVerificationProof(mobile: string, token: string | undefined): boolean {
  if (!token) return false;
  const row = proofs.get(token);
  if (!row || row.exp < Date.now()) return false;
  return row.mobile === digits(mobile) && row.mobile.length === 10;
}

export function requestCompassCustomerOtp(_mobile: string): never {
  const otp = readCompassOtpConfig();
  void otp;
  throw new CompassJourneyError(
    "OTP_UNAVAILABLE",
    "We cannot verify your mobile number yet. Please try again later.",
    503,
  );
}

export function verifyCompassCustomerOtp(input: { mobile: string; otp: string }): {
  verified: false;
} {
  if (!/^\d{6}$/.test(input.otp)) {
    return { verified: false };
  }
  const otp = readCompassOtpConfig();
  if (!otp.deliveryEnabled) return { verified: false };
  const matched = verifyHashedOtp({ otp: input.otp, salt: "none", hash: "none" });
  if (!matched) return { verified: false };
  return { verified: false };
}
