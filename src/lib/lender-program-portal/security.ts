/**
 * CO-LEND-001 — Secure token + OTP helpers (server-safe).
 */
import { createHash, randomBytes, randomInt } from "node:crypto";
import {
  LENDER_PROGRAM_PORTAL_TOKEN_PREFIX,
  LENDER_PROGRAM_OTP_TTL_MINUTES,
} from "@/constants/lender-program-portal";

export function generateLenderProgramPortalToken(): string {
  return `${LENDER_PROGRAM_PORTAL_TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function buildLenderProgramPortalPath(token: string): string {
  return `/lender/program-update/${encodeURIComponent(token)}`;
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(`co-lend-001:${code.trim()}`).digest("hex");
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

export function otpExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + LENDER_PROGRAM_OTP_TTL_MINUTES * 60_000);
}

export function inviteExpiresAt(days: number, from = new Date()): Date {
  return new Date(from.getTime() + Math.max(1, days) * 24 * 60 * 60_000);
}
