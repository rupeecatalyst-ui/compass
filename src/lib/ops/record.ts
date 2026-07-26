/**
 * CO-OPS-002 — Record business audits, errors, and API timings.
 */

import type {
  OpsBusinessAuditEvent,
  OpsErrorSample,
  OpsModule,
  OpsPerfSample,
  OpsResult,
} from "@/types/ops-observability";
import { createCorrelationId } from "./correlation";
import { toAuditScalar } from "./redact";
import { pushAudit, pushError, pushPerf, touchUser } from "./rings";
import { logOps } from "./structured-log";
import { mirrorOpsAuditToGovernance } from "@/lib/enterprise-governance/mirror-ops";

export type RecordBusinessAuditInput = {
  actorUserId?: string | null;
  module: OpsModule | string;
  action: string;
  entityId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  result?: OpsResult;
  correlationId?: string;
};

export function recordBusinessAudit(input: RecordBusinessAuditInput): OpsBusinessAuditEvent {
  const correlationId = input.correlationId ?? createCorrelationId();
  const event: OpsBusinessAuditEvent = {
    id: createCorrelationId(),
    at: new Date().toISOString(),
    actorUserId: input.actorUserId ?? null,
    module: input.module,
    action: input.action,
    entityId: input.entityId ?? null,
    previousValue: toAuditScalar(input.previousValue),
    newValue: toAuditScalar(input.newValue),
    result: input.result ?? "Success",
    correlationId,
  };
  pushAudit(event);
  touchUser(input.actorUserId);
  mirrorOpsAuditToGovernance(event);
  logOps(event.result === "Failure" ? "warn" : "info", {
    timestamp: event.at,
    correlationId,
    userId: event.actorUserId,
    module: event.module,
    entityId: event.entityId,
    action: event.action,
    result: event.result,
    message: "business_audit",
  }, {
    previousValue: event.previousValue,
    newValue: event.newValue,
  });
  return event;
}

export type RecordOpsErrorInput = {
  module: OpsModule | string;
  action: string;
  code: string;
  message: string;
  correlationId?: string;
  httpStatus?: number;
  endpoint?: string;
  userId?: string | null;
};

export function recordOpsError(input: RecordOpsErrorInput): OpsErrorSample {
  const correlationId = input.correlationId ?? createCorrelationId();
  const event: OpsErrorSample = {
    id: createCorrelationId(),
    at: new Date().toISOString(),
    correlationId,
    module: input.module,
    action: input.action,
    code: input.code,
    message: input.message.slice(0, 500),
    httpStatus: input.httpStatus,
    endpoint: input.endpoint,
    userId: input.userId ?? null,
  };
  pushError(event);
  touchUser(input.userId);
  logOps("error", {
    timestamp: event.at,
    correlationId,
    userId: event.userId,
    module: event.module,
    action: event.action,
    result: "Failure",
    code: event.code,
    message: event.message,
    httpStatus: event.httpStatus,
    endpoint: event.endpoint,
  });
  return event;
}

export type RecordApiTimingInput = {
  endpoint: string;
  method: string;
  durationMs: number;
  httpStatus: number;
  correlationId?: string;
  module?: OpsModule | string;
};

export function recordApiTiming(input: RecordApiTimingInput): OpsPerfSample {
  const correlationId = input.correlationId ?? createCorrelationId();
  const event: OpsPerfSample = {
    id: createCorrelationId(),
    at: new Date().toISOString(),
    correlationId,
    endpoint: input.endpoint,
    method: input.method.toUpperCase(),
    durationMs: Math.max(0, Math.round(input.durationMs)),
    httpStatus: input.httpStatus,
    module: input.module,
  };
  pushPerf(event);
  if (event.durationMs >= 2000) {
    logOps("warn", {
      timestamp: event.at,
      correlationId,
      module: input.module ?? "API",
      action: "slow_operation",
      result: event.httpStatus >= 400 ? "Failure" : "Success",
      durationMs: event.durationMs,
      httpStatus: event.httpStatus,
      endpoint: event.endpoint,
      message: "slow_api",
    });
  }
  return event;
}
