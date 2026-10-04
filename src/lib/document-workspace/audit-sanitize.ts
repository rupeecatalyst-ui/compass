/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014C
 * Strip secrets, binaries, and unrestricted PII from audit metadata.
 */

import { DOCUMENT_WORKSPACE_AUDIT_SENSITIVE_KEYS } from "@/constants/document-workspace-audit";

const SENSITIVE = new Set(
  DOCUMENT_WORKSPACE_AUDIT_SENSITIVE_KEYS.map((key) => key.toLowerCase()),
);

function keyLooksSensitive(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE.has(lower)) return true;
  if (lower.includes("otp")) return true;
  if (lower.includes("token") && lower !== "tokenprefix") return true;
  if (lower.includes("password") || lower.includes("secret") || lower.includes("credential")) {
    return true;
  }
  if (lower.includes("base64") || lower.includes("signedurl")) return true;
  if (lower === "email" || lower === "mobile" || lower === "phone") return true;
  return false;
}

export function sanitizeDocumentWorkspaceAuditMetadata(
  input: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!input) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (keyLooksSensitive(key)) continue;
    if (typeof value === "string" && value.length > 4000) continue;
    if (value instanceof Uint8Array || (typeof Buffer !== "undefined" && Buffer.isBuffer(value))) {
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = sanitizeDocumentWorkspaceAuditMetadata(value as Record<string, unknown>);
      if (nested && Object.keys(nested).length) out[key] = nested;
      continue;
    }
    out[key] = value;
  }
  return Object.keys(out).length ? out : null;
}

export function safeCustomerActorReference(input: {
  sessionId?: string | null;
  requestId?: string | null;
  tokenPrefix?: string | null;
}): string {
  const session = input.sessionId?.trim();
  if (session) return `customer-session:${session}`;
  const request = input.requestId?.trim();
  if (request) return `customer-request:${request}`;
  const prefix = input.tokenPrefix?.trim();
  if (prefix) return `customer-token:${prefix}`;
  return "customer-session:unknown";
}
