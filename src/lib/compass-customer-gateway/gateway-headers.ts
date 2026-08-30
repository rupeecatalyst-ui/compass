/**
 * COMPASS Customer Gateway header contracts.
 * Gateway secret and journey session must never share Authorization Bearer.
 */
export function resolveCompassGatewayApiKey(request: Request): string | null {
  return request.headers.get("x-compass-gateway-key")?.trim() || null;
}

export function readBearerJourneyToken(request: Request): string | null {
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  return request.headers.get("x-compass-journey-token")?.trim() || null;
}
