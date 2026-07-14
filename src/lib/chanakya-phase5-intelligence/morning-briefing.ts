/**
 * CF-CHANAKYA-015 — Morning Briefing + Enterprise Narrative (foundation).
 * Personalised recommendations with direct navigation — not generic counts.
 */

import { ROUTES } from "@/constants/routes";
import type {
  ChanakyaDailyReflectionPackage,
  ChanakyaEnterpriseNarrative,
  ChanakyaMorningBriefing,
  ChanakyaMorningBriefingItem,
} from "@/types/chanakya-phase5-intelligence";
import { buildChanakyaDailyReflectionPackage } from "./reflection-package";

function salutation(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function buildChanakyaEnterpriseNarrative(
  packageOrDay?: ChanakyaDailyReflectionPackage | string,
): ChanakyaEnterpriseNarrative {
  const pkg =
    typeof packageOrDay === "string" || packageOrDay == null
      ? buildChanakyaDailyReflectionPackage({ businessDay: packageOrDay })
      : packageOrDay;

  const whatHappened = pkg.transactionSummaries.slice(0, 3).join(" ");
  const risk = pkg.filesAtRisk[0];
  const whyItMatters = risk
    ? `${risk.customerName}'s ${risk.product} needs attention because ${risk.whyAtRisk}`
    : "Yesterday's activity sets today's prioritisation.";
  const currentSituation = `Tasks: ${pkg.taskStatus.completed} completed, ${pkg.taskStatus.pending} pending, ${pkg.taskStatus.overdue} overdue.`;
  const nextRecommendation =
    risk && risk.loanFileId
      ? `Open Loan Workspace for ${risk.customerName} and clear the next operational blocker.`
      : "Review pending actions and clear one high-impact follow-up before mid-morning.";

  return {
    narrativeId: `narrative:${pkg.businessDay}`,
    businessDay: pkg.businessDay,
    whatHappened: whatHappened || pkg.enterpriseSummary,
    whyItMatters,
    currentSituation,
    nextRecommendation,
    factBased: true,
  };
}

export function deriveChanakyaMorningBriefing(input?: {
  firstName?: string;
  businessDay?: string;
  reflection?: ChanakyaDailyReflectionPackage;
}): ChanakyaMorningBriefing {
  const reflection =
    input?.reflection ??
    buildChanakyaDailyReflectionPackage({
      businessDay: input?.businessDay,
      firstName: input?.firstName,
    });
  const firstName = input?.firstName?.trim() || "there";
  const narrative = buildChanakyaEnterpriseNarrative(reflection);

  const items: ChanakyaMorningBriefingItem[] = reflection.filesAtRisk
    .filter((f) => f.customerName !== "—")
    .slice(0, 5)
    .map((f, index) => ({
      id: `brief:${reflection.businessDay}:${index}`,
      customerName: f.customerName,
      product: f.product,
      lender: f.lender ?? "Not selected",
      currentStage: f.stage,
      whyAttentionRequired: f.whyAtRisk,
      suggestedNextAction:
        index === 0
          ? "Clear the blocker and confirm next document or banker follow-up."
          : "Review status and confirm the next concrete step with the customer or lender.",
      navigationLabel: "Open Loan Workspace",
      href: f.href,
      loanFileId: f.loanFileId,
      priority: (index === 0 ? 1 : index < 3 ? 2 : 3) as 1 | 2 | 3,
    }));

  if (items.length === 0) {
    items.push({
      id: `brief:${reflection.businessDay}:ops`,
      customerName: "Enterprise Operations",
      product: "—",
      lender: "—",
      currentStage: "Morning Review",
      whyAttentionRequired: "No at-risk files in yesterday's reflection — use this window for proactive outreach.",
      suggestedNextAction: "Open Loan Workflow to review active cases and set today's top three actions.",
      navigationLabel: "Open Loan Workflow",
      href: ROUTES.LOAN_FILES,
      priority: 3,
    });
  }

  return {
    briefingId: `morning:${reflection.businessDay}`,
    businessDay: reflection.businessDay,
    presentedAt: new Date().toISOString(),
    salutation: `${salutation()}, ${firstName}`,
    items,
    narrative,
  };
}
