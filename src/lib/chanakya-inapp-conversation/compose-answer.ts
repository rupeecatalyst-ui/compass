/**
 * CO-CHANAKYA-037 — Evidence-first answer composer (pure; no fabricated business facts).
 */

import {
  CHANAKYA_INAPP_PHASE2_RATIO_TERMS,
  CHANAKYA_INAPP_READ_ONLY_LIMITATIONS,
} from "@/constants/chanakya-inapp-conversation";
import type { ChanakyaEnterpriseReadCompileResult } from "@/types/chanakya-enterprise-read-context";
import type {
  ChanakyaInappEntityRefs,
  ChanakyaInappIntent,
} from "@/types/chanakya-inapp-conversation";

export type ChanakyaInappComposeInput = {
  intent: ChanakyaInappIntent;
  question: string;
  entity: ChanakyaInappEntityRefs;
  compile: ChanakyaEnterpriseReadCompileResult | null;
  entityRequiredMissing: boolean;
};

export type ChanakyaInappComposeOutput = {
  text: string;
  provenance: string[];
  availabilityNotes: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pushProvenance(set: Set<string>, ...items: Array<string | null | undefined>) {
  for (const item of items) {
    if (item?.trim()) set.add(item.trim());
  }
}

function entityMissingReply(intent: ChanakyaInappIntent): ChanakyaInappComposeOutput {
  const need =
    intent === "lenders_relevant"
      ? "an Opportunity"
      : "an Opportunity or Deal";
  return {
    text: [
      `I need ${need} in context to answer that from enterprise evidence.`,
      "Open the case in Catalyst One (or keep an active Opportunity/Deal context), then ask again.",
      "I will not invent blockers, financials, or lender fit without authorised read-context evidence.",
    ].join("\n\n"),
    provenance: ["chanakya_inapp_conversation.entity_gate"],
    availabilityNotes: ["CASE_CONTEXT: NOT_AVAILABLE"],
  };
}

function phase2RatioGuard(question: string): string | null {
  const upper = question.toUpperCase();
  const hit = CHANAKYA_INAPP_PHASE2_RATIO_TERMS.find((term) => upper.includes(term));
  if (!hit) return null;
  return `${hit} is deferred to Phase 2 and is not calculated in Phase-1 Ask CHANAKYA. I will answer from available enterprise evidence only — without inventing ${hit}.`;
}

function listAttentionLines(
  transactionAttention: Record<string, unknown> | null,
  filter?: (row: Record<string, unknown>) => boolean,
  limit = 8,
): { lines: string[]; provenance: string[] } {
  if (!transactionAttention) {
    return {
      lines: ["Transaction attention evidence is NOT_AVAILABLE for this compile."],
      provenance: ["transactionAttention:NOT_AVAILABLE"],
    };
  }

  const candidates = [
    ...asArray(transactionAttention.attentionRows),
    ...asArray(transactionAttention.rows),
    ...asArray(transactionAttention.topAttention),
    ...asArray(transactionAttention.priorityRows),
    ...asArray(transactionAttention.items),
  ];

  const lines: string[] = [];
  const provenance = new Set<string>(["chanakya_enterprise_read_context.transactionAttention"]);

  for (const raw of candidates) {
    const row = asRecord(raw);
    if (!row) continue;
    if (filter && !filter(row)) continue;

    const title =
      String(
        row.title ??
          row.customerName ??
          row.borrowerName ??
          row.opportunityNumber ??
          row.dealNumber ??
          row.id ??
          "Transaction",
      ).trim() || "Transaction";
    const stage = String(row.stageLabel ?? row.stage ?? row.dealStage ?? "").trim();
    const reason = String(
      row.why ??
        row.reason ??
        row.chanakyaSays ??
        row.attentionReason ??
        row.summary ??
        "",
    ).trim();
    const product = String(row.product ?? row.loanProduct ?? row.productLabel ?? "").trim();
    const bits = [title];
    if (product) bits.push(product);
    if (stage) bits.push(stage);
    if (reason) bits.push(reason);
    lines.push(`• ${bits.join(" — ")}`);
    pushProvenance(
      provenance,
      typeof row.provenance === "string" ? row.provenance : null,
      typeof row.source === "string" ? row.source : null,
    );
    if (lines.length >= limit) break;
  }

  if (lines.length === 0) {
    const summary = String(
      transactionAttention.summary ??
        transactionAttention.attentionSummary ??
        transactionAttention.note ??
        "",
    ).trim();
    if (summary) {
      return { lines: [summary], provenance: [...provenance] };
    }
    return {
      lines: [
        "No attention rows were present in the authorised enterprise read context for this question.",
      ],
      provenance: [...provenance, "attentionRows:EMPTY"],
    };
  }

  return { lines, provenance: [...provenance] };
}

function looksLikeBusinessLoan(row: Record<string, unknown>): boolean {
  const blob = `${row.product ?? ""} ${row.loanProduct ?? ""} ${row.productLabel ?? ""} ${row.title ?? ""}`.toLowerCase();
  return (
    blob.includes("business loan") ||
    blob.includes("bl ") ||
    /\bbl\b/.test(blob) ||
    blob.includes("working capital") ||
    blob.includes("unsecured business")
  );
}

function looksSlaDelayed(row: Record<string, unknown>): boolean {
  const blob = `${row.why ?? ""} ${row.reason ?? ""} ${row.chanakyaSays ?? ""} ${row.attentionReason ?? ""} ${row.band ?? ""} ${row.quadrant ?? ""}`.toLowerCase();
  return (
    blob.includes("sla") ||
    blob.includes("overdue") ||
    blob.includes("delayed") ||
    blob.includes("ageing") ||
    blob.includes("breach") ||
    blob.includes("critical")
  );
}

function composeStuck(compile: ChanakyaEnterpriseReadCompileResult): ChanakyaInappComposeOutput {
  const provenance = new Set<string>(["chanakya_enterprise_read_context"]);
  const notes: string[] = [];
  const parts: string[] = [];

  const attn = asRecord(compile.transactionAttention);
  const reasons = asArray(attn?.reasons ?? attn?.attentionReasons ?? attn?.whyStuck);
  if (reasons.length > 0) {
    parts.push("Evidence-backed blockers / attention reasons:");
    for (const r of reasons.slice(0, 8)) {
      const row = asRecord(r);
      if (!row) {
        parts.push(`• ${String(r)}`);
        continue;
      }
      const statement = String(row.statement ?? row.reason ?? row.text ?? "").trim();
      const domain = String(row.domain ?? "").trim();
      const source = String(row.source ?? "").trim();
      if (statement) {
        parts.push(`• ${domain ? `[${domain}] ` : ""}${statement}`);
      }
      pushProvenance(provenance, source || null);
    }
  }

  const snap = compile.transactionExecutiveSnapshot;
  if (snap) {
    pushProvenance(provenance, "transactionExecutiveSnapshot");
    const headline = String(
      (snap as { headline?: string; summary?: string }).headline ??
        (snap as { summary?: string }).summary ??
        "",
    ).trim();
    if (headline) parts.push(`Executive snapshot: ${headline}`);
  }

  const opp = compile.opportunity360;
  if (opp) {
    pushProvenance(provenance, "opportunity360");
    const stage = String(
      (opp as { stageLabel?: string; lifecycleStatus?: string }).stageLabel ??
        (opp as { lifecycleStatus?: string }).lifecycleStatus ??
        "",
    ).trim();
    if (stage) parts.push(`Opportunity stage (evidence): ${stage}`);
  }

  const deal = compile.deal360;
  if (deal) {
    pushProvenance(provenance, "deal360");
    const stage = String(
      (deal as { stageLabel?: string; grossStage?: string }).stageLabel ??
        (deal as { grossStage?: string }).grossStage ??
        "",
    ).trim();
    if (stage) parts.push(`Deal stage (evidence): ${stage}`);
  }

  if (parts.length === 0) {
    notes.push("STUCK_EVIDENCE: NOT_AVAILABLE");
    parts.push(
      "I could not find specific stuck/blocker evidence for this case in the current enterprise read context.",
      "That does not mean the case is healthy — only that the joined attention evidence is NOT_AVAILABLE or empty for this compile.",
    );
  } else {
    parts.unshift("Here is why this case appears stuck, from authorised evidence only:");
  }

  parts.push(
    "Advisory next step: resolve the highest-evidence gap above (documents, lender follow-up, or stage exception) without inventing missing facts.",
  );

  return {
    text: parts.join("\n\n"),
    provenance: [...provenance],
    availabilityNotes: notes,
  };
}

function composeFinancials(
  compile: ChanakyaEnterpriseReadCompileResult,
): ChanakyaInappComposeOutput {
  const provenance = new Set<string>(["chanakya_credit_intelligence"]);
  const notes: string[] = [];
  const parts: string[] = [];
  const credit = compile.creditIntelligence;

  if (!credit) {
    notes.push("creditIntelligence: NOT_AVAILABLE");
    return {
      text: [
        "Credit / financial intelligence is NOT_AVAILABLE for this transaction in the current compile.",
        "I will not fabricate ratios, banking summaries, or document conclusions.",
        "OCR-dependent document text remains OCR_REQUIRED / NOT_AVAILABLE until OCR is configured (Phase-1 honest boundary).",
      ].join("\n\n"),
      provenance: [...provenance],
      availabilityNotes: notes,
    };
  }

  const summary = String(
    (credit as { summary?: string; executiveSummary?: string }).summary ??
      (credit as { executiveSummary?: string }).executiveSummary ??
      "",
  ).trim();
  if (summary) parts.push(summary);

  const limitations = asArray((credit as { limitations?: unknown }).limitations);
  for (const lim of limitations.slice(0, 6)) {
    const line = String(lim).trim();
    if (line) {
      notes.push(line);
      if (/OCR_REQUIRED|NOT_AVAILABLE/i.test(line)) parts.push(`• ${line}`);
    }
  }

  const sections = asArray((credit as { sections?: unknown }).sections);
  for (const section of sections.slice(0, 6)) {
    const row = asRecord(section);
    if (!row) continue;
    const title = String(row.title ?? row.id ?? "Section").trim();
    const status = String(row.availability ?? row.status ?? "").trim();
    const body = String(row.summary ?? row.detail ?? row.text ?? "").trim();
    parts.push(`**${title}**${status ? ` (${status})` : ""}${body ? `\n${body}` : ""}`);
    pushProvenance(
      provenance,
      typeof row.provenance === "string" ? row.provenance : null,
    );
  }

  if (parts.length === 0) {
    notes.push("creditIntelligence.payload: EMPTY");
    parts.push(
      "Credit intelligence compiled but produced no narratable evidence rows. No fabricated financial analysis is returned.",
    );
  } else {
    parts.unshift("Financial / credit view from CHANAKYA credit intelligence (evidence-first):");
  }

  parts.push(
    "Phase-2 ratios (FOIR / DSCR / LTV / DBR) are not computed here.",
  );

  return {
    text: parts.join("\n\n"),
    provenance: [...provenance],
    availabilityNotes: notes,
  };
}

function composeLenders(
  compile: ChanakyaEnterpriseReadCompileResult,
): ChanakyaInappComposeOutput {
  const provenance = new Set<string>(["productLenderIntelligence"]);
  const notes: string[] = [];
  const parts: string[] = [];
  const pl = compile.productLenderIntelligence;

  if (!pl) {
    notes.push("productLenderIntelligence: NOT_AVAILABLE");
    return {
      text: [
        "Product / lender intelligence is NOT_AVAILABLE for this Opportunity in the current compile.",
        "I will not invent lender shortlists or fit scores.",
      ].join("\n\n"),
      provenance: [...provenance],
      availabilityNotes: notes,
    };
  }

  const summary = String(
    (pl as { summary?: string; headline?: string }).summary ??
      (pl as { headline?: string }).headline ??
      "",
  ).trim();
  if (summary) parts.push(summary);

  const lists = [
    asArray((pl as { assignedLenders?: unknown }).assignedLenders),
    asArray((pl as { matrixMappedLenders?: unknown }).matrixMappedLenders),
    asArray((pl as { recommendedLenders?: unknown }).recommendedLenders),
    asArray((pl as { potentialLenders?: unknown }).potentialLenders),
  ].flat();

  for (const raw of lists.slice(0, 10)) {
    const row = asRecord(raw);
    if (!row) continue;
    const name = String(
      row.lenderName ?? row.name ?? row.institutionName ?? row.label ?? "",
    ).trim();
    if (!name) continue;
    const note = String(row.fitNote ?? row.reason ?? row.assessment ?? "").trim();
    parts.push(`• ${name}${note ? ` — ${note}` : ""}`);
  }

  if (parts.length === 0) {
    notes.push("lenderRows: EMPTY");
    parts.push(
      "No lender rows were present in product/lender intelligence for this Opportunity.",
    );
  } else {
    parts.unshift("Relevant lenders from Product–Lender intelligence (evidence-first):");
  }

  return {
    text: parts.join("\n\n"),
    provenance: [...provenance],
    availabilityNotes: notes,
  };
}

function composeChange(
  compile: ChanakyaEnterpriseReadCompileResult,
): ChanakyaInappComposeOutput {
  const provenance = new Set<string>(["changeIntelligence"]);
  const notes: string[] = [];
  const parts: string[] = [];
  const ch = compile.changeIntelligence;

  if (!ch) {
    notes.push("changeIntelligence: NOT_AVAILABLE");
    return {
      text: [
        "Change intelligence is NOT_AVAILABLE for the requested period.",
        "I will not invent overnight deltas.",
      ].join("\n\n"),
      provenance: [...provenance],
      availabilityNotes: notes,
    };
  }

  const summary = String(
    (ch as { humanSummary?: string; summary?: string }).humanSummary ??
      (ch as { summary?: string }).summary ??
      "",
  ).trim();
  if (summary) parts.push(summary);

  const records = asArray((ch as { records?: unknown }).records).slice(0, 10);
  for (const raw of records) {
    const row = asRecord(raw);
    if (!row) continue;
    const line = String(
      row.summary ?? row.statement ?? row.title ?? row.description ?? "",
    ).trim();
    if (line) parts.push(`• ${line}`);
    pushProvenance(
      provenance,
      typeof row.source === "string" ? row.source : null,
      typeof row.provenance === "string" ? row.provenance : null,
    );
  }

  if (parts.length === 0) {
    notes.push("changeRecords: EMPTY");
    parts.push(
      "No evidence-backed changes were recorded for the selected window (since yesterday / configured period).",
    );
  } else {
    parts.unshift("What changed (evidence-first change intelligence):");
  }

  return {
    text: parts.join("\n\n"),
    provenance: [...provenance],
    availabilityNotes: notes,
  };
}

function composeDesk(
  intent: ChanakyaInappIntent,
  compile: ChanakyaEnterpriseReadCompileResult,
): ChanakyaInappComposeOutput {
  const attn = asRecord(compile.transactionAttention);
  const enterprise = asRecord(compile.enterpriseSummary);
  const provenance = new Set<string>(["chanakya_enterprise_read_context"]);
  const notes: string[] = [];
  const parts: string[] = [];

  if (enterprise) {
    const line = String(
      enterprise.summary ??
        enterprise.attentionSummary ??
        enterprise.headline ??
        enterprise.executiveStatement ??
        "",
    ).trim();
    if (line) {
      parts.push(line);
      pushProvenance(provenance, "enterpriseSummary");
    }
  }

  let listed: { lines: string[]; provenance: string[] };
  if (intent === "sla_delayed") {
    listed = listAttentionLines(attn, looksSlaDelayed);
  } else if (intent === "intervention_queue") {
    listed = listAttentionLines(attn, looksLikeBusinessLoan);
    if (listed.lines.length === 1 && listed.lines[0]?.includes("No attention")) {
      listed = listAttentionLines(attn);
      notes.push(
        "BUSINESS_LOAN_FILTER: no explicit BL product labels in attention rows — showing general intervention queue instead.",
      );
    }
  } else {
    listed = listAttentionLines(attn);
  }

  for (const p of listed.provenance) pushProvenance(provenance, p);

  if (intent === "focus_first") {
    parts.unshift("Focus first on the highest-evidence attention items on your authorised desk:");
  } else if (intent === "sla_delayed") {
    parts.unshift("Transactions with SLA / delay / overdue evidence:");
  } else if (intent === "intervention_queue") {
    parts.unshift("Cases that need intervention (from attention evidence):");
  } else if (intent === "what_next") {
    parts.unshift("Recommended next focus from current desk evidence:");
  } else {
    parts.unshift("Desk view from CHANAKYA enterprise read context:");
  }

  parts.push(listed.lines.join("\n"));
  parts.push(
    "This is advisory only. CHANAKYA does not update tasks, stages, invoices, or lender decisions.",
  );

  return {
    text: parts.filter(Boolean).join("\n\n"),
    provenance: [...provenance],
    availabilityNotes: notes,
  };
}

export function composeChanakyaInappAnswer(
  input: ChanakyaInappComposeInput,
): ChanakyaInappComposeOutput {
  const ratioNote = phase2RatioGuard(input.question);
  if (input.entityRequiredMissing) {
    const missing = entityMissingReply(input.intent);
    return ratioNote
      ? {
          ...missing,
          text: `${ratioNote}\n\n${missing.text}`,
          availabilityNotes: [...missing.availabilityNotes, "PHASE2_RATIO: DEFERRED"],
        }
      : missing;
  }

  if (!input.compile) {
    return {
      text: [
        ratioNote,
        "Enterprise read context compile returned no payload. I cannot invent an answer.",
        ...CHANAKYA_INAPP_READ_ONLY_LIMITATIONS,
      ]
        .filter(Boolean)
        .join("\n\n"),
      provenance: ["chanakya_enterprise_read_context:NULL"],
      availabilityNotes: ["compile: NOT_AVAILABLE"],
    };
  }

  let composed: ChanakyaInappComposeOutput;
  switch (input.intent) {
    case "why_stuck":
      composed = composeStuck(input.compile);
      break;
    case "analyse_financials":
      composed = composeFinancials(input.compile);
      break;
    case "lenders_relevant":
      composed = composeLenders(input.compile);
      break;
    case "what_changed":
      composed = composeChange(input.compile);
      break;
    case "what_next":
      if (input.entity.opportunityId || input.entity.dealId) {
        composed = composeStuck(input.compile);
        composed = {
          ...composed,
          text: `Given the active case context, here is what to do next (advisory):\n\n${composed.text}`,
        };
      } else {
        composed = composeDesk("what_next", input.compile);
      }
      break;
    case "focus_first":
    case "intervention_queue":
    case "sla_delayed":
    case "general_desk":
    default:
      composed = composeDesk(input.intent, input.compile);
      break;
  }

  if (ratioNote) {
    composed = {
      ...composed,
      text: `${ratioNote}\n\n${composed.text}`,
      availabilityNotes: [...composed.availabilityNotes, "PHASE2_RATIO: DEFERRED"],
    };
  }

  const limitations = input.compile.limitations ?? [];
  for (const lim of limitations.slice(0, 4)) {
    if (/OCR_REQUIRED|NOT_AVAILABLE|read-only/i.test(lim)) {
      composed.availabilityNotes.push(lim);
    }
  }

  return composed;
}
