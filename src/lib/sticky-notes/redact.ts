/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
 * Private notes must never leak through logs, analytics, or shared activity.
 */

export function stickyNoteAuditScalar(noteId: string): string {
  return `sticky-note:${noteId}`;
}

export function stickyNotesMustOmitBodiesFromLogs(payload: Record<string, unknown>): boolean {
  return !("body" in payload) && !("title" in payload) && !("checklist" in payload);
}
