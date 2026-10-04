/**
 * CO-MARKETING-LIVE-EMAIL-FOUNDATION-001 — Opaque unsubscribe tokens.
 * AES-256-GCM. Payload is org + recipient fingerprint — never raw email in the URL.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import {
  MARKETING_PUBLIC_UNSUBSCRIBE_PATH,
  MARKETING_UNSUBSCRIBE_SECRET_ENV,
  MARKETING_UNSUBSCRIBE_TOKEN_TTL_MS,
  MARKETING_UNSUBSCRIBE_TOKEN_VERSION,
} from "@/constants/enterprise-marketing-engine/unsubscribe";

export type MarketingUnsubscribeTokenPayload = {
  v: typeof MARKETING_UNSUBSCRIBE_TOKEN_VERSION;
  o: string;
  f: string;
  c: string | null;
  iat: number;
  exp: number;
};

const ALG = "aes-256-gcm";
const TEST_OVERRIDE: { secret: string | null } = { secret: null };

function readSecret(): string | null {
  if (TEST_OVERRIDE.secret != null) {
    const trimmed = TEST_OVERRIDE.secret.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof process === "undefined") return null;
  const raw = (process.env[MARKETING_UNSUBSCRIBE_SECRET_ENV] ?? "").trim();
  return raw.length ? raw : null;
}

function keyFromSecret(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

function toBase64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(token: string): Buffer | null {
  const normalized = token.trim().replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  try {
    return Buffer.from(`${normalized}${pad}`, "base64");
  } catch {
    return null;
  }
}

export function configureMarketingUnsubscribeSecretForTests(secret: string | null): void {
  TEST_OVERRIDE.secret = secret;
}

export function marketingUnsubscribeSecretConfigured(): boolean {
  return Boolean(readSecret());
}

export function mintMarketingUnsubscribeToken(input: {
  organizationId: string;
  recipientFingerprint: string;
  campaignId?: string | null;
  nowMs?: number;
  ttlMs?: number;
}): string {
  const secret = readSecret();
  if (!secret) {
    throw Object.assign(new Error("Marketing unsubscribe secret is not configured"), {
      statusCode: 503,
      code: "UNSUBSCRIBE_SECRET_NOT_CONFIGURED",
    });
  }
  const organizationId = input.organizationId.trim();
  const fingerprint = input.recipientFingerprint.trim().toLowerCase();
  if (!organizationId || !fingerprint) {
    throw Object.assign(new Error("Unsubscribe token requires organisation and recipient identity"), {
      statusCode: 400,
      code: "UNSUBSCRIBE_TOKEN_INPUT_INVALID",
    });
  }
  const nowMs = input.nowMs ?? Date.now();
  const payload: MarketingUnsubscribeTokenPayload = {
    v: MARKETING_UNSUBSCRIBE_TOKEN_VERSION,
    o: organizationId,
    f: fingerprint,
    c: input.campaignId?.trim() || null,
    iat: nowMs,
    exp: nowMs + (input.ttlMs ?? MARKETING_UNSUBSCRIBE_TOKEN_TTL_MS),
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, keyFromSecret(secret), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return toBase64Url(Buffer.concat([iv, tag, encrypted]));
}

export function parseMarketingUnsubscribeToken(
  token: string,
  opts?: { nowMs?: number },
): MarketingUnsubscribeTokenPayload | null {
  const secret = readSecret();
  if (!secret) return null;
  const raw = (token ?? "").trim();
  if (!raw || raw.length > 2048) return null;
  const packed = fromBase64Url(raw);
  if (!packed || packed.length < 29) return null;
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const encrypted = packed.subarray(28);
  try {
    const decipher = createDecipheriv(ALG, keyFromSecret(secret), iv);
    decipher.setAuthTag(tag);
    const decoded = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const payload = JSON.parse(decoded) as MarketingUnsubscribeTokenPayload;
    if (payload.v !== MARKETING_UNSUBSCRIBE_TOKEN_VERSION) return null;
    if (typeof payload.o !== "string" || !payload.o.trim()) return null;
    if (typeof payload.f !== "string" || !payload.f.trim()) return null;
    if (typeof payload.exp !== "number" || payload.exp <= (opts?.nowMs ?? Date.now())) return null;
    return {
      v: MARKETING_UNSUBSCRIBE_TOKEN_VERSION,
      o: payload.o.trim(),
      f: payload.f.trim().toLowerCase(),
      c: typeof payload.c === "string" && payload.c.trim() ? payload.c.trim() : null,
      iat: typeof payload.iat === "number" ? payload.iat : 0,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function buildMarketingUnsubscribePath(token: string): string {
  return `${MARKETING_PUBLIC_UNSUBSCRIBE_PATH}/${encodeURIComponent(token)}`;
}

export function resolveMarketingPublicOrigin(): string | null {
  if (typeof process === "undefined") return null;
  const raw = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.APP_URL ||
    ""
  )
    .trim()
    .replace(/\/+$/g, "");
  return raw || null;
}

export function mintMarketingUnsubscribeUrl(input: {
  organizationId: string;
  recipientFingerprint: string;
  campaignId?: string | null;
  origin?: string | null;
}): string {
  const token = mintMarketingUnsubscribeToken(input);
  const path = buildMarketingUnsubscribePath(token);
  const origin = (input.origin ?? resolveMarketingPublicOrigin())?.replace(/\/+$/g, "") || "";
  return origin ? `${origin}${path}` : path;
}

export function tryMintMarketingUnsubscribeUrl(input: {
  organizationId: string;
  recipientFingerprint: string;
  campaignId?: string | null;
}): string | null {
  try {
    return mintMarketingUnsubscribeUrl(input);
  } catch {
    return null;
  }
}

export function bindMarketingUnsubscribeUrl(content: string, url: string): string {
  return content.split("{{unsubscribeUrl}}").join(url);
}
