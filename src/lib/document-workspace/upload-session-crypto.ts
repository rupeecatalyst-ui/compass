import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  DOCUMENT_WORKSPACE_OTP_MAX_ATTEMPTS,
  DOCUMENT_WORKSPACE_UPLOAD_DEFAULT_DAYS,
} from "@/constants/document-workspace-refinement-014";

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createOpaqueUploadToken(): { token: string; hash: string; prefix: string } {
  const token = `uptok_${randomBytes(24).toString("hex")}`;
  return { token, hash: hashOpaqueToken(token), prefix: token.slice(0, 12) };
}

export function defaultUploadExpiry(from = new Date()): Date {
  return new Date(from.getTime() + DOCUMENT_WORKSPACE_UPLOAD_DEFAULT_DAYS * 24 * 60 * 60 * 1000);
}

export function createEmailOtp(): { otp: string; hash: string } {
  const otp = String(100000 + (randomBytes(3).readUIntBE(0, 3) % 900000));
  return { otp, hash: hashOpaqueToken(otp) };
}

export function otpMatches(plain: string, hash: string): boolean {
  const left = Buffer.from(hashOpaqueToken(plain), "hex");
  const right = Buffer.from(hash, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function otpAttemptsExceeded(attemptCount: number, max = DOCUMENT_WORKSPACE_OTP_MAX_ATTEMPTS): boolean {
  return attemptCount >= max;
}

export function isDocumentWorkspaceOtpDeliveryEnabled(): boolean {
  const raw = process.env.DOCUMENT_WORKSPACE_OTP_DELIVERY_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}
