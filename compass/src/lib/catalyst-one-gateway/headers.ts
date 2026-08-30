/**
 * Server-only headers for Catalyst One S2S. Never import from client components.
 */
export function resolveCatalystOneProtectionBypass(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return env.CATALYST_ONE_VERCEL_PROTECTION_BYPASS?.trim() || null;
}

export function buildCatalystOneGatewayHeaders(input: {
  gatewayKey: string;
  protectionBypass?: string | null;
  journeyToken?: string | null;
  extra?: HeadersInit;
}): Headers {
  const headers = new Headers(input.extra);
  headers.set("x-compass-gateway-key", input.gatewayKey);
  const bypass = input.protectionBypass?.trim() || "";
  if (bypass) {
    headers.set("x-vercel-protection-bypass", bypass);
  }
  if (input.journeyToken) {
    headers.set("authorization", `Bearer ${input.journeyToken}`);
  }
  return headers;
}
