/**
 * Provider-neutral COMPASS OTP adapter.
 * Sending stays disabled until SMS provider + DLT credentials are configured.
 * Never stores plaintext OTP. Never exposes a production bypass code.
 */

import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export type CompassOtpConfig = {
  deliveryEnabled: boolean;
  provider?: string | null;
  dltPrincipalEntityId?: string | null;
  approvedHeader?: string | null;
  approvedTemplateId?: string | null;
  ttlSeconds: number;
  maxAttempts: number;
  resendCooldownSeconds: number;
};

export function readCompassOtpConfig(): CompassOtpConfig {
  const provider = process.env.COMPASS_SMS_OTP_PROVIDER?.trim() || null;
  const dlt = process.env.COMPASS_SMS_DLT_PE_ID?.trim() || null;
  const header = process.env.COMPASS_SMS_OTP_HEADER?.trim() || null;
  const template = process.env.COMPASS_SMS_OTP_TEMPLATE_ID?.trim() || null;
  const flagOn = process.env.COMPASS_OTP_ENABLED === "true";
  const deliveryEnabled = flagOn && Boolean(provider && dlt && header && template);
  return {
    deliveryEnabled,
    provider,
    dltPrincipalEntityId: dlt,
    approvedHeader: header,
    approvedTemplateId: template,
    ttlSeconds: 300,
    maxAttempts: 5,
    resendCooldownSeconds: 60,
  };
}

export function hashOtp(otp: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${otp}`).digest("hex");
}

export function generateNumericOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function verifyHashedOtp(input: { otp: string; salt: string; hash: string }): boolean {
  const actual = hashOtp(input.otp, input.salt);
  if (actual.length !== input.hash.length) return false;
  try {
    return timingSafeEqual(Buffer.from(actual), Buffer.from(input.hash));
  } catch {
    return false;
  }
}

export function compassOtpUiEnabled(): boolean {
  return readCompassOtpConfig().deliveryEnabled;
}
