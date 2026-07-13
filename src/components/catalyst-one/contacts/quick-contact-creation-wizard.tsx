"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import {
  ECM_QUICK_CREATE_EMPLOYMENT_OPTIONS,
  ECM_QUICK_CREATE_STEPS,
  getEnabledEcmRoleMaster,
  getEcmRoleLabel,
  type EcmQuickCreateEmploymentId,
} from "@/constants/enterprise-contact-master";
import {
  findEcmContactByMobile,
  normalizeEcmMobile,
  normalizePersonName,
  registerEcmContact,
} from "@/lib/enterprise-contact-master";
import type { EcmContact, EcmContactRole } from "@/types/enterprise-contact-master";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface QuickContactCreationWizardProps {
  open: boolean;
  actorId?: string;
  ownerName?: string;
  /** Permission to force-create when mobile already exists */
  canContinueDespiteDuplicate?: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (contact: EcmContact) => void;
  onOpenExisting: (contact: EcmContact) => void;
}

type WizardStep = (typeof ECM_QUICK_CREATE_STEPS)[number]["id"];

function isValidMobile(digits: string) {
  return digits.length >= 10 && digits.length <= 15;
}

function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function QuickContactCreationWizard({
  open,
  actorId = "ui",
  ownerName = "Platform Admin",
  canContinueDespiteDuplicate = false,
  onOpenChange,
  onCreated,
  onOpenExisting,
}: QuickContactCreationWizardProps) {
  const [step, setStep] = useState<WizardStep>("name");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [employmentType, setEmploymentType] = useState<EcmQuickCreateEmploymentId | "">("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<EcmContactRole[]>([]);
  const [duplicate, setDuplicate] = useState<EcmContact | null>(null);
  const [forceDespiteDuplicate, setForceDespiteDuplicate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const roleMaster = useMemo(() => getEnabledEcmRoleMaster(), []);
  const stepIndex = ECM_QUICK_CREATE_STEPS.findIndex((s) => s.id === step);

  const reset = () => {
    setStep("name");
    setName("");
    setMobile("");
    setEmploymentType("");
    setEmail("");
    setRoles([]);
    setDuplicate(null);
    setForceDespiteDuplicate(false);
    setError(null);
    setCreating(false);
    setAnimKey(0);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const go = (next: WizardStep) => {
    setError(null);
    setAnimKey((k) => k + 1);
    setStep(next);
  };

  const toggleRole = (role: EcmContactRole) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleNameNext = () => {
    const normalized = normalizePersonName(name);
    if (!normalized) {
      setError("Please enter the contact's full name.");
      return;
    }
    setName(normalized);
    go("mobile");
  };

  const handleMobileNext = () => {
    const digits = normalizeEcmMobile(mobile);
    if (!isValidMobile(digits)) {
      setError("Enter a valid primary mobile number (10–15 digits).");
      return;
    }
    setMobile(digits);
    const existing = findEcmContactByMobile(digits);
    if (existing && !forceDespiteDuplicate) {
      setDuplicate(existing);
      setError(null);
      return;
    }
    setDuplicate(null);
    go("employment");
  };

  const handleEmploymentNext = () => {
    if (!employmentType) {
      setError("Select an employment type to continue.");
      return;
    }
    go("email");
  };

  const handleEmailNext = (skip: boolean) => {
    if (!skip && email.trim() && !isValidEmail(email)) {
      setError("Enter a valid email address, or skip this step.");
      return;
    }
    if (skip) setEmail("");
    go("roles");
  };

  const handleRolesNext = () => {
    if (roles.length === 0) {
      setError("Select at least one role.");
      return;
    }
    go("create");
  };

  const handleCreate = () => {
    setCreating(true);
    setError(null);
    try {
      const normalizedName = normalizePersonName(name);
      const digits = normalizeEcmMobile(mobile);
      const roleProfiles: Partial<Record<EcmContactRole, Record<string, string>>> = {};
      if (roles.includes("customer") && employmentType) {
        roleProfiles.customer = { employmentType };
      }

      const created = registerEcmContact({
        name: normalizedName,
        mobilePrimary: digits,
        personalEmail: email.trim() || undefined,
        employmentType: employmentType || undefined,
        roles,
        roleProfiles: Object.keys(roleProfiles).length > 0 ? roleProfiles : undefined,
        ownerName,
        createdBy: actorId,
      });

      onCreated(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create contact.");
      setCreating(false);
    }
  };

  const progressPct = Math.round(((stepIndex + 1) / ECM_QUICK_CREATE_STEPS.length) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(560px,92vw)] max-w-[560px] overflow-hidden border-border/70 p-0 sm:rounded-3xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-teal-50/40 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/20">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-500/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-sky-200/25 blur-3xl dark:bg-sky-500/10" />

          <div className="relative space-y-6 px-8 pb-8 pt-8">
            <div className="pr-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700/80 dark:text-teal-300/80">
                Quick Contact Creation
              </p>
              <DialogTitle className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                Create a contact in under 30 seconds
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
                One question at a time. Then continue into Contact Workspace.
              </DialogDescription>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Step {stepIndex + 1} of {ECM_QUICK_CREATE_STEPS.length}
                </span>
                <span className="font-medium text-foreground">{progressPct}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted/80">
                <div
                  className="h-full rounded-full bg-teal-600 transition-all duration-500 ease-out dark:bg-teal-400"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-3 flex gap-1.5">
                {ECM_QUICK_CREATE_STEPS.map((s, idx) => (
                  <div
                    key={s.id}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors duration-300",
                      idx <= stepIndex ? "bg-teal-600/80 dark:bg-teal-400/80" : "bg-muted",
                    )}
                  />
                ))}
              </div>
            </div>

            <div
              key={animKey}
              className="min-h-[220px] animate-in fade-in-0 slide-in-from-right-2 duration-300"
            >
              {step === "name" && (
                <StepShell question="What is the contact's full name?">
                  <Input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNameNext()}
                    placeholder="e.g. Rahul Kapoor"
                    className="h-12 rounded-2xl border-border/70 bg-white/80 text-base shadow-sm dark:bg-zinc-900/60"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Formatting is normalized automatically before save.
                  </p>
                </StepShell>
              )}

              {step === "mobile" && (
                <StepShell question="What is the primary mobile number?">
                  <Input
                    autoFocus
                    inputMode="tel"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value);
                      setDuplicate(null);
                      setForceDespiteDuplicate(false);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleMobileNext()}
                    placeholder="10-digit mobile"
                    className="h-12 rounded-2xl border-border/70 bg-white/80 text-base shadow-sm dark:bg-zinc-900/60"
                  />
                  {duplicate && (
                    <div className="mt-4 space-y-3 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 dark:border-amber-900 dark:bg-amber-950/40">
                      <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                        This contact already exists.
                      </p>
                      <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
                        {duplicate.name} · {duplicate.mobilePrimary}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="rounded-xl"
                          onClick={() => {
                            onOpenChange(false);
                            onOpenExisting(duplicate);
                          }}
                        >
                          Open Existing Contact
                        </Button>
                        {canContinueDespiteDuplicate && (
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              setForceDespiteDuplicate(true);
                              setDuplicate(null);
                              go("employment");
                            }}
                          >
                            Continue Anyway
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </StepShell>
              )}

              {step === "employment" && (
                <StepShell question="What is their employment type?">
                  <div className="flex flex-wrap gap-2">
                    {ECM_QUICK_CREATE_EMPLOYMENT_OPTIONS.map((opt) => {
                      const selected = employmentType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setEmploymentType(opt.id)}
                          className={cn(
                            "rounded-2xl border px-4 py-3 text-sm font-medium transition-all",
                            selected
                              ? "border-teal-500 bg-teal-600 text-white shadow-md shadow-teal-600/20"
                              : "border-border/70 bg-white/80 text-foreground hover:border-teal-300 hover:bg-teal-50/60 dark:bg-zinc-900/50 dark:hover:bg-teal-950/30",
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </StepShell>
              )}

              {step === "email" && (
                <StepShell question="What is their email address?" optional>
                  <Input
                    autoFocus
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailNext(false)}
                    placeholder="name@example.com"
                    className="h-12 rounded-2xl border-border/70 bg-white/80 text-base shadow-sm dark:bg-zinc-900/60"
                  />
                </StepShell>
              )}

              {step === "roles" && (
                <StepShell question="Which roles apply to this contact?">
                  <div className="flex flex-wrap gap-2">
                    {roleMaster.map((role) => {
                      const selected = roles.includes(role.code);
                      return (
                        <button
                          key={role.code}
                          type="button"
                          onClick={() => toggleRole(role.code)}
                          className={cn(
                            "rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all",
                            selected
                              ? "border-teal-500 bg-teal-600 text-white shadow-md shadow-teal-600/20"
                              : "border-border/70 bg-white/80 text-foreground hover:border-teal-300 hover:bg-teal-50/60 dark:bg-zinc-900/50",
                          )}
                        >
                          {role.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-5 rounded-2xl border border-border/60 bg-white/70 p-4 dark:bg-zinc-900/40">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Selected Roles
                    </p>
                    {roles.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">None selected yet</p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {roles.map((role) => (
                          <li key={role} className="flex items-center gap-2 text-sm font-medium">
                            <Check className="h-4 w-4 text-teal-600" />
                            {getEcmRoleLabel(role)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </StepShell>
              )}

              {step === "create" && (
                <StepShell question="Ready to create this contact?">
                  <div className="space-y-3 rounded-2xl border border-border/60 bg-white/80 p-5 dark:bg-zinc-900/50">
                    <SummaryRow label="Name" value={normalizePersonName(name)} />
                    <SummaryRow label="Mobile" value={normalizeEcmMobile(mobile)} />
                    <SummaryRow
                      label="Employment"
                      value={
                        ECM_QUICK_CREATE_EMPLOYMENT_OPTIONS.find((o) => o.id === employmentType)
                          ?.label ?? "—"
                      }
                    />
                    <SummaryRow label="Email" value={email.trim() || "Skipped"} />
                    <SummaryRow
                      label="Roles"
                      value={roles.map(getEcmRoleLabel).join(", ") || "—"}
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Contact ID will be generated on create. You will continue in Contact Workspace —
                    no re-entry of these details.
                  </p>
                </StepShell>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-5">
              <Button
                type="button"
                variant="ghost"
                className="gap-2 rounded-xl"
                disabled={step === "name" || creating}
                onClick={() => {
                  const prev = ECM_QUICK_CREATE_STEPS[Math.max(0, stepIndex - 1)];
                  if (prev) go(prev.id);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <div className="flex flex-wrap gap-2">
                {step === "name" && (
                  <Button type="button" className="gap-2 rounded-xl px-5" onClick={handleNameNext}>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {step === "mobile" && !duplicate && (
                  <Button type="button" className="gap-2 rounded-xl px-5" onClick={handleMobileNext}>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {step === "employment" && (
                  <Button
                    type="button"
                    className="gap-2 rounded-xl px-5"
                    onClick={handleEmploymentNext}
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {step === "email" && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => handleEmailNext(true)}
                    >
                      Skip
                    </Button>
                    <Button
                      type="button"
                      className="gap-2 rounded-xl px-5"
                      onClick={() => handleEmailNext(false)}
                    >
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {step === "roles" && (
                  <Button type="button" className="gap-2 rounded-xl px-5" onClick={handleRolesNext}>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {step === "create" && (
                  <Button
                    type="button"
                    className="gap-2 rounded-xl px-5"
                    disabled={creating}
                    onClick={handleCreate}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating…
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Create Contact
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepShell({
  question,
  optional,
  children,
}: {
  question: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-foreground">{question}</h3>
        {optional && (
          <p className="mt-1 text-sm text-muted-foreground">Optional — you can skip this step.</p>
        )}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
