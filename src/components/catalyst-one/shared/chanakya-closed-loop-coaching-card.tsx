"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Phone, Mail, MessageCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChanakyaGreeting } from "@/hooks/use-chanakya-greeting";
import { useAuthContext } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";
import type {
  ChanakyaCoachingPrompt,
  ChanakyaCoachingQuickActionId,
} from "@/types/chanakya-closed-loop-coaching";
import {
  applyChanakyaCoachingYesPatch,
  buildChanakyaCoachingRemindTask,
  deriveChanakyaCoachingPrompt,
  recordChanakyaCoachingResponse,
} from "@/lib/chanakya-closed-loop-coaching";
import { feedback } from "@/lib/action-feedback";

export interface ChanakyaClosedLoopCoachingCardProps {
  loan: LoanFile;
  saving?: boolean;
  onApplyPatch: (patch: Partial<LoanFile>) => void | Promise<void>;
  className?: string;
}

const ACTION_ICON: Record<ChanakyaCoachingQuickActionId, typeof Phone> = {
  call_banker: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  remind_tomorrow: Bell,
};

/**
 * CF-CHANAKYA-003 — Closed Loop Business Coaching.
 * Structured YES/NO + quick actions. Never open-ended when a structured path exists.
 */
export function ChanakyaClosedLoopCoachingCard({
  loan,
  saving = false,
  onApplyPatch,
  className,
}: ChanakyaClosedLoopCoachingCardProps) {
  const { user } = useAuthContext();
  const firstName = user?.firstName?.trim() || "there";
  const [phase, setPhase] = useState<"ask" | "no_actions" | "done">("ask");
  const [busy, setBusy] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const prompt = useMemo(() => {
    const next = deriveChanakyaCoachingPrompt(loan);
    if (!next || next.id === dismissedId) return null;
    return next;
  }, [loan, dismissedId]);

  const greeting = useChanakyaGreeting({
    context: "guidance",
    firstName,
    enabled: Boolean(prompt),
    surfaceKey: prompt ? `coach:${prompt.id}` : "coach:idle",
  });

  if (!prompt || phase === "done") return null;

  const handleYes = async () => {
    setBusy(true);
    try {
      recordChanakyaCoachingResponse({
        promptId: prompt.id,
        triggerKind: prompt.triggerKind,
        loanFileId: prompt.loanFileId,
        answer: "yes",
        answeredAt: new Date().toISOString(),
        firstName,
      });
      const patch = applyChanakyaCoachingYesPatch(loan, prompt);
      await onApplyPatch(patch);
      setPhase("done");
      setDismissedId(prompt.id);
    } finally {
      setBusy(false);
    }
  };

  const handleNo = () => {
    recordChanakyaCoachingResponse({
      promptId: prompt.id,
      triggerKind: prompt.triggerKind,
      loanFileId: prompt.loanFileId,
      answer: "no",
      answeredAt: new Date().toISOString(),
      firstName,
    });
    setPhase("no_actions");
  };

  const runQuickAction = async (actionId: ChanakyaCoachingQuickActionId) => {
    recordChanakyaCoachingResponse({
      promptId: prompt.id,
      triggerKind: prompt.triggerKind,
      loanFileId: prompt.loanFileId,
      answer: "no",
      quickActionId: actionId,
      answeredAt: new Date().toISOString(),
      firstName,
    });

    if (actionId === "call_banker") {
      const tel = loan.customerMobile?.replace(/\D/g, "");
      if (tel) window.open(`tel:${tel}`, "_self");
      return;
    }
    if (actionId === "whatsapp") {
      const tel = loan.customerMobile?.replace(/\D/g, "");
      if (tel) {
        const text = encodeURIComponent(
          `Following up on ${prompt.meta.lenderName ?? "lender"} login for ${prompt.meta.organisationName ?? loan.customerName}.`,
        );
        window.open(`https://wa.me/91${tel.slice(-10)}?text=${text}`, "_blank");
      }
      return;
    }
    if (actionId === "email") {
      if (loan.customerEmail) {
        const subject = encodeURIComponent(
          `Follow-up · ${prompt.meta.lenderName ?? "Lender"} · ${loan.fileNumber}`,
        );
        const body = encodeURIComponent(
          `Hi,\n\nChecking on login acknowledgment for ${prompt.meta.organisationName ?? loan.customerName} with ${prompt.meta.lenderName ?? "the lender"}.\n\nRegards,\n${firstName}`,
        );
        window.open(`mailto:${loan.customerEmail}?subject=${subject}&body=${body}`, "_self");
      }
      return;
    }
    if (actionId === "remind_tomorrow") {
      setBusy(true);
      try {
        const task = buildChanakyaCoachingRemindTask(prompt);
        await onApplyPatch({
          tasks: [task, ...(loan.tasks ?? [])],
          timeline: [
            {
              id: `tl-remind-${Date.now()}`,
              title: "CHANAKYA remind",
              description: `Remind Tomorrow scheduled · ${task.title}`,
              timestamp: new Date().toISOString(),
              completed: true,
            },
            ...loan.timeline,
          ],
        });
        feedback.taskAssigned();
        setPhase("done");
        setDismissedId(prompt.id);
      } finally {
        setBusy(false);
      }
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-50/90 via-background to-background p-4 shadow-sm dark:border-violet-800/50 dark:from-violet-950/40",
        className,
      )}
      role="region"
      aria-label="CHANAKYA Business Coaching"
    >
      <div className="flex gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-violet-400/35">
          <Image
            src="/images/chanakya-portrait.png"
            alt="CHANAKYA"
            fill
            className="object-cover"
            sizes="44px"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
            CHANAKYA · Business Coaching
          </p>
          <p className="text-sm font-semibold tracking-tight text-foreground">{greeting.text}</p>
          <p className="text-sm leading-relaxed text-foreground/90">{prompt.headlineContext}</p>
          <p className="text-sm font-medium text-foreground">{prompt.question}</p>

          {phase === "ask" && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                className="h-8 min-w-[72px] rounded-lg bg-teal-600 hover:bg-teal-500"
                disabled={busy || saving}
                onClick={() => void handleYes()}
              >
                {prompt.yesLabel ?? "YES"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 min-w-[72px] rounded-lg border-violet-300/60"
                disabled={busy || saving}
                onClick={handleNo}
              >
                {prompt.noLabel ?? "NO"}
              </Button>
            </div>
          )}

          {phase === "no_actions" && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-muted-foreground">
                Recommended next action — pick one to continue coaching.
              </p>
              <div className="flex flex-wrap gap-2">
                {prompt.quickActions.map((action) => {
                  const Icon = ACTION_ICON[action.id];
                  return (
                    <Button
                      key={action.id}
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 gap-1.5 rounded-lg"
                      disabled={busy || saving}
                      onClick={() => void runQuickAction(action.id)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Exposed for tests / future surfaces that already have a derived prompt. */
export type { ChanakyaCoachingPrompt };
