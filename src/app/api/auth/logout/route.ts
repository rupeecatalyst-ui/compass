import { authService } from "@server/services/auth.service";
import { formatAuthError } from "@server/validators/auth.validators";
import { fromAuthError, jsonResponse } from "@/lib/api/auth-route-utils";

/** ADR-014 — Native auth gateway: logout */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { refreshToken?: string };
    await authService.logout(body.refreshToken);
    return jsonResponse({ success: true, message: "Logged out successfully" });
  } catch (err) {
    const formatted = formatAuthError(err);
    return fromAuthError(formatted);
  }
}
