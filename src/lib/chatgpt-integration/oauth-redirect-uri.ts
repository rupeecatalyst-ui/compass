/**
 * CO-CHANAKYA-GPT-OAUTH-CALLBACK-CLOSURE-045 — ChatGPT Custom GPT redirect URI allowlist.
 *
 * OpenAI GPT Actions send GPT-specific callback URIs on authorize (not shown in GPT Builder UI):
 *   https://chat.openai.com/aip/g-{gptId}/oauth/callback
 *   https://chatgpt.com/aip/g-{gptId}/oauth/callback
 *
 * Env-configured exact URIs remain supported. Built-in patterns are strict — no open redirect.
 */
import {
  CHATGPT_OAUTH_BUILTIN_REDIRECT_HOSTS,
  CHATGPT_OAUTH_BUILTIN_REDIRECT_PATH_PATTERNS,
} from "@/constants/chatgpt-integration-oauth";

export type ChatGptOAuthRedirectUriDecision =
  | { allowed: true; reason: "configured_exact" | "openai_builtin_pattern" }
  | { allowed: false; reason: string };

function parseStrictHttpsRedirectUri(redirectUri: string): URL | null {
  const raw = redirectUri.trim();
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  if (parsed.search || parsed.hash) return null;
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    return null;
  }
  return parsed;
}

function matchesOpenAiBuiltinRedirectPath(pathname: string): boolean {
  return CHATGPT_OAUTH_BUILTIN_REDIRECT_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Returns whether a redirect_uri is permitted for ChatGPT OAuth.
 * - Exact match against env-configured URIs, or
 * - HTTPS-only OpenAI/ChatGPT host + path pattern (GPT-specific AIP callbacks, stable connector redirects).
 */
export function evaluateChatGptOAuthRedirectUri(
  redirectUri: string,
  configuredUris: readonly string[],
): ChatGptOAuthRedirectUriDecision {
  if (configuredUris.includes(redirectUri)) {
    return { allowed: true, reason: "configured_exact" };
  }

  const parsed = parseStrictHttpsRedirectUri(redirectUri);
  if (!parsed) {
    return { allowed: false, reason: "redirect_uri must be a strict HTTPS URL without query or fragment" };
  }

  const host = parsed.hostname.toLowerCase();
  if (!CHATGPT_OAUTH_BUILTIN_REDIRECT_HOSTS.has(host)) {
    return { allowed: false, reason: "redirect_uri host is not an allowed OpenAI/ChatGPT domain" };
  }

  if (!matchesOpenAiBuiltinRedirectPath(parsed.pathname)) {
    return { allowed: false, reason: "redirect_uri path is not an allowed ChatGPT OAuth callback pattern" };
  }

  return { allowed: true, reason: "openai_builtin_pattern" };
}

export function isChatGptOAuthRedirectUriAllowed(
  redirectUri: string,
  configuredUris: readonly string[],
): boolean {
  return evaluateChatGptOAuthRedirectUri(redirectUri, configuredUris).allowed;
}
