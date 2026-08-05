/**
 * CO-WP-102 — Partner JWT (audience-segregated from employee tokens).
 */
import jwt from "jsonwebtoken";
import { serverEnv } from "@server/config/env";
import type { PartnerTokenPayload } from "@/types/enterprise-partner-gateway";
import {
  PARTNER_TOKEN_AUDIENCE,
  PARTNER_TOKEN_TYPE,
} from "@/types/enterprise-partner-gateway";

export function signPartnerAccessToken(
  payload: Omit<PartnerTokenPayload, "aud" | "typ">,
): string {
  const body = {
    ...payload,
    typ: PARTNER_TOKEN_TYPE,
  };
  return jwt.sign(body, serverEnv.JWT_SECRET, {
    expiresIn: serverEnv.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    audience: PARTNER_TOKEN_AUDIENCE,
  });
}

export function signPartnerRefreshToken(
  payload: Omit<PartnerTokenPayload, "aud" | "typ">,
): string {
  const body = {
    ...payload,
    typ: PARTNER_TOKEN_TYPE,
  };
  return jwt.sign(body, serverEnv.JWT_REFRESH_SECRET, {
    expiresIn: serverEnv.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    audience: PARTNER_TOKEN_AUDIENCE,
  });
}

export function verifyPartnerAccessToken(token: string): PartnerTokenPayload {
  const payload = jwt.verify(token, serverEnv.JWT_SECRET, {
    audience: PARTNER_TOKEN_AUDIENCE,
  }) as PartnerTokenPayload;
  if (payload.typ !== PARTNER_TOKEN_TYPE) {
    throw new Error("Invalid partner token type");
  }
  if (!payload.partnerId || !payload.organizationId || !payload.userId) {
    throw new Error("Invalid partner token claims");
  }
  return { ...payload, aud: PARTNER_TOKEN_AUDIENCE };
}

export function verifyPartnerRefreshToken(token: string): PartnerTokenPayload {
  const payload = jwt.verify(token, serverEnv.JWT_REFRESH_SECRET, {
    audience: PARTNER_TOKEN_AUDIENCE,
  }) as PartnerTokenPayload;
  if (payload.typ !== PARTNER_TOKEN_TYPE) {
    throw new Error("Invalid partner refresh token type");
  }
  if (!payload.partnerId || !payload.organizationId || !payload.userId) {
    throw new Error("Invalid partner refresh token claims");
  }
  return { ...payload, aud: PARTNER_TOKEN_AUDIENCE };
}
