"use client";

/**
 * CO-UX-001 — CHANAKYA Lender Login Probe (minimal).
 * Identified → Logged In: Property Identified only.
 * Payee deferred to Accounting Stage. Existing Banker / Competition / Relationship Notes removed.
 */

import { useEffect, useState } from "react";
import {
  ChanakyaAvatar,
  ChanakyaIdentityLabel,
} from "@/components/catalyst-one/chanakya-enterprise-identity";
import { useAuthContext } from "@/components/providers/auth-provider";
import { useChanakyaGreeting } from "@/hooks/use-chanakya-greeting";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LenderLoginProbeValues } from "@/lib/lender-pipeline/login-probe";
import type { LoanLenderExecution } from "@/types/catalyst-one";

export function ChanakyaLenderLoginProbeDialog({
  open,
  caseExecution,
  customerName,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  caseExecution: LoanLenderExecution | null;
  customerName?: string;
  onOpenChange: (open: boolean) => void;
  onComplete: (values: LenderLoginProbeValues) => void;
}) {
  const { user } = useAuthContext();
  const firstName = user?.firstName?.trim() || "there";
  const greeting = useChanakyaGreeting({
    context: "guidance",
    firstName,
    enabled: open && Boolean(caseExecution),
    surfaceKey: caseExecution
      ? `lender-login-probe:${caseExecution.id}`
      : "lender-login-probe:idle",
  });

  const [propertyIdentified, setPropertyIdentified] = useState<string>("");
  const [nudge, setNudge] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !caseExecution) return;
    setPropertyIdentified(
      typeof caseExecution.propertyIdentified === "boolean"
        ? caseExecution.propertyIdentified
          ? "yes"
          : "no"
        : "",
    );
    setNudge(null);
  }, [open, caseExecution?.id]);

  const handleSubmit = () => {
    if (propertyIdentified !== "yes" && propertyIdentified !== "no") {
      setNudge("I still need to know whether the property is identified.");
      return;
    }
    setNudge(null);
    onComplete({
      propertyIdentified: propertyIdentified === "yes",
    });
  };

  if (!caseExecution) return null;

  const lenderLabel =
    caseExecution.lenderDisplayName || caseExecution.lenderLegalName || caseExecution.lender;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(480px,94vw)] overflow-y-auto border-violet-500/20 bg-gradient-to-b from-background via-background to-violet-50/40 p-0 sm:rounded-2xl dark:to-violet-950/30">
        <DialogHeader className="space-y-3 border-b border-violet-500/15 px-5 pb-4 pt-5 text-left">
          <div className="flex gap-3">
            <ChanakyaAvatar size="md" />
            <div className="min-w-0 space-y-1">
              <ChanakyaIdentityLabel surface="completion" />
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                {greeting.text}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                Before I move <span className="font-medium text-foreground">{lenderLabel}</span> to
                Logged In
                {customerName ? (
                  <>
                    {" "}
                    for <span className="font-medium text-foreground">{customerName}</span>
                  </>
                ) : null}
                , confirm one detail for this lender card.
              </DialogDescription>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Payee is captured later in Accounting — not during lender identification.
          </p>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <section className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">
              Property Identified <span className="text-violet-600">*</span>
            </Label>
            <Select value={propertyIdentified || undefined} onValueChange={setPropertyIdentified}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Has the property been identified?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes" className="text-xs">
                  Yes — property identified
                </SelectItem>
                <SelectItem value="no" className="text-xs">
                  No — not yet identified
                </SelectItem>
              </SelectContent>
            </Select>
          </section>

          {nudge ? (
            <p className="rounded-lg border border-violet-300/50 bg-violet-50/80 px-3 py-2 text-xs text-violet-950 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-100">
              {nudge}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-violet-500/15 px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            className="rounded-lg"
            onClick={() => onOpenChange(false)}
          >
            Come back later
          </Button>
          <Button
            type="button"
            className="rounded-lg bg-violet-600 hover:bg-violet-500"
            onClick={handleSubmit}
          >
            Save &amp; Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
