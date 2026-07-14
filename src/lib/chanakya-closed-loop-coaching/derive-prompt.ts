/**
 * CF-CHANAKYA-003 — Derive structured coaching prompts from loan case context.
 */

import { normalizeLenderCaseStage } from "@/constants/lender-pipeline";
import type { LoanFile, LoanLenderExecution } from "@/types/catalyst-one";
import type {
  ChanakyaCoachingPrompt,
  ChanakyaCoachingQuickAction,
} from "@/types/chanakya-closed-loop-coaching";
import { getLatestChanakyaCoachingResponse, rankChanakyaCoachingQuickActions } from "./response-store";

const DEFAULT_QUICK_ACTIONS: ChanakyaCoachingQuickAction[] = [
  { id: "call_banker", label: "Call Banker" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "Email" },
  { id: "remind_tomorrow", label: "Remind Tomorrow" },
];

function businessDaysSince(iso: string, now = new Date()): number {
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return 0;
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let days = 0;
  const cursor = new Date(s);
  while (cursor < e) {
    cursor.setDate(cursor.getDate() + 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days += 1;
  }
  return Math.max(days, 0);
}

function organisationName(file: LoanFile): string {
  return file.businessDetails?.companyName?.trim() || file.customerName;
}

function pickLenderCase(file: LoanFile): LoanLenderExecution | undefined {
  const cases = (file.lenders ?? []).filter((c) => c.status !== "closed");
  if (cases.length === 0) return undefined;
  const primary = cases.find((c) => c.isPrimary);
  if (primary) return primary;
  const logged = cases.find((c) => {
    const stage = normalizeLenderCaseStage(c.caseStage);
    return stage === "logged_in_wip" || stage === "prelogin";
  });
  return logged ?? cases[0];
}

function bankerHonorific(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "the banker";
  if (/^(mr|mrs|ms|dr)\b/i.test(cleaned)) return cleaned;
  return `Mr ${cleaned}`;
}

/**
 * Build the next unanswered coaching prompt for this loan file.
 * Prefer structured closed-loop questions over open chat.
 */
export function deriveChanakyaCoachingPrompt(
  file: LoanFile,
): ChanakyaCoachingPrompt | null {
  const lender = pickLenderCase(file);
  const org = organisationName(file);

  // Prompt A — Lender login acknowledgment (example from certification brief)
  if (lender) {
    const stage = normalizeLenderCaseStage(lender.caseStage);
    const sinceIso = lender.loginDate || lender.updatedAt || lender.createdAt;
    const days = businessDaysSince(sinceIso);
    const banker = lender.relationshipManager?.trim();

    if (
      (stage === "logged_in_wip" || stage === "prelogin" || Boolean(lender.loginDate)) &&
      days >= 1 &&
      banker
    ) {
      const promptId = `login-ack:${file.id}:${lender.id}`;
      const prior = getLatestChanakyaCoachingResponse(promptId);
      if (prior?.answer === "yes") {
        // Already confirmed — do not re-ask
      } else {
        const actions = rankChanakyaCoachingQuickActions(
          "lender_login_ack",
          DEFAULT_QUICK_ACTIONS,
        ) as ChanakyaCoachingQuickAction[];
        const dayLabel = days === 1 ? "1 business day" : `${days} business days`;
        return {
          id: promptId,
          triggerKind: "lender_login_ack",
          loanFileId: file.id,
          lenderCaseId: lender.id,
          headlineContext: `${org} has been with ${lender.lender} for ${dayLabel}.`,
          question: `Has ${bankerHonorific(banker)} acknowledged the login?`,
          yesLabel: "YES",
          noLabel: "NO",
          quickActions: actions,
          meta: {
            lenderName: lender.lender,
            bankerName: banker,
            organisationName: org,
            businessDays: days,
            targetLoanStage: "logged_in",
            targetLenderStage: "logged_in_wip",
          },
        };
      }
    }
  }

  // Prompt B — Loan still in Pre-Login / login ready
  if (file.stage === "pre_login") {
    const promptId = `pre-login-ready:${file.id}`;
    const prior = getLatestChanakyaCoachingResponse(promptId);
    if (prior?.answer !== "yes") {
      const actions = rankChanakyaCoachingQuickActions(
        "pre_login_ready",
        DEFAULT_QUICK_ACTIONS,
      ) as ChanakyaCoachingQuickAction[];
      const lenderName = lender?.lender ?? "the lender";
      return {
        id: promptId,
        triggerKind: "pre_login_ready",
        loanFileId: file.id,
        lenderCaseId: lender?.id,
        headlineContext: `${org} is ready for login with ${lenderName}.`,
        question: "Have you completed the bank login for this file?",
        yesLabel: "YES",
        noLabel: "NO",
        quickActions: actions,
        meta: {
          lenderName: lender?.lender,
          bankerName: lender?.relationshipManager,
          organisationName: org,
          targetLoanStage: "logged_in",
          targetLenderStage: "logged_in_wip",
        },
      };
    }
  }

  // Prompt C — Idle lender follow-up (3+ calendar days)
  if (lender) {
    const idleDays = businessDaysSince(lender.updatedAt);
    if (idleDays >= 3) {
      const promptId = `idle-followup:${file.id}:${lender.id}:${lender.updatedAt.slice(0, 10)}`;
      const prior = getLatestChanakyaCoachingResponse(promptId);
      if (prior?.answer !== "yes") {
        const actions = rankChanakyaCoachingQuickActions(
          "idle_lender_followup",
          DEFAULT_QUICK_ACTIONS,
        ) as ChanakyaCoachingQuickAction[];
        return {
          id: promptId,
          triggerKind: "idle_lender_followup",
          loanFileId: file.id,
          lenderCaseId: lender.id,
          headlineContext: `${lender.lender} has been quiet for ${idleDays} business days.`,
          question: "Did you receive an update from the banker on this case?",
          yesLabel: "YES",
          noLabel: "NO",
          quickActions: actions,
          meta: {
            lenderName: lender.lender,
            bankerName: lender.relationshipManager,
            organisationName: org,
            businessDays: idleDays,
          },
        };
      }
    }
  }

  return null;
}
