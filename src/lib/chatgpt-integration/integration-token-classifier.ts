/**
 * CO-CHATGPT-OAUTH-001 — Bearer token lane classification (no server-only).
 */
import jwt from "jsonwebtoken";
import {
  CHATGPT_INTEGRATION_TOKEN_AUDIENCE,
  CHATGPT_INTEGRATION_TOKEN_TYPE,
} from "@/types/chatgpt-integration-oauth";

export function looksLikeJwt(token: string): boolean {
  return token.split(".").length === 3;
}

export function isChatGptIntegrationJwtPayload(payload: jwt.JwtPayload): boolean {
  const aud = payload.aud;
  const audList = Array.isArray(aud) ? aud : aud ? [aud] : [];
  return (
    payload.typ === CHATGPT_INTEGRATION_TOKEN_TYPE ||
    audList.includes(CHATGPT_INTEGRATION_TOKEN_AUDIENCE)
  );
}

export function isEmployeeSessionJwtPayload(payload: jwt.JwtPayload): boolean {
  if (isChatGptIntegrationJwtPayload(payload)) return false;
  const aud = payload.aud;
  const audList = Array.isArray(aud) ? aud : aud ? [aud] : [];
  if (audList.includes("wealth_partner_app") || payload.typ === "partner_access") {
    return false;
  }
  return Boolean(payload.userId && payload.email);
}

export function classifyIntegrationBearerToken(
  token: string,
): "integration" | "employee" | "invalid" {
  if (!looksLikeJwt(token)) return "invalid";
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== "object") return "invalid";
  if (isChatGptIntegrationJwtPayload(decoded)) return "integration";
  if (isEmployeeSessionJwtPayload(decoded)) return "employee";
  return "invalid";
}
