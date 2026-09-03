/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Document Q&A grounding from Enterprise Read + Document Registry projections.
 * Never invents LOD / requirements.
 */

import { redactFacingIntelligenceText } from "@/lib/chanakya-conversation-intelligence/facing-redact";
import type { ChanakyaEnterpriseReadCompileResult } from "@/types/chanakya-enterprise-read-context";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

function pushNote(notes: string[], value: unknown): void {
  const text = redactFacingIntelligenceText(str(value) || "");
  if (text) notes.push(text);
}

export function collectChanakyaDocumentGroundingNotes(
  compile: ChanakyaEnterpriseReadCompileResult | null,
): string[] {
  if (!compile) return [];
  const notes: string[] = [];

  const execDocs = compile.transactionExecutiveSnapshot?.documents;
  if (execDocs) {
    pushNote(notes, execDocs.summary);
    if (execDocs.pendingCount != null) {
      notes.push(`Pending document count on this transaction: ${execDocs.pendingCount}.`);
    }
    if (execDocs.criticalPendingCount != null) {
      notes.push(`Critical pending document count: ${execDocs.criticalPendingCount}.`);
    }
  }

  const slice =
    asRecord(compile.opportunity360?.slices.documents?.payload) ||
    asRecord(compile.deal360?.slices.documents?.payload);
  if (slice) {
    const readiness = asRecord(asRecord(slice.readinessEvidence)?.documentReadiness);
    if (readiness) {
      pushNote(notes, readiness.label);
      if (readiness.pending != null) {
        notes.push(`Readiness pending: ${String(readiness.pending)}.`);
      }
      if (readiness.uploaded != null && readiness.total != null) {
        notes.push(
          `Uploaded ${String(readiness.uploaded)} of ${String(readiness.total)} required items (authorised readiness derive).`,
        );
      }
    }
    const checklist = Array.isArray(slice.checklist) ? slice.checklist : [];
    for (const raw of checklist.slice(0, 24)) {
      const item = asRecord(raw);
      if (!item) continue;
      const name = str(item.label) || str(item.name) || str(item.typeRef) || "Document";
      const status = str(item.status) || str(item.state) || "not specified";
      const owner = str(item.ownerLabel) || str(item.participantRole) || str(item.scope);
      notes.push(
        redactFacingIntelligenceText(
          [name, status, owner ? `owner ${owner}` : null].filter(Boolean).join(" — "),
        ),
      );
    }
  }

  return notes.filter(Boolean).slice(0, 40);
}

export function isChanakyaDocumentQuestion(message: string): boolean {
  const q = (message || "").trim().toLowerCase();
  return (
    /\b(which documents|what documents|documents? (required|pending|missing|received|rejected|expired|accepted|under review)|document-ready|document ready|co-applicant|guarantor documents|company documents|lender program require|request next)\b/.test(
      q,
    ) || /\b(lod|list of documents)\b/.test(q)
  );
}
