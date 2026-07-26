import { authService } from "@server/services/auth.service";
import { formatAuthError, loginSchema } from "@server/validators/auth.validators";
import {
  fromAuthError,
  successResponse,
  withOpsRoute,
} from "@/lib/api/auth-route-utils";
import { recordBusinessAudit } from "@/lib/ops";

/** ADR-014 — Native auth gateway: login · CO-OPS-002 structured auth logging */
export async function POST(request: Request) {
  return withOpsRoute(
    request,
    { module: "Authentication", action: "login", endpoint: "/api/auth/login" },
    async ({ correlationId }) => {
      try {
        const body = loginSchema.parse(await request.json());
        // Never log password — schema parse only.
        const result = await authService.login(body.email, body.password);
        const userId =
          result.user && typeof result.user === "object" && "id" in result.user
            ? String((result.user as { id: unknown }).id)
            : null;
        recordBusinessAudit({
          actorUserId: userId,
          module: "Authentication",
          action: "Login",
          entityId: userId,
          previousValue: null,
          newValue: "authenticated",
          result: "Success",
          correlationId,
        });
        return successResponse(result, 200, correlationId);
      } catch (err) {
        const formatted = formatAuthError(err);
        recordBusinessAudit({
          actorUserId: null,
          module: "Authentication",
          action: "Login",
          entityId: null,
          previousValue: null,
          newValue: "rejected",
          result: "Failure",
          correlationId,
        });
        return fromAuthError(formatted, {
          correlationId,
          endpoint: "/api/auth/login",
        });
      }
    },
  );
}
