/**
 * CO-CHATGPT-OAUTH — Trusted public origin for OAuth browser redirects.
 *
 * Hostinger standalone Next.js may expose request.url as https://0.0.0.0:3000
 * (listen bind address). Absolute redirects must never use that origin.
 *
 * Trusted source: server-runtime APP_URL (NOT NEXT_PUBLIC_* — those are
 * inlined at Next.js build time and miss Hostinger runtime env).
 * Does not trust Host or X-Forwarded-* headers.
 */
const LOCAL_DEV_ORIGIN = "http://localhost:3000";

/** Hostnames that must never appear in OAuth browser redirect Locations. */
export const CHATGPT_OAUTH_UNTRUSTED_BIND_HOSTS = new Set([
  "0.0.0.0",
  "::",
  "[::]",
]);

export function isChatGptOAuthUntrustedBindOrigin(originOrUrl: string): boolean {
  try {
    const host = new URL(originOrUrl).hostname.toLowerCase();
    return CHATGPT_OAUTH_UNTRUSTED_BIND_HOSTS.has(host);
  } catch {
    return true;
  }
}

/**
 * Resolve the public Catalyst One origin for OAuth consent redirects.
 * Reads server-only APP_URL at runtime (Hostinger process env / local .env).
 */
export function resolveChatGptOAuthPublicOrigin(): string {
  const configured = (process.env.APP_URL ?? "").trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      /* invalid URL — fall through to local default */
    }
  }
  return LOCAL_DEV_ORIGIN;
}

export function buildChatGptOAuthConsentRedirectUrl(consentPath: string): string {
  return new URL(consentPath, resolveChatGptOAuthPublicOrigin()).toString();
}
