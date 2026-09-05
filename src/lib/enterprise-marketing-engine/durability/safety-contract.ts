/**
 * CO-MARKETING-REDESIGN-001 — Safety contract for the durable schema sprint.
 */

import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "@/constants/enterprise-marketing-engine/safety";

export function assertMarketingLiveSendDisabled(): void {
  if (ENTERPRISE_MARKETING_EXECUTION_ENABLED) {
    throw Object.assign(new Error("Live Marketing sending must remain disabled"), {
      statusCode: 500,
      code: "LIVE_SEND_MUST_REMAIN_FALSE",
    });
  }
}
