/**
 * Saarthi — customer-facing portal assistant (rule-based Phase 1).
 * Answers pending / received / what-next from Document Requests LOD state only.
 */

import type { DocumentRequestItemState } from "@/types/document-requests";

export type SaarthiMessage = {
  id: string;
  role: "customer" | "saarthi";
  text: string;
  at: string;
};

function isPending(status: DocumentRequestItemState["status"]): boolean {
  return (
    status === "pending" ||
    status === "requested" ||
    status === "rejected" ||
    status === "re_upload_required"
  );
}

function formatTime(iso?: string): string {
  if (!iso) return "recently";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "recently";
  }
}

export function answerSaarthiQuestion(
  question: string,
  items: DocumentRequestItemState[],
): string {
  const q = question.trim().toLowerCase();
  const pending = items.filter((i) => isPending(i.status));
  const uploaded = items.filter(
    (i) =>
      i.status === "uploaded" ||
      i.status === "under_verification" ||
      i.status === "verified",
  );
  const criticalPending = pending.filter((i) => i.category === "critical");

  if (!q) {
    return "Ask me which documents are pending, whether we received a file, or what happens next.";
  }

  if (
    q.includes("pending") ||
    q.includes("missing") ||
    q.includes("left") ||
    q.includes("remaining") ||
    q.includes("which document")
  ) {
    if (pending.length === 0) {
      return "You have no pending documents. Thank you — our team will continue verification.";
    }
    const list = pending.map((i) => `• ${i.label}`).join("\n");
    return `You currently have ${pending.length} pending document${pending.length === 1 ? "" : "s"}.\n\n${list}\n\nPlease upload them below.`;
  }

  if (
    q.includes("received") ||
    q.includes("got my") ||
    q.includes("have you") ||
    q.includes("did you get") ||
    q.includes("uploaded")
  ) {
    const match = uploaded.find((i) => {
      const label = i.label.toLowerCase();
      const words = label.split(/\s+/).filter((w) => w.length > 2);
      return words.some((w) => q.includes(w)) || q.includes(label);
    });
    if (match) {
      const verifying =
        match.status === "under_verification" || match.status === "uploaded"
          ? "Verification is currently in progress."
          : match.status === "verified"
            ? "It has been verified."
            : "";
      return `Yes.\n\nYour ${match.label} was received ${formatTime(match.uploadedAt)}.\n\n${verifying}`.trim();
    }
    if (uploaded.length === 0) {
      return "We have not received any documents on this secure link yet. Please upload from the list below.";
    }
    return `I could not match that document name. Received so far:\n\n${uploaded
      .map((i) => `• ${i.label} (${i.status.replace(/_/g, " ")})`)
      .join("\n")}`;
  }

  if (q.includes("next") || q.includes("what happen") || q.includes("after")) {
    if (criticalPending.length > 0) {
      return "Once the remaining critical documents are uploaded and verified, your application will move to Credit & Risk Assessment.";
    }
    if (pending.length > 0) {
      return "Critical documents look complete. Journey documents can continue in parallel while Credit & Risk Assessment begins after verification.";
    }
    return "Your documents are with our team for verification. Next step after verification is Credit & Risk Assessment.";
  }

  if (q.includes("hello") || q.includes("hi") || q.includes("help")) {
    return "I am Saarthi, your document collection assistant. Ask me about pending documents, whether a file was received, or what happens next.";
  }

  return "I can help with pending documents, receipt confirmation, and next steps. Try asking: “Which documents are pending?”";
}

export function buildSaarthiGreeting(items: DocumentRequestItemState[]): string {
  const pending = items.filter((i) => isPending(i.status)).length;
  if (pending === 0) {
    return "Welcome. All listed documents are uploaded. I can confirm receipt or explain what happens next.";
  }
  return `Welcome. You have ${pending} document${pending === 1 ? "" : "s"} still pending. Ask me anything about your list — I am Saarthi.`;
}
