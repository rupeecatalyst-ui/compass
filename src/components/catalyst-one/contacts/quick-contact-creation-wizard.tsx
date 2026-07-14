"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import {
  getEcmQuickCreateEmploymentOptions,
  getEnabledEcmRoleMaster,
  getEcmRoleLabel,
  type EcmQuickCreateEmploymentId,
} from "@/constants/enterprise-contact-master";
import { getUgjJourneyDefinition } from "@/constants/universal-guided-journey";
import {
  autosaveUgjSession,
  clearUgjSession,
  createUgjSession,
  getAdjacentUgjStep,
  getUgjProgress,
  shouldAutoSaveUgjStep,
} from "@/lib/universal-guided-journey";
import {
  findEcmContactByMobile,
  normalizeEcmMobile,
  normalizePersonName,
  registerEcmContact,
} from "@/lib/enterprise-contact-master";
import type { EcmContact, EcmContactRole } from "@/types/enterprise-contact-master";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/components/providers/auth-provider";
import { useChanakyaGreeting } from "@/hooks/use-chanakya-greeting";
import { UgjShell } from "@/components/catalyst-one/universal-guided-journey";
import type { ContactCreationIntentResult } from "@/components/catalyst-one/contacts/contact-creation-intent-screen";

interface QuickContactCreationWizardProps {
  open: boolean;
  actorId?: string;
  ownerName?: string;
  /** Permission to force-create when mobile already exists */
  canContinueDespiteDuplicate?: boolean;
  /** Prompt 011 — pre-workflow intent (does not redesign the journey). */
  creationIntent?: ContactCreationIntentResult;
  /** Pre-filled name from intent screen. */
  initialName?: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (contact: EcmContact) => void;
  onOpenExisting: (contact: EcmContact) => void;
}

type WizardStep = "name" | "mobile" | "employment" | "email" | "roles" | "create";

function isValidMobile(digits: string) {
  return digits.length >= 10 && digits.length <= 15;
}

function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * CF-CHANAKYA-008 — Contact Creation is the live UGJ reference implementation.
 * Same conversational contract every business journey will follow.
 */
