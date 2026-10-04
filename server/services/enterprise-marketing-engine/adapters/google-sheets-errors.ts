/**
 * Server-only Google Sheets error classification.
 * Never exposes credentials. Maps API failures to workbook connection states.
 */

export function classifyGoogleSheetsAccessError(err: unknown): {
  code: "ACCESS_REVOKED" | "VALIDATION_FAILED";
  message: string;
} {
  const message = err instanceof Error ? err.message : "Google Sheets read failed";
  const status =
    typeof err === "object" && err && "code" in err ? String((err as { code?: unknown }).code) : "";
  const lowered = message.toLowerCase();
  if (
    status === "401" ||
    status === "403" ||
    /permission|not have access|access denied|insufficient|unauth|revoked/.test(lowered)
  ) {
    return { code: "ACCESS_REVOKED", message };
  }
  return { code: "VALIDATION_FAILED", message };
}
