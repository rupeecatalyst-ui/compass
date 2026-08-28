/**
 * CO-CHANAKYA-037 — Intent routing for employee Ask CHANAKYA (pure).
 */

import type {
  ChanakyaInappCompilePlan,
  ChanakyaInappIntent,
} from "@/types/chanakya-inapp-conversation";

function norm(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function classifyChanakyaInappIntent(
  message: string,
  priorIntent?: ChanakyaInappIntent | null,
): ChanakyaInappIntent {
  const q = norm(message);

  if (
    /\b(what should i do next|what next|next step|recommend next|how do i progress)\b/.test(
      q,
    )
  ) {
    return "what_next";
  }

  if (
    /\b(focus on first|focus first|what should i focus|prioritise|prioritize|start with)\b/.test(
      q,
    )
  ) {
    return "focus_first";
  }

  if (
    /\b(business loan|bl\b|need(s)? my intervention|intervene|intervention)\b/.test(q)
  ) {
    return "intervention_queue";
  }

  if (
    /\b(delayed beyond sla|beyond sla|sla breach|sla delay|transactions delayed)\b/.test(
      q,
    )
  ) {
    return "sla_delayed";
  }

  if (/\b(why .*stuck|case stuck|transaction stuck|what.?s blocking|blocker)\b/.test(q)) {
    return "why_stuck";
  }

  if (
    /\b(what changed|changed since|since yesterday|overnight|last 24|delta)\b/.test(q)
  ) {
    return "what_changed";
  }

  if (
    /\b(analyse|analyze|financials|credit (profile|analysis|intelligence)|banking|gst|itr)\b/.test(
      q,
    )
  ) {
    return "analyse_financials";
  }

  if (
    /\b(what documents|documents available|document (status|readiness|intelligence)|ocr_required|readable documents)\b/.test(
      q,
    )
  ) {
    return "analyse_financials";
  }

  if (
    /\b(what (information|info) is missing|missing information|gaps? remaining|what.?s missing)\b/.test(
      q,
    )
  ) {
    return "what_next";
  }

  if (
    /\b(commercial|accounting status|invoice|receivable|pdc)\b/.test(q) ||
    /\b(post[- ]?disbursement|disbursement confirmation)\b/.test(q) ||
    /\b(what is happening with this deal|deal status)\b/.test(q)
  ) {
    if (/\b(deal|this case|this transaction|this opportunity)\b/.test(q)) {
      return "why_stuck";
    }
    return "general_desk";
  }

  if (
    /\b(which lenders|relevant lenders|lender fit|lender(s)? (for|relevant)|recommend lender)\b/.test(
      q,
    )
  ) {
    return "lenders_relevant";
  }

  // Follow-up without clear keywords inherits entity-scoped prior when useful
  if (
    priorIntent &&
    (priorIntent === "why_stuck" ||
      priorIntent === "analyse_financials" ||
      priorIntent === "lenders_relevant") &&
    q.length < 80
  ) {
    return "what_next";
  }

  return "general_desk";
}

export function planChanakyaInappCompile(
  intent: ChanakyaInappIntent,
): ChanakyaInappCompilePlan {
  switch (intent) {
    case "why_stuck":
    case "what_next":
      return {
        mode: "transaction",
        requireEntity: true,
        domains: ["executive", "transactions", "execution", "documents", "commercial"],
      };
    case "analyse_financials":
      return {
        mode: "opportunity",
        requireEntity: true,
      };
    case "lenders_relevant":
      return {
        mode: "opportunity",
        requireEntity: true,
      };
    case "what_changed":
      return {
        mode: "enterprise",
        requireEntity: false,
        changePeriod: "since_yesterday",
        domains: ["executive", "transactions", "execution", "commercial"],
      };
    case "sla_delayed":
    case "intervention_queue":
    case "focus_first":
    case "general_desk":
    default:
      return {
        mode: "enterprise",
        requireEntity: false,
        domains: ["executive", "transactions", "commercial", "execution"],
      };
  }
}
