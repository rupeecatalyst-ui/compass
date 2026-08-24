/**
 * CO-CHATGPT-OAUTH-001 — PKCE S256 helpers for ChatGPT OAuth.
 *
 * ChatGPT Custom GPT Actions use a confidential client (client_secret) and
 * historically omit PKCE on authorize. When PKCE is present, only S256 is
 * accepted; plain is never allowed.
 */
import { verifyPkceS256 } from "@/lib/chatgpt-integration/integration-access-token";

export type ChatGptPkceMethod = "S256";

export type ResolvedAuthorizePkce =
  | { mode: "s256"; codeChallenge: string; codeChallengeMethod: ChatGptPkceMethod }
  | { mode: "none"; codeChallenge: ""; codeChallengeMethod: null };

function pkceError(message: string): Error {
  return Object.assign(new Error(message), {
    statusCode: 400,
    code: "INVALID_PKCE",
  });
}

/** Normalize OAuth code_challenge_method; only S256 is supported. */
export function normalizeCodeChallengeMethod(
  raw: string | null | undefined,
): ChatGptPkceMethod | "plain" | "" | "unsupported" {
  const method = (raw ?? "").trim();
  if (!method) return "";
  if (method.toUpperCase() === "S256") return "S256";
  if (method.toLowerCase() === "plain") return "plain";
  return "unsupported";
}

/**
 * Resolve authorize-time PKCE.
 * - Both challenge + method absent → confidential-client path (no PKCE).
 * - Either present → S256 required with non-empty code_challenge.
 */
export function resolveAuthorizePkce(
  codeChallengeRaw: string | null | undefined,
  codeChallengeMethodRaw: string | null | undefined,
): ResolvedAuthorizePkce {
  const codeChallenge = (codeChallengeRaw ?? "").trim();
  const method = normalizeCodeChallengeMethod(codeChallengeMethodRaw);
  const hasChallenge = codeChallenge.length > 0;
  const hasMethod = method !== "";

  if (!hasChallenge && !hasMethod) {
    return { mode: "none", codeChallenge: "", codeChallengeMethod: null };
  }

  if (method === "plain") {
    throw pkceError("PKCE method plain is not supported. Use S256.");
  }
  if (method === "unsupported") {
    throw pkceError("Unsupported PKCE code_challenge_method. Only S256 is accepted.");
  }
  if (method !== "S256") {
    throw pkceError("PKCE S256 code_challenge_method is required when using PKCE.");
  }
  if (!hasChallenge) {
    throw pkceError("PKCE S256 code_challenge is required.");
  }

  return {
    mode: "s256",
    codeChallenge,
    codeChallengeMethod: "S256",
  };
}

/**
 * Token-exchange PKCE check.
 * When authorize stored an S256 challenge, code_verifier is mandatory and must match.
 * When authorize used confidential-client (no PKCE), verifier is not required.
 */
export function assertTokenPkce(
  codeVerifierRaw: string | null | undefined,
  storedChallenge: string,
  storedMethod: ChatGptPkceMethod | null,
): void {
  const stored = (storedChallenge ?? "").trim();
  if (!stored || storedMethod !== "S256") {
    return;
  }

  const codeVerifier = (codeVerifierRaw ?? "").trim();
  if (!codeVerifier) {
    throw pkceError("PKCE code_verifier is required for this authorization.");
  }
  if (!verifyPkceS256(codeVerifier, stored)) {
    throw pkceError("Invalid PKCE code_verifier.");
  }
}
