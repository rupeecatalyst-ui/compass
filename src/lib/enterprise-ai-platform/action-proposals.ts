/**
 * Action Proposal Framework — propose CRM/workflow side effects (CO-AI-101).
 * Never executes. Execution is reserved for a future governed executor sprint.
 */

import { getEaiPorts } from "./composition";
import type {
  EaiActionProposal,
  EaiActionProposalKind,
  EaiConfidenceBand,
} from "@/types/enterprise-ai-platform";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export interface CreateEaiActionProposalInput {
  sessionId: string;
  conversationId: string;
  kind: EaiActionProposalKind;
  title: string;
  summary: string;
  payload?: Record<string, unknown>;
  confidence?: EaiConfidenceBand;
  requiresHumanApproval?: boolean;
}

export function createEaiActionProposal(
  input: CreateEaiActionProposalInput,
): EaiActionProposal {
  const ts = nowIso();
  const proposal: EaiActionProposal = {
    proposalId: newId("eai_prop"),
    sessionId: input.sessionId,
    conversationId: input.conversationId,
    kind: input.kind,
    status: "draft",
    title: input.title,
    summary: input.summary,
    payload: input.payload ?? {},
    confidence: input.confidence ?? "unspecified",
    requiresHumanApproval: input.requiresHumanApproval ?? true,
    createdAt: ts,
    updatedAt: ts,
  };
  getEaiPorts().proposals.save(proposal);
  return proposal;
}

export function getEaiActionProposal(proposalId: string): EaiActionProposal | undefined {
  return getEaiPorts().proposals.findById(proposalId);
}

export function listEaiActionProposalsBySession(sessionId: string): EaiActionProposal[] {
  return getEaiPorts().proposals.listBySession(sessionId);
}

/**
 * Transition proposal status within the proposal lifecycle.
 * `executed_reserved` is recorded as a status token only — no CRM mutation occurs.
 */
export function updateEaiActionProposalStatus(
  proposalId: string,
  status: EaiActionProposal["status"],
): EaiActionProposal | undefined {
  const ports = getEaiPorts();
  const existing = ports.proposals.findById(proposalId);
  if (!existing) return undefined;
  if (status === "executed_reserved") {
    // Hard rule AI-1: never mutate enterprise CRM from this module.
    const blocked: EaiActionProposal = {
      ...existing,
      status: "pending_review",
      updatedAt: nowIso(),
      summary: `${existing.summary} [AI-1: execution blocked — proposal only]`,
    };
    ports.proposals.save(blocked);
    return blocked;
  }
  const next: EaiActionProposal = {
    ...existing,
    status,
    updatedAt: nowIso(),
  };
  ports.proposals.save(next);
  return next;
}
