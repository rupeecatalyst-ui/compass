/**
 * CO-MARKETING-REDESIGN-004 — Disabled pacing cron.
 * Not registered in vercel.json. Refuses to run until the activation boundary is flipped.
 */
import { errorResponse } from "@/lib/api/auth-route-utils";
import {
  isMarketingPacingCronActivated,
  MARKETING_PACING_CRON_ACTIVATION,
} from "@/lib/enterprise-marketing-engine/execution/cron-activation";

export async function POST() {
  if (!isMarketingPacingCronActivated()) {
    return errorResponse(
      403,
      MARKETING_PACING_CRON_ACTIVATION.code,
      MARKETING_PACING_CRON_ACTIVATION.message,
    );
  }
  return errorResponse(
    403,
    "CRON_NOT_ACTIVATED",
    "Marketing pacing cron reached the activation gate but remains unregistered for production.",
  );
}

export async function GET() {
  return POST();
}