export function QuickContactCreationWizard({
  open,
  actorId = "ui",
  ownerName = "Platform Admin",
  canContinueDespiteDuplicate = false,
  creationIntent,
  initialName,
  onOpenChange,
  onCreated,
  onOpenExisting,
}: QuickContactCreationWizardProps) {
  const journey = getUgjJourneyDefinition("contact_creation")!;
  const { user } = useAuthContext();
  const firstName = user?.firstName?.trim() || "there";

  const [step, setStep] = useState<WizardStep>("name");
  const [sessionId, setSessionId] = useState<string | null>(null);
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
  const progress = getUgjProgress(journey, step)!;

  const greeting = useChanakyaGreeting({
    context: "guidance",
    firstName,
    enabled: open,
    surfaceKey: open ? `ugj:contact:${step}` : "ugj:idle",
  });

  const answers = useMemo(
    () => ({
      name,
      mobile,
      employmentType: employmentType || null,
      email: email || null,
      roles,
    }),
    [name, mobile, employmentType, email, roles],
  );

  const reset = () => {
    if (sessionId) clearUgjSession(sessionId);
    setStep("name");
    setSessionId(null);
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
    if (!open) {
      reset();
      return;
    }
    const session = createUgjSession({
      journeyCode: "contact_creation",
      firstStepId: "name",
    });
    setSessionId(session.sessionId);
    if (initialName?.trim()) {
      setName(normalizePersonName(initialName) || initialName.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialName, creationIntent?.kind]);

  const persistStep = (nextStep: WizardStep, nextAnswers = answers) => {
    const stepDef = journey.steps.find((s) => s.id === step);
    if (sessionId && stepDef && shouldAutoSaveUgjStep(journey, stepDef)) {
      autosaveUgjSession({
        sessionId,
        currentStepId: nextStep,
        answers: nextAnswers,
      });
    }
  };

  const go = (next: WizardStep) => {
    persistStep(next);
    setError(null);
    setAnimKey((k) => k + 1);
    setStep(next);
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

      const intentProfile =
        creationIntent != null
          ? {
              creation_intent: creationIntent.kind,
              ...(creationIntent.companyName
                ? { linked_company_name: creationIntent.companyName }
                : {}),
              ...(creationIntent.individualName
                ? { individual_name: creationIntent.individualName }
                : {}),
            }
          : null;

      const created = registerEcmContact({
        name: normalizedName,
        mobilePrimary: digits,
        personalEmail: email.trim() || undefined,
        employmentType: employmentType || undefined,
        roles,
        roleProfiles: {
          ...roleProfiles,
          ...(intentProfile
            ? {
                customer: {
                  ...(roleProfiles.customer ?? {}),
                  ...intentProfile,
                },
              }
            : {}),
        },
        ownerName,
        createdBy: actorId,
      });

      if (sessionId) {
        autosaveUgjSession({
          sessionId,
          currentStepId: "create",
          answers,
          completed: true,
        });
        clearUgjSession(sessionId);
      }
      // Conversation complete → transition into Contact Workspace
      onCreated(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create contact.");
      setCreating(false);
    }
  };

  const footerActions = (
    <>
      {step === "name" && (
        <Button type="button" size="sm" className="h-8 gap-1.5 rounded-lg px-4" onClick={handleNameNext}>
          Continue
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
      {step === "mobile" && !duplicate && (
        <Button type="button" size="sm" className="h-8 gap-1.5 rounded-lg px-4" onClick={handleMobileNext}>
          Continue
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
      {step === "employment" && (
        <Button type="button" size="sm" className="h-8 gap-1.5 rounded-lg px-4" onClick={handleEmploymentNext}>
          Continue
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
      {step === "email" && (
        <>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg"
            onClick={() => handleEmailNext(true)}
          >
            Skip
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 rounded-lg px-4"
            onClick={() => handleEmailNext(false)}
          >
            Continue
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      {step === "roles" && (
        <Button type="button" size="sm" className="h-8 gap-1.5 rounded-lg px-4" onClick={handleRolesNext}>
          Continue
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
      {step === "create" && (
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5 rounded-lg px-4"
          disabled={creating}
          onClick={handleCreate}
        >
          {creating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              Create Contact
            </>
          )}
        </Button>
      )}
    </>
  );

  return (
    <UgjShell
      open={open}
      onOpenChange={onOpenChange}
      journey={journey}
      progress={progress}
      greeting={greeting.text}
      animKey={animKey}
      error={error}
      busy={creating}
      onBack={() => {
        const prev = getAdjacentUgjStep(journey, step, "prev");
        if (prev) go(prev.id as WizardStep);
      }}
      footerActions={footerActions}
    >
      {step === "name" && (
        <>
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
        </>
      )}

      {step === "mobile" && (
        <>
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
        </>
      )}

      {step === "employment" && (
        <div className="flex flex-wrap gap-2">
          {getEcmQuickCreateEmploymentOptions().map((opt) => {
            const selected = employmentType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setEmploymentType(opt.id as EcmQuickCreateEmploymentId)}
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
      )}

      {step === "email" && (
        <Input
          autoFocus
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleEmailNext(false)}
          placeholder="name@example.com"
          className="h-12 rounded-2xl border-border/70 bg-white/80 text-base shadow-sm dark:bg-zinc-900/60"
        />
      )}

      {step === "roles" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-white/70 p-3 dark:bg-zinc-900/40">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Available Roles
            </p>
            <div className="mt-2 flex max-h-24 min-h-[64px] flex-wrap content-start gap-1.5 overflow-y-auto">
              {roleMaster
                .filter((role) => !roles.includes(role.code))
                .map((role) => (
                  <button
                    key={role.code}
                    type="button"
                    onClick={() =>
                      setRoles((prev) => (prev.includes(role.code) ? prev : [...prev, role.code]))
                    }
                    className="animate-in fade-in-0 zoom-in-95 rounded-full border border-border/70 bg-white px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm transition-all hover:border-teal-400 hover:bg-teal-50/70 dark:bg-zinc-900 dark:hover:bg-teal-950/40"
                  >
                    {role.label}
                  </button>
                ))}
              {roleMaster.every((role) => roles.includes(role.code)) && (
                <p className="text-xs text-muted-foreground">All roles assigned</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-teal-200/70 bg-teal-50/50 p-3 dark:border-teal-900 dark:bg-teal-950/30">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800 dark:text-teal-200">
              Assigned Roles
            </p>
            <div className="mt-2 flex max-h-14 min-h-[40px] flex-wrap content-start gap-1 overflow-y-auto">
              {roles.map((roleCode) => (
                <button
                  key={roleCode}
                  type="button"
                  onClick={() => setRoles((prev) => prev.filter((r) => r !== roleCode))}
                  className="inline-flex animate-in fade-in-0 zoom-in-95 items-center gap-1 rounded-full border border-teal-500 bg-teal-600 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm transition-all hover:bg-teal-700"
                  title="Click to remove"
                >
                  <Check className="h-2.5 w-2.5" />
                  {getEcmRoleLabel(roleCode)}
                </button>
              ))}
              {roles.length === 0 && (
                <p className="text-xs text-muted-foreground">Click a role on the left to assign</p>
              )}
            </div>
          </div>
        </div>
      )}

      {step === "create" && (
        <>
          <div className="space-y-3 rounded-2xl border border-border/60 bg-white/80 p-5 dark:bg-zinc-900/50">
            <SummaryRow label="Name" value={normalizePersonName(name)} />
            <SummaryRow label="Mobile" value={normalizeEcmMobile(mobile)} />
            <SummaryRow
              label="Employment"
              value={
                getEcmQuickCreateEmploymentOptions().find((o) => o.id === employmentType)?.label ??
                "—"
              }
            />
            <SummaryRow label="Email" value={email.trim() || "Skipped"} />
            <SummaryRow label="Roles" value={roles.map(getEcmRoleLabel).join(", ") || "—"} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Conversation complete. You will continue in {journey.workspaceTargetLabel} — no re-entry
            of these details.
          </p>
        </>
      )}
    </UgjShell>
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
