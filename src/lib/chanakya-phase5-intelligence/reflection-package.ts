/**
 * CF-CHANAKYA-015 — Nightly Reflection Package builder.
 * Structured business context only — never raw database dumps.
 */

import { ROUTES } from "@/constants/routes";
import { CP5_NIGHTLY_REFLECTION_DEFAULT_LOCAL_TIME } from "@/constants/chanakya-phase5-intelligence";
import type { ChanakyaDailyReflectionPackage, ChanakyaMemoryEvent } from "@/types/chanakya-phase5-intelligence";
import { getChanakyaDayMemory, listChanakyaMemoryEvents } from "./memory-store";

function byKind(events: ChanakyaMemoryEvent[], kind: ChanakyaMemoryEvent["kind"]) {
  return events.filter((e) => e.kind === kind);
}

export function buildChanakyaDailyReflectionPackage(input?: {
  businessDay?: string;
  firstName?: string;
  completedTaskIds?: string[];
  pendingTaskIds?: string[];
  overdueTaskIds?: string[];
}): ChanakyaDailyReflectionPackage {
  const memory = getChanakyaDayMemory(input?.businessDay);
  const events = memory.events.length > 0 ? memory.events : listChanakyaMemoryEvents(memory.businessDay);
  const firstName = input?.firstName?.trim() || "there";

  const customerConv = byKind(events, "customer_dialogue").map((e) => e.summary);
  const bankerConv = byKind(events, "banker_dialogue").map((e) => e.summary);
  const transactions = byKind(events, "loan_stage_movement")
    .concat(byKind(events, "opportunity_update"))
    .map((e) => {
      const who = e.customerName ? `${e.customerName} · ` : "";
      const product = e.product ? `${e.product} · ` : "";
      return `${who}${product}${e.summary}`;
    });

  const filesAtRisk = events
    .filter((e) => e.kind === "loan_stage_movement" || e.kind === "pending_action" || e.kind === "document")
    .filter((e) => e.customerName && e.stage)
    .slice(0, 5)
    .map((e) => ({
      customerName: e.customerName!,
      product: e.product ?? "—",
      lender: e.lender,
      stage: e.stage!,
      whyAtRisk: e.summary,
      loanFileId: e.loanFileId,
      href: e.loanFileId
        ? `${ROUTES.LOAN_FILES}?file=${encodeURIComponent(e.loanFileId)}`
        : ROUTES.LOAN_FILES,
    }));

  const appreciations = byKind(events, "appreciation").map((e) => e.summary);
  const pendingActions = byKind(events, "pending_action")
    .concat(byKind(events, "task"))
    .map((e) => e.summary);

  const completed = input?.completedTaskIds?.length ?? 0;
  const pending = input?.pendingTaskIds?.length ?? byKind(events, "task").length;
  const overdue = input?.overdueTaskIds?.length ?? 0;

  return {
    packageId: `reflect:${memory.businessDay}:${crypto.randomUUID()}`,
    businessDay: memory.businessDay,
    preparedAt: new Date().toISOString(),
    scheduledForLocalTime: CP5_NIGHTLY_REFLECTION_DEFAULT_LOCAL_TIME,
    enterpriseSummary: `Enterprise day ${memory.businessDay}: ${events.length} meaningful observations recorded by CHANAKYA. Catalyst One remains the system of record; this package is structured context for overnight reasoning only.`,
    userSummary: `${firstName}: ${transactions.length} transaction movement(s), ${customerConv.length} customer conversation(s), ${bankerConv.length} banker conversation(s), ${pending} pending follow-up(s).`,
    transactionSummaries: transactions.length > 0 ? transactions : ["No stage or opportunity movements recorded today."],
    customerConversations: customerConv.length > 0 ? customerConv : ["No customer dialogues recorded today."],
    bankerConversations: bankerConv.length > 0 ? bankerConv : ["No banker dialogues recorded today."],
    taskStatus: {
      completed,
      pending,
      overdue,
      highlights: pendingActions.slice(0, 5),
    },
    filesAtRisk:
      filesAtRisk.length > 0
        ? filesAtRisk
        : [
            {
              customerName: "—",
              product: "—",
              stage: "—",
              whyAtRisk: "No files flagged at risk from today's memory.",
              href: ROUTES.LOAN_FILES,
            },
          ],
    appreciations:
      appreciations.length > 0
        ? appreciations
        : ["No appreciation signals recorded — recognise team progress tomorrow if merit is earned."],
    pendingActions: pendingActions.length > 0 ? pendingActions : ["No pending actions captured today."],
    feedbackSignals: {
      completedTaskIds: input?.completedTaskIds ?? [],
      pendingTaskIds: input?.pendingTaskIds ?? [],
      overdueTaskIds: input?.overdueTaskIds ?? [],
    },
  };
}
