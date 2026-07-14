"use client";

import { useState } from "react";
import { Building2, User, Users } from "lucide-react";
import { ChanakyaAvatar, ChanakyaIdentityLabel } from "@/components/catalyst-one/chanakya-enterprise-identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ContactCreationIntentKind = "individual" | "company" | "individual_company";

export interface ContactCreationIntentResult {
  kind: ContactCreationIntentKind;
  individualName?: string;
  companyName?: string;
}

export interface ContactCreationIntentScreenProps {
  open: boolean;
  firstName: string;
  onOpenChange: (open: boolean) => void;
  onContinue: (result: ContactCreationIntentResult) => void;
}

const CHOICES: {
  kind: ContactCreationIntentKind;
  label: string;
  description: string;
  icon: typeof User;
}[] = [
  {
    kind: "individual",
    label: "Individual",
    description: "A person — borrower, investor, partner, or professional.",
    icon: User,
  },
  {
    kind: "company",
    label: "Company",
    description: "A legal entity — company, firm, or organisation.",
    icon: Building2,
  },
  {
    kind: "individual_company",
    label: "Individual + Company",
    description: "A person linked to a company (director, partner, proprietor…).",
    icon: Users,
  },
];

/**
 * Prompt 011 PART 8 — Pre-workflow intent screen only.
 * Does not redesign Contact Workspace or downstream forms.
 */
export function ContactCreationIntentScreen({
  open,
  firstName,
  onOpenChange,
  onContinue,
}: ContactCreationIntentScreenProps) {
  const [kind, setKind] = useState<ContactCreationIntentKind | null>(null);
  const [individualName, setIndividualName] = useState("");
  const [companyName, setCompanyName] = useState("");

  const showIndividual = kind === "individual" || kind === "individual_company";
  const showCompany = kind === "company" || kind === "individual_company";

  const canContinue =
    kind != null &&
    (!showIndividual || individualName.trim().length >= 2) &&
    (!showCompany || companyName.trim().length >= 2);

  const handleContinue = () => {
    if (!kind || !canContinue) return;
    onContinue({
      kind,
      individualName: showIndividual ? individualName.trim() : undefined,
      companyName: showCompany ? companyName.trim() : undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setKind(null);
          setIndividualName("");
          setCompanyName("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Who are you adding?</DialogTitle>
          <DialogDescription>Choose creation intent before the contact journey.</DialogDescription>
        </DialogHeader>

        <div className="border-b border-violet-500/20 bg-gradient-to-br from-violet-50/90 via-background to-background p-4 dark:from-violet-950/40">
          <div className="flex gap-3">
            <ChanakyaAvatar size="md" />
            <div className="min-w-0 space-y-1">
              <ChanakyaIdentityLabel surface="guided_journey" />
              <p className="text-sm font-semibold tracking-tight">
                Hi {firstName}.
              </p>
              <p className="text-sm leading-relaxed text-foreground/85">
                Tell me who you&apos;re adding today, and I&apos;ll prepare the right journey for you.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            {CHOICES.map((choice) => {
              const Icon = choice.icon;
              const selected = kind === choice.kind;
              return (
                <button
                  key={choice.kind}
                  type="button"
                  onClick={() => setKind(choice.kind)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                    selected
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      selected ? "border-violet-500 bg-violet-600" : "border-muted-foreground/40",
                    )}
                  >
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{choice.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {choice.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {showIndividual && (
            <div className="space-y-1.5">
              <Label htmlFor="intent-individual-name">Individual Name</Label>
              <Input
                id="intent-individual-name"
                value={individualName}
                onChange={(e) => setIndividualName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                autoFocus
              />
            </div>
          )}

          {showCompany && (
            <div className="space-y-1.5">
              <Label htmlFor="intent-company-name">Company Name</Label>
              <Input
                id="intent-company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Homes Pvt Ltd"
                autoFocus={!showIndividual}
              />
            </div>
          )}

          <Button
            type="button"
            className="h-10 w-full rounded-xl"
            disabled={!canContinue}
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
