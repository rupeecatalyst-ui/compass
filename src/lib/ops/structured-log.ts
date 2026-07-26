/**
 * CO-OPS-002 — Structured enterprise logging (JSON lines).
 * Never logs passwords, JWTs, or sensitive personal information.
 */

import type { OpsStructuredLogFields } from "@/types/ops-observability";
import { redactUnknown } from "./redact";

export type OpsLogLevel = "info" | "warn" | "error";

export function logOps(
  level: OpsLogLevel,
  fields: OpsStructuredLogFields,
  extra?: Record<string, unknown>,
): void {
  const payload = redactUnknown({
    level,
    channel: "catalyst-one-ops",
    sprint: "CO-OPS-002",
    ...fields,
    ...(extra ? { extra } : {}),
  });

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}
