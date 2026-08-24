import jwt from "jsonwebtoken";
import { serverEnv } from "../config/env";
import { isChatGptIntegrationTokenPayload } from "@/lib/chatgpt-integration/integration-access-token";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, serverEnv.JWT_SECRET, {
    expiresIn: serverEnv.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, serverEnv.JWT_REFRESH_SECRET, {
    expiresIn: serverEnv.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  const payload = jwt.verify(token, serverEnv.JWT_SECRET) as TokenPayload & {
    aud?: string | string[];
    typ?: string;
  };
  /** CO-WP-102A — Partner tokens must not authenticate employee APIs. */
  const aud = payload.aud;
  const audList = Array.isArray(aud) ? aud : aud ? [aud] : [];
  if (audList.includes("wealth_partner_app") || payload.typ === "partner_access") {
    throw new Error("Partner token cannot access employee APIs");
  }
  /** CO-CHATGPT-OAUTH-001 — Integration tokens are read-only on /api/integrations/chatgpt/v1/* only. */
  if (isChatGptIntegrationTokenPayload(payload)) {
    throw new Error("ChatGPT integration token cannot access employee APIs");
  }
  return payload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, serverEnv.JWT_REFRESH_SECRET) as TokenPayload;
}

export function getRefreshExpiryDate(): Date {
  const days = parseInt(serverEnv.JWT_REFRESH_EXPIRES_IN) || 7;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export function getResetExpiryDate(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 1);
  return date;
}
