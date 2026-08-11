/**
 * CO-NOTIFICATION-001 — Sound preference (persists via cookie + client localStorage).
 * Extends existing preference idea without a separate prefs architecture rebuild.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";

const COOKIE = "ene_sound_enabled";

function readCookie(request: Request): boolean {
  const raw = request.headers.get("cookie") || "";
  const match = raw.match(new RegExp(`${COOKIE}=(0|1)`));
  if (!match) return true;
  return match[1] === "1";
}

export async function GET(request: Request) {
  try {
    requireAccessToken(request);
    return successResponse({
      soundEnabled: readCookie(request),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const e = err as { status?: number; statusCode?: number };
    if (e.status === 401 || e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(500, "ENE_PREF", "Failed to read preference");
  }
}

export async function PUT(request: Request) {
  try {
    requireAccessToken(request);
    const body = (await request.json()) as { soundEnabled?: boolean };
    const soundEnabled = body.soundEnabled !== false;
    const res = successResponse({
      soundEnabled,
      updatedAt: new Date().toISOString(),
    });
    res.headers.set(
      "Set-Cookie",
      `${COOKIE}=${soundEnabled ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax`,
    );
    return res;
  } catch (err) {
    const e = err as { status?: number; statusCode?: number };
    if (e.status === 401 || e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(500, "ENE_PREF", "Failed to save preference");
  }
}
