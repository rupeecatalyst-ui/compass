/**
 * Projection mapping — business-safe fields only (CO-AI-104).
 * Never map PAN, Aadhaar, secrets, or raw entity dumps.
 */

import type { EaiContextDomain } from "@/types/enterprise-ai-context-intelligence";
import type {
  EaiReadConnectorId,
  EaiReadProjection,
} from "@/types/enterprise-ai-read-connectors";

function newProjectionId(): string {
  return `eai_proj_${crypto.randomUUID()}`;
}

export function createEmptyProjection(
  connectorId: EaiReadConnectorId,
  domain: EaiContextDomain,
  summary: string,
): EaiReadProjection {
  return {
    projectionId: newProjectionId(),
    connectorId,
    domain,
    fields: {},
    refs: [],
    summary,
    resolved: false,
  };
}

export function createProjection(input: {
  connectorId: EaiReadConnectorId;
  domain: EaiContextDomain;
  fields: Record<string, string>;
  refs?: EaiReadProjection["refs"];
  summary: string;
  resolved?: boolean;
}): EaiReadProjection {
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.fields)) {
    if (!v) continue;
    // Hard strip identity secrets if a caller slips
    if (/pan|aadhaar|aadhar|password|secret|token/i.test(k)) continue;
    fields[k] = String(v).slice(0, 500);
  }
  return {
    projectionId: newProjectionId(),
    connectorId: input.connectorId,
    domain: input.domain,
    fields,
    refs: input.refs ?? [],
    summary: input.summary.slice(0, 800),
    resolved: input.resolved ?? Object.keys(fields).length > 0,
  };
}

/** Validate projection structure for readiness. */
export function validateEaiReadProjection(projection: EaiReadProjection): string[] {
  const errors: string[] = [];
  if (!projection.projectionId) errors.push("projectionId required");
  if (!projection.connectorId) errors.push("connectorId required");
  if (!projection.domain) errors.push("domain required");
  if (typeof projection.fields !== "object" || projection.fields === null) {
    errors.push("fields must be an object");
  }
  for (const key of Object.keys(projection.fields ?? {})) {
    if (/pan|aadhaar|aadhar|password|secret|token/i.test(key)) {
      errors.push(`Forbidden field in projection: ${key}`);
    }
  }
  return errors;
}
