/**
 * CO-CHATGPT-INTEGRATION-V1 — Dedicated API key authentication.
 * Never logs Authorization headers or key material.
 *
 * CO-AI-ACCESS-001 — Integration key is channel auth only (X-ChatGPT-Integration-Key).
 * Employee session JWT uses Authorization: Bearer only during OAuth consent — not on integration reads.
 */

import { timingSafeEqual } from "node:crypto";
import { CHATGPT_INTEGRATION_API_KEY_ENV } from "@/lib/chatgpt-integration/constants";

export type ChatGptAuthResult =
  | { ok: true }
  | { ok: false; code: "MISSING_KEY" | "NOT_CONFIGURED" | "INVALID_KEY"; message: string };

function readConfiguredKeys(): string[] {
  const raw = process.env[CHATGPT_INTEGRATION_API_KEY_ENV]?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/** Supports comma-separated keys for rotation (current + previous). */
export function isChatGptIntegrationConfigured(): boolean {
  return readConfiguredKeys().length > 0;
}

/** Integration channel key — must not consume employee JWT from Authorization. */
export function extractChatGptIntegrationApiKey(request: Request): string | null {
  const headerKey = request.headers.get("x-chatgpt-integration-key")?.trim();
  return headerKey || null;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function authenticateChatGptIntegration(request: Request): ChatGptAuthResult {
  const configured = readConfiguredKeys();
  if (configured.length === 0) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message: `${CHATGPT_INTEGRATION_API_KEY_ENV} is not configured on this deployment.`,
    };
  }

  const provided = extractChatGptIntegrationApiKey(request);
  if (!provided) {
    return {
      ok: false,
      code: "MISSING_KEY",
      message: "ChatGPT integration API key required (X-ChatGPT-Integration-Key header).",
    };
  }

  const valid = configured.some((key) => safeEqual(provided, key));
  if (!valid) {
    return { ok: false, code: "INVALID_KEY", message: "Invalid ChatGPT integration API key." };
  }

  return { ok: true };
}
