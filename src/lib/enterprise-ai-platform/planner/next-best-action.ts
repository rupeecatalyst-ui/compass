/**
 * Next Best Action (CO-AI-107).
 * Decides what should happen next — never executes.
 */

import type { EaiConfidenceBand } from "@/types/enterprise-ai-platform";
import type {
  EaiPlannerMissingInfo,
  EaiPlannerNextBestAction,
  EaiPlannerQuestion,
} from "@/types/enterprise-ai-planner";

function newId(): string {
  return `eai_nba_${crypto.randomUUID().slice(0, 8)}`;
}

export function deriveEaiNextBestActions(input: {
  utterance: string;
  missing: EaiPlannerMissingInfo[];
  selectedQuestions: EaiPlannerQuestion[];
  blocked?: boolean;
}): EaiPlannerNextBestAction[] {
  if (input.blocked) {
    return [
      {
        actionId: newId(),
        kind: "outside_refused",
        title: "Outside domain",
        summary: "I'm not trained for this subject.",
        confidence: "high",
        sequence: 1,
      },
    ];
  }

  const actions: EaiPlannerNextBestAction[] = [];
  const q = input.utterance.toLowerCase();
  let seq = 1;

  if (input.selectedQuestions.length > 0) {
    actions.push({
      actionId: newId(),
      kind: "ask_question",
      title: "Ask clarifying question",
      summary: input.selectedQuestions[0]!.text,
      confidence: "high",
      sequence: seq++,
    });
  }

  if (/\bdocument|kyc|upload\b/.test(q) || input.missing.some((m) => m.slotId === "document_readiness" && !m.alreadyKnown)) {
    actions.push({
      actionId: newId(),
      kind: "propose_document_request",
      title: "Propose document request",
      summary: "Propose requesting remaining KYC documents (approval required).",
      proposalKind: "request_documents",
      confidence: "moderate",
      sequence: seq++,
    });
  }

  if (/\bcallback|call me|speak to|follow[\s-]?up\b/.test(q)) {
    actions.push({
      actionId: newId(),
      kind: "propose_callback",
      title: "Propose callback",
      summary: "Propose scheduling a callback (approval required).",
      proposalKind: "schedule_callback",
      confidence: "moderate",
      sequence: seq++,
    });
  }

  if (/\bremind|follow[\s-]?up later\b/.test(q)) {
    actions.push({
      actionId: newId(),
      kind: "propose_reminder",
      title: "Propose reminder",
      summary: "Propose a reminder for follow-up (approval required).",
      proposalKind: "create_reminder",
      confidence: "moderate",
      sequence: seq++,
    });
  }

  if (/\bFOIR\b|\bDBR\b|\beligib|\bEMI\b|\bafford\b/i.test(input.utterance)) {
    actions.push({
      actionId: newId(),
      kind: "defer_to_engine",
      title: "Defer to enterprise engines",
      summary: "Engines will compute eligibility and EMI — Planner will not calculate.",
      confidence: "high" as EaiConfidenceBand,
      sequence: seq++,
    });
  }

  if (actions.length === 0 || actions.every((a) => a.kind === "ask_question")) {
    actions.push({
      actionId: newId(),
      kind: "continue_advisory",
      title: "Continue advisory",
      summary: "Continue with short SARATHI advisory once minimum facts are known.",
      confidence: "moderate",
      sequence: seq++,
    });
  }

  return actions;
}
