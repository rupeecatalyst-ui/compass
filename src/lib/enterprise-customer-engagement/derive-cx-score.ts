/**
 * CO-BIZ-004 — Customer Experience Score (single formula SSOT).
 * Based on pending actions · response times · document turnaround · communication latency.
 */

import { ECE_CX_WEIGHTS } from "@/constants/enterprise-customer-engagement";
import type {
  EceCustomerExperienceScore,
  EceCustomerTask,
  EceDocumentCentre,
  EceMessage,
  EceTimelineEvent,
} from "@/types/enterprise-customer-engagement";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function bandOf(overall: number): EceCustomerExperienceScore["band"] {
  if (overall >= 85) return "excellent";
  if (overall >= 70) return "good";
  if (overall >= 50) return "fair";
  return "needs_attention";
}

function hoursBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.abs(b - a) / (1000 * 60 * 60);
}

export function deriveCustomerExperienceScore(input: {
  tasks: EceCustomerTask[];
  documents: EceDocumentCentre | null;
  messages: EceMessage[];
  timeline: EceTimelineEvent[];
  lastCustomerActivityAt?: string;
}): EceCustomerExperienceScore {
  const asOf = new Date().toISOString();
  const openTasks = input.tasks.filter((t) => t.status === "open").length;
  const pendingDocs =
    input.documents?.items.filter((i) => i.canUpload).length ?? openTasks;

  // Fewer pending actions → higher score
  const pendingLoad = openTasks + pendingDocs;
  const pendingScore = clamp(100 - pendingLoad * 12);

  // Response: if customer last acted recently, experience is healthier
  const lastAct = input.lastCustomerActivityAt;
  let responseScore = 72;
  if (lastAct) {
    const hours = hoursBetween(lastAct, asOf);
    if (hours <= 24) responseScore = 92;
    else if (hours <= 72) responseScore = 78;
    else if (hours <= 168) responseScore = 60;
    else responseScore = 42;
  } else if (pendingLoad === 0) {
    responseScore = 88;
  }

  // Document turnaround from progress band
  const progress = input.documents?.progress;
  let docScore = 55;
  if (progress) {
    if (progress.band === "ready") docScore = 95;
    else if (progress.band === "awaiting_verification") docScore = 80;
    else if (progress.band === "in_progress") docScore = 65;
    else docScore = 45;
    if (progress.total > 0) {
      const ratio = (progress.verified + progress.uploaded * 0.5) / progress.total;
      docScore = clamp(docScore * 0.4 + ratio * 100 * 0.6);
    }
  }

  // Communication latency: unanswered customer questions lower the score
  const msgs = input.messages;
  let commScore = 75;
  if (msgs.length === 0) {
    commScore = 70;
  } else {
    const lastCustomer = [...msgs].reverse().find((m) => m.role === "customer");
    const lastRm = [...msgs].reverse().find((m) => m.role === "relationship_manager");
    if (lastCustomer && (!lastRm || lastRm.at < lastCustomer.at)) {
      const waitH = hoursBetween(lastCustomer.at, asOf);
      if (waitH <= 24) commScore = 68;
      else if (waitH <= 72) commScore = 48;
      else commScore = 30;
    } else {
      commScore = 90;
    }
  }

  // Mild boost when milestones are flowing
  if (input.timeline.some((t) => t.category === "milestone" || t.category === "approval")) {
    responseScore = clamp(responseScore + 4);
  }

  const dimensions = [
    {
      id: "pending_actions",
      label: "Pending actions",
      score: pendingScore,
      weight: ECE_CX_WEIGHTS.pending_actions,
      rationale: `${openTasks} open action(s), ${pendingDocs} document(s) awaiting you.`,
    },
    {
      id: "response_times",
      label: "Response times",
      score: responseScore,
      weight: ECE_CX_WEIGHTS.response_times,
      rationale: lastAct
        ? "Based on your recent portal activity."
        : "No recent customer activity recorded yet.",
    },
    {
      id: "document_turnaround",
      label: "Document turnaround",
      score: docScore,
      weight: ECE_CX_WEIGHTS.document_turnaround,
      rationale: progress
        ? `${progress.bandLabel} · ${progress.verified}/${progress.total} verified`
        : "Document list not yet available.",
    },
    {
      id: "communication_latency",
      label: "Communication latency",
      score: commScore,
      weight: ECE_CX_WEIGHTS.communication_latency,
      rationale: `${msgs.length} message(s) in this application thread.`,
    },
  ];

  const overall = clamp(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0),
  );

  return {
    overall,
    band: bandOf(overall),
    dimensions,
    asOf,
  };
}
