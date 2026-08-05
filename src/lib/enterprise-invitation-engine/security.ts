/**
 * CO-INV-001 — Token helpers for Enterprise Invitation Engine.
 */
import { createHash, randomBytes } from "node:crypto";
import {
  ENTERPRISE_INVITATION_DEFAULT_TTL_DAYS,
  ENTERPRISE_INVITATION_TOKEN_PREFIX,
  buildEnterpriseInvitationPath,
} from "@/constants/enterprise-invitation-engine";

export function generateEnterpriseInvitationToken(): string {
  return `${ENTERPRISE_INVITATION_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

/** Store hash for optional future opaque lookup; token column remains unique lookup key (LPP pattern). */
export function hashEnterpriseInvitationToken(token: string): string {
  return createHash("sha256").update(`co-inv-001:${token.trim()}`).digest("hex");
}

export function invitationExpiresAt(
  days = ENTERPRISE_INVITATION_DEFAULT_TTL_DAYS,
  from = new Date(),
): Date {
  return new Date(from.getTime() + Math.max(1, days) * 24 * 60 * 60_000);
}

export function buildAbsoluteActivationUrl(token: string, origin?: string): string {
  const path = buildEnterpriseInvitationPath(token);
  const base =
    (origin || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}${path}`;
}

export { buildEnterpriseInvitationPath };
