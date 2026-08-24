/**
 * CO-CHATGPT-INTEGRATION-V1 — Request audit (no secrets, no auth headers).
 */
import "server-only";

import { recordBusinessAudit } from "@/lib/ops/record";
import { toAuditScalar } from "@/lib/ops/redact";
import { CHATGPT_INTEGRATION_MODULE } from "@/lib/chatgpt-integration/constants";

export type ChatGptIntegrationAuditInput = {
  endpoint: string;
  requestId: string;
  httpStatus: number;
  success: boolean;
  durationMs?: number;
  actorUserId?: string | null;
  denialCode?: string;
};

export function auditChatGptIntegrationRequest(input: ChatGptIntegrationAuditInput): void {
  recordBusinessAudit({
    actorUserId: input.actorUserId ?? null,
    module: CHATGPT_INTEGRATION_MODULE,
    action: input.success
      ? `integration.read.${input.endpoint.split("/").pop() ?? "unknown"}`
      : `integration.denied.${input.denialCode ?? "unknown"}`,
    entityId: input.requestId,
    previousValue: null,
    newValue: toAuditScalar({
      endpoint: input.endpoint,
      httpStatus: input.httpStatus,
      success: input.success,
      durationMs: input.durationMs ?? null,
      denialCode: input.denialCode ?? null,
    }),
    result: input.success ? "Success" : "Failure",
    correlationId: input.requestId,
  });
}
