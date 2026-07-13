"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Sparkles,
} from "lucide-react";
import {
  getEcmMasterLabel,
  getEcmMasterOption,
  getEcmRoleDefinition,
  getVisibleMirFields,
  getVisibleOptionalFields,
  getEcmRoleWorkspaceTemplate,
  isEcmRoleMirComplete,
  listEcmMasterOptions,
  type EcmBusinessActionId,
  type EcmConfigurableField,
  type EcmMasterOption,
} from "@/constants/enterprise-contact-master";
import {
  archiveEcmContact,
  buildEcmWorkspaceTabs,
  getEcmContactAssignedRoles,
  registerEcmContact,
  updateEcmContact,
} from "@/lib/enterprise-contact-master";
import type { EcmWorkspaceTab } from "@/lib/enterprise-contact-master";
import { createLoanFileFromInput } from "@/lib/loan-files-utils";
import { loadLoanFiles, saveLoanFiles } from "@/lib/loan-files-storage";
import { ROUTES } from "@/constants/routes";
import type { EcmContact, EcmContactRole } from "@/types/enterprise-contact-master";
import type { CreateLoanFileInput } from "@/types/catalyst-one";
import { ContactRoleChips } from "@/components/catalyst-one/contacts/contact-role-chips";
import { EcmMasterSelect } from "@/components/catalyst-one/contacts/ecm-master-select";
import {
  LoanCreateFormDialog,
  type LoanCreateSubmitMeta,
} from "@/components/catalyst-one/loan-files/loan-create-form-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ContactWorkspaceMode = "create" | "edit";

interface ContactWorkspaceModalProps {
  open: boolean;
  mode: ContactWorkspaceMode;
  contact: EcmContact | null;
  actorId?: string;
  initialTab?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (contact: EcmContact) => void;
}

function formatTs(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function masterDisplay(domain: Parameters<typeof getEcmMasterLabel>[0], id?: string) {
  if (!id) return "—";
  return getEcmMasterLabel(domain, id) || id;
}

function IdentitySummaryCard({ contact }: { contact: EcmContact }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-slate-50 to-white p-4 dark:from-zinc-900 dark:to-zinc-950">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Who is this person?
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Name</p>
          <p className="text-sm font-medium">{contact.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Primary mobile</p>
          <p className="text-sm font-medium">{contact.mobilePrimary}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-sm font-medium">
            {contact.personalEmail || contact.officialEmail || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Location</p>
          <p className="text-sm font-medium">
            {[masterDisplay("city", contact.city), masterDisplay("state", contact.state)]
              .filter((v) => v !== "—")
              .join(", ") || "—"}
          </p>
        </div>
      </div>
      {(contact.pan || contact.aadhaar || contact.dateOfBirth) && (
        <div className="mt-3 grid gap-3 border-t border-border/50 pt-3 sm:grid-cols-3">
          {contact.pan && (
            <div>
              <p className="text-xs text-muted-foreground">PAN</p>
              <p className="text-sm font-medium">{contact.pan}</p>
            </div>
          )}
          {contact.aadhaar && (
            <div>
              <p className="text-xs text-muted-foreground">Aadhaar</p>
              <p className="text-sm font-medium">{contact.aadhaar}</p>
            </div>
          )}
          {contact.dateOfBirth && (
            <div>
              <p className="text-xs text-muted-foreground">DOB</p>
              <p className="text-sm font-medium">{contact.dateOfBirth}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
  badge,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm shadow-black/[0.02]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

function MirStatusBadge({ complete }: { complete: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        complete
          ? "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200"
          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
      )}
    >
      {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
      {complete ? "MIR complete" : "MIR incomplete"}
    </span>
  );
}

function RoleFieldControl({
  field,
  value,
  parentValue,
  onChange,
}: {
  field: EcmConfigurableField;
  value: string;
  parentValue?: string;
  onChange: (next: string, option?: EcmMasterOption) => void;
}) {
  if (field.control === "master" && field.masterDomain) {
    return (
      <EcmMasterSelect
        domain={field.masterDomain}
        value={value}
        parentId={field.parentFieldKey ? parentValue : undefined}
        placeholder={field.placeholder ?? `Select ${field.label}`}
        onChange={(id, option) => onChange(id, option)}
      />
    );
  }
  if (field.control === "textarea") {
    return (
      <textarea
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    );
  }
  return (
    <Input
      type={field.control === "number" ? "number" : "text"}
      value={value}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-xl"
    />
  );
}

export function ContactWorkspaceModal({
  open,
  mode,
  contact,
  actorId = "ui",
  initialTab = "identity",
  onOpenChange,
  onSaved,
}: ContactWorkspaceModalProps) {
  const router = useRouter();
  const [draftSaved, setDraftSaved] = useState<EcmContact | null>(null);
  const active = draftSaved ?? contact;
  const awaitingFirstSave = !active;

  const [name, setName] = useState("");
  const [mobilePrimary, setMobilePrimary] = useState("");
  const [mobileSecondary, setMobileSecondary] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("IN");
  const [address, setAddress] = useState("");
  const [pan, setPan] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [roles, setRoles] = useState<EcmContactRole[]>(["customer"]);
  const [roleProfiles, setRoleProfiles] = useState<
    Partial<Record<EcmContactRole, Record<string, string>>>
  >({});
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(initialTab);
  const [saving, setSaving] = useState(false);
  const [showIdentityAdditional, setShowIdentityAdditional] = useState(false);
  const [showRoleAdditional, setShowRoleAdditional] = useState(false);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const wasOpenRef = useRef(false);
  const hydratedIdRef = useRef<string | null>(null);

  const identityPayload = () => ({
    name,
    mobilePrimary,
    mobileSecondary: mobileSecondary || undefined,
    personalEmail: personalEmail || undefined,
    officialEmail: officialEmail || undefined,
    city: city || undefined,
    state: state || undefined,
    country: country || undefined,
    address: address || undefined,
    pan: pan || undefined,
    aadhaar: aadhaar || undefined,
    dateOfBirth: dateOfBirth || undefined,
    roles,
  });

  const hydrateFromContact = (source: EcmContact) => {
    setDraftSaved(source);
    setName(source.name);
    setMobilePrimary(source.mobilePrimary);
    setMobileSecondary(source.mobileSecondary ?? "");
    setPersonalEmail(source.personalEmail ?? "");
    setOfficialEmail(source.officialEmail ?? "");
    setCity(source.city ?? "");
    setState(source.state ?? "");
    setCountry(source.country ?? "IN");
    setAddress(source.address ?? "");
    setPan(source.pan ?? "");
    setAadhaar(source.aadhaar ?? "");
    setDateOfBirth(source.dateOfBirth ?? "");
    setRoles(getEcmContactAssignedRoles(source));
    setRoleProfiles(source.roleProfiles ?? {});
    hydratedIdRef.current = source.id;
  };

  const resetBlankCreate = () => {
    setDraftSaved(null);
    setName("");
    setMobilePrimary("");
    setMobileSecondary("");
    setPersonalEmail("");
    setOfficialEmail("");
    setCity("");
    setState("");
    setCountry("IN");
    setAddress("");
    setPan("");
    setAadhaar("");
    setDateOfBirth("");
    setRoles(["customer"]);
    setRoleProfiles({});
    setCompletedSteps(new Set());
    setShowIdentityAdditional(false);
    setShowRoleAdditional(false);
    setActionNotice(null);
    hydratedIdRef.current = null;
  };

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    const justClosed = !open && wasOpenRef.current;
    wasOpenRef.current = open;

    if (justClosed) {
      resetBlankCreate();
      setError(null);
      setTab("identity");
      setLoanDialogOpen(false);
      return;
    }

    if (!open) return;

    if (justOpened) {
      setError(null);
      if (contact) {
        hydrateFromContact(contact);
        setCompletedSteps(new Set(["identity"]));
        setTab(initialTab || "identity");
      } else {
        resetBlankCreate();
        setTab("identity");
      }
      return;
    }

    if (contact && hydratedIdRef.current !== contact.id) {
      hydrateFromContact(contact);
      setCompletedSteps((prev) => new Set([...prev, "identity"]));
    }
  }, [open, contact, initialTab, mode]);

  const workspaceTabs = useMemo(
    () => buildEcmWorkspaceTabs(active ? getEcmContactAssignedRoles(active) : roles),
    [active, roles],
  );

  const stepIndex = Math.max(
    0,
    workspaceTabs.findIndex((t) => t.id === tab),
  );
  const currentStep = workspaceTabs[stepIndex];
  const progressPct =
    workspaceTabs.length === 0
      ? 0
      : Math.round(((completedSteps.size || (active ? 1 : 0)) / workspaceTabs.length) * 100);

  const toggleRole = (role: EcmContactRole) => {
    setRoles((prev) => {
      if (prev.includes(role)) {
        if (prev.length === 1) return prev;
        return prev.filter((r) => r !== role);
      }
      return [...prev, role];
    });
  };

  const markComplete = (stepId: string) => {
    setCompletedSteps((prev) => new Set([...prev, stepId]));
  };

  const goToStep = (stepId: string) => {
    setShowRoleAdditional(false);
    setActionNotice(null);
    setTab(stepId);
  };

  const goNext = () => {
    const next = workspaceTabs[stepIndex + 1];
    if (next) goToStep(next.id);
  };

  const goPrev = () => {
    const prev = workspaceTabs[stepIndex - 1];
    if (prev) goToStep(prev.id);
  };

  const saveIdentity = (thenNext: boolean) => {
    setError(null);
    setSaving(true);
    try {
      if (awaitingFirstSave) {
        const created = registerEcmContact({
          ...identityPayload(),
          ownerName: "Platform Admin",
          createdBy: actorId,
        });
        hydrateFromContact(created);
        markComplete("identity");
        onSaved(created);
        if (thenNext) {
          const tabs = buildEcmWorkspaceTabs(created.roles);
          const firstRole = tabs.find((t) => t.kind === "role");
          if (firstRole) goToStep(firstRole.id);
          else setTab("identity");
        } else {
          setTab("identity");
        }
      } else if (active) {
        const updated = updateEcmContact(
          active.id,
          {
            ...identityPayload(),
            roleProfiles,
          },
          actorId,
        );
        hydrateFromContact(updated);
        onSaved(updated);
        markComplete("identity");
        if (thenNext) goNext();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  const saveRoleStep = (roleCode: EcmContactRole, thenNext: boolean) => {
    if (!active) return;
    setSaving(true);
    setError(null);
    try {
      const updated = updateEcmContact(active.id, { roleProfiles }, actorId);
      hydrateFromContact(updated);
      onSaved(updated);
      const def = getEcmRoleDefinition(roleCode);
      if (def) markComplete(def.workspaceTabId);
      if (thenNext) goNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save role details");
    } finally {
      setSaving(false);
    }
  };

  const setRoleField = (
    role: EcmContactRole,
    key: string,
    value: string,
    option?: EcmMasterOption,
    inheritMetaKeys?: string[],
  ) => {
    setRoleProfiles((prev) => {
      const current = { ...(prev[role] ?? {}), [key]: value };
      if (option?.meta && inheritMetaKeys?.length) {
        for (const metaKey of inheritMetaKeys) {
          const metaVal = option.meta[metaKey];
          if (!metaVal) continue;
          if (metaKey === "city") {
            const byId = getEcmMasterOption("city", metaVal.toLowerCase());
            const byLabel = listEcmMasterOptions("city").find(
              (o) => o.label.toLowerCase() === metaVal.toLowerCase(),
            );
            current.city = byId?.id ?? byLabel?.id ?? metaVal;
          } else {
            current[metaKey] = metaVal;
          }
        }
      }
      return { ...prev, [role]: current };
    });
  };

  const ensureRoleDefaults = (roleCode: EcmContactRole) => {
    const values = roleProfiles[roleCode] ?? {};
    const next = { ...values };
    let changed = false;
    if (roleCode === "lender_employee") {
      if (!next.officialMobile && mobilePrimary) {
        next.officialMobile = mobilePrimary;
        changed = true;
      }
      if (!next.officialEmail && (officialEmail || personalEmail)) {
        next.officialEmail = officialEmail || personalEmail;
        changed = true;
      }
      if (!next.city && city) {
        next.city = city;
        changed = true;
      }
    }
    if (roleCode === "customer") {
      if (!next.city && city) {
        next.city = city;
        changed = true;
      }
      if (!next.employmentType && active?.employmentType) {
        next.employmentType = active.employmentType;
        changed = true;
      }
    }
    if (changed) {
      setRoleProfiles((prev) => ({ ...prev, [roleCode]: next }));
    }
  };

  useEffect(() => {
    if (currentStep?.kind === "role" && currentStep.roleCode) {
      ensureRoleDefaults(currentStep.roleCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once when stepping into a role
  }, [currentStep?.id, active?.id]);

  const buildLoanPrefill = (source: EcmContact) => {
    const profile = source.roleProfiles?.customer ?? {};
    const employmentLabel =
      getEcmMasterLabel("employment_type", profile.employmentType) ||
      profile.employmentType ||
      "Salaried";
    const cityLabel = getEcmMasterLabel("city", source.city || profile.city) || source.city || profile.city || "Mumbai";
    const stateLabel =
      getEcmMasterLabel("state", source.state) ||
      getEcmMasterOption("city", source.city || profile.city)?.meta?.state ||
      source.state ||
      "Maharashtra";
    const rmLabel =
      getEcmMasterLabel("relationship_manager", profile.relationshipManager) ||
      source.ownerName ||
      undefined;

    return {
      id: source.id,
      name: source.name,
      mobile: source.mobilePrimary,
      email: source.personalEmail || source.officialEmail || `${source.mobilePrimary}@contact.local`,
      city: cityLabel,
      state: stateLabel,
      employmentType: employmentLabel,
      relationshipManager: rmLabel,
    };
  };

  const handleBusinessAction = (actionId: EcmBusinessActionId, href?: string) => {
    setActionNotice(null);
    if (actionId === "start_loan_journey") {
      setLoanDialogOpen(true);
      return;
    }
    if (href) {
      onOpenChange(false);
      router.push(href);
      return;
    }
    const messages: Partial<Record<EcmBusinessActionId, string>> = {
      start_investment: "Investment journey workspace will open from this contact once Investment Engine is certified.",
      create_referral: "Referral capture is queued — partner MIR is ready for the next journey step.",
      add_project: "Project registration will continue from Builder MIR on the Projects journey.",
      link_lender: "Opening lender relationship management…",
      create_user_account: "User provisioning can continue from System Administration with this Contact SSOT.",
      manage_ca_engagement: "CA engagement continues from this Contact identity.",
    };
    setActionNotice(messages[actionId] ?? "Next business step recorded.");
  };

  const handleLoanCreated = (input: CreateLoanFileInput, _meta?: LoanCreateSubmitMeta) => {
    const existing = loadLoanFiles();
    const created = createLoanFileFromInput(input, existing);
    saveLoanFiles([...existing, created]);
    setLoanDialogOpen(false);
    onOpenChange(false);
    router.push(`${ROUTES.LOAN_FILES}?file=${created.id}`);
  };

  const footerActions = (opts: {
    onSave: () => void;
    onSaveNext?: () => void;
    showFinish?: boolean;
  }) => {
    const isLast = stepIndex >= workspaceTabs.length - 1;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-slate-50/80 px-6 py-4 dark:bg-zinc-900/50">
        <Button
          type="button"
          variant="ghost"
          className="gap-2"
          disabled={stepIndex <= 0 && Boolean(active)}
          onClick={() => {
            if (!active) onOpenChange(false);
            else goPrev();
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          {active ? "Previous" : "Cancel"}
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={opts.onSave} disabled={saving}>
            Save
          </Button>
          {!isLast && opts.onSaveNext && (
            <Button type="button" className="gap-2" onClick={opts.onSaveNext} disabled={saving}>
              Save & Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {(isLast || opts.showFinish) && (
            <Button
              type="button"
              className="gap-2"
              onClick={() => {
                opts.onSave();
                onOpenChange(false);
              }}
              disabled={saving}
            >
              <Check className="h-4 w-4" />
              Finish
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderFieldGrid = (
    fields: EcmConfigurableField[],
    roleCode: EcmContactRole,
    values: Record<string, string>,
  ) => (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.key}
          className={cn("space-y-2", field.control === "textarea" && "md:col-span-2")}
        >
          <Label className="text-xs font-medium text-muted-foreground">
            {field.label}
            {field.mandatory && <span className="text-destructive"> *</span>}
          </Label>
          <RoleFieldControl
            field={field}
            value={values[field.key] ?? ""}
            parentValue={field.parentFieldKey ? values[field.parentFieldKey] : undefined}
            onChange={(next, option) =>
              setRoleField(roleCode, field.key, next, option, field.inheritMetaKeys)
            }
          />
          {field.helpText && <p className="text-[11px] text-muted-foreground">{field.helpText}</p>}
        </div>
      ))}
    </div>
  );

  const renderRolePanel = (step: EcmWorkspaceTab) => {
    if (!active || !step.roleCode) return null;
    const def = getEcmRoleDefinition(step.roleCode);
    const template = getEcmRoleWorkspaceTemplate(step.roleCode);
    if (!def || !template) return null;

    const values = roleProfiles[step.roleCode] ?? {};
    const mirFields = getVisibleMirFields(step.roleCode);
    const optionalFields = getVisibleOptionalFields(step.roleCode);
    const mirComplete = isEcmRoleMirComplete(step.roleCode, values);
    const actions = template.businessActions.filter((a) => a.enabled);

    return (
      <div className="space-y-4">
        <IdentitySummaryCard contact={active} />

        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">
            Configuring role: {def.label}
          </p>
          <p className="mt-0.5 text-muted-foreground">
            Identity owns person data. This step only asks for information this role genuinely requires.
          </p>
        </div>

        <SectionCard
          title="Mandatory Information"
          description="Minimum Information Requirement (MIR) — configurable per role."
          badge={<MirStatusBadge complete={mirComplete} />}
        >
          {renderFieldGrid(mirFields, step.roleCode, values)}
        </SectionCard>

        {optionalFields.length > 0 && (
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => setShowRoleAdditional((v) => !v)}
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", showRoleAdditional && "rotate-180")}
              />
              Additional Details
            </Button>
            {showRoleAdditional && (
              <SectionCard
                title="Additional Information"
                description="Optional fields — expand only when needed."
              >
                {renderFieldGrid(optionalFields, step.roleCode, values)}
              </SectionCard>
            )}
          </div>
        )}

        {mirComplete && actions.length > 0 && (
          <SectionCard
            title="Next business action"
            description="Continue into the relevant journey — no dead ends."
          >
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <Button
                  key={action.id}
                  type="button"
                  size="lg"
                  className="gap-2 rounded-xl"
                  disabled={action.requiresMirComplete && !mirComplete}
                  onClick={() => {
                    saveRoleStep(step.roleCode!, false);
                    handleBusinessAction(action.id, action.href);
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </div>
            {actions[0]?.description && (
              <p className="mt-3 text-sm text-muted-foreground">{actions[0].description}</p>
            )}
            {actionNotice && (
              <p className="mt-3 rounded-xl border border-teal-200/70 bg-teal-50/80 px-3 py-2 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
                {actionNotice}
              </p>
            )}
          </SectionCard>
        )}

        {!mirComplete && (
          <p className="text-sm text-muted-foreground">
            Complete mandatory fields to unlock the next business action for this role.
          </p>
        )}

        {footerActions({
          onSave: () => saveRoleStep(step.roleCode!, false),
          onSaveNext: () => saveRoleStep(step.roleCode!, true),
          showFinish: mirComplete && stepIndex >= workspaceTabs.length - 1,
        })}
      </div>
    );
  };

  const identityForm = (compactCreate: boolean) => (
    <>
      <SectionCard
        title={compactCreate ? "Person identity" : "Identity"}
        description="Owner of common person information. Role workspaces reuse these fields and never ask again."
      >
        {!compactCreate && active && (
          <div className="mb-4 rounded-xl border border-teal-200/70 bg-teal-50/80 px-4 py-3 text-sm dark:border-teal-900 dark:bg-teal-950/40">
            <p className="font-medium text-teal-900 dark:text-teal-100">Contact record active</p>
            <p className="mt-0.5 text-teal-800/80 dark:text-teal-200/80">
              ID <span className="font-mono text-xs">{active.id}</span> · Guided onboarding in progress
            </p>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>
              Contact Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full legal name"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>
              Primary Mobile <span className="text-destructive">*</span>
            </Label>
            <Input
              value={mobilePrimary}
              onChange={(e) => setMobilePrimary(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <EcmMasterSelect
              domain="country"
              value={country}
              onChange={(id) => setCountry(id)}
              placeholder="Select country"
            />
          </div>
        </div>

        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => setShowIdentityAdditional((v) => !v)}
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", showIdentityAdditional && "rotate-180")}
            />
            Additional Details
          </Button>
        </div>

        {showIdentityAdditional && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Secondary Mobile</Label>
              <Input
                value={mobileSecondary}
                onChange={(e) => setMobileSecondary(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Personal Email</Label>
              <Input
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Official Email</Label>
              <Input
                value={officialEmail}
                onChange={(e) => setOfficialEmail(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <EcmMasterSelect
                domain="state"
                value={state}
                parentId={country || undefined}
                onChange={(id) => setState(id)}
                placeholder="Select state"
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <EcmMasterSelect
                domain="city"
                value={city}
                parentId={state || undefined}
                onChange={(id, option) => {
                  setCity(id);
                  if (option?.parentId) setState(option.parentId);
                }}
                placeholder="Select city"
              />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>PAN</Label>
              <Input value={pan} onChange={(e) => setPan(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Aadhaar</Label>
              <Input
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        )}

        {!compactCreate && (
          <div className="mt-4 space-y-2 md:col-span-2">
            <Label>Assigned Roles</Label>
            <ContactRoleChips roles={roles} selected={roles} interactive size="md" onToggle={toggleRole} />
          </div>
        )}

        {!compactCreate && active && (
          <div className="mt-4 grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Contact ID</p>
              <p className="font-mono text-xs">{active.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p>{formatTs(active.createdOn)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Modified</p>
              <p>{formatTs(active.modifiedOn)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Active</p>
              <p>{formatTs(active.lastActiveOn)}</p>
            </div>
          </div>
        )}
      </SectionCard>

      {compactCreate && (
        <SectionCard
          title="Assigned roles"
          description="Select every role this person performs. Each role unlocks a guided MIR step."
        >
          <ContactRoleChips roles={roles} selected={roles} interactive size="md" onToggle={toggleRole} />
        </SectionCard>
      )}
    </>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "flex max-h-[85vh] w-[80vw] max-w-[80vw] flex-col gap-0 overflow-hidden border-border/80 p-0 sm:rounded-2xl",
          )}
        >
          <DialogHeader className="shrink-0 space-y-3 border-b border-border/70 px-6 pb-4 pt-5 text-left">
            <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {awaitingFirstSave ? "Add Contact" : active?.name ?? "Contact Workspace"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm">
                  {active
                    ? `Step ${stepIndex + 1} of ${workspaceTabs.length} · ${currentStep?.label ?? "Workspace"} · Who → Role → MIR → Next journey`
                    : "Capture identity once. Roles unlock guided MIR workspaces automatically."}
                </DialogDescription>
              </div>
              {active && (
                <div className="min-w-[160px]">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-medium text-foreground">{progressPct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {active && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {workspaceTabs.map((step, idx) => {
                  const done = completedSteps.has(step.id) || (step.id === "identity" && Boolean(active));
                  const current = step.id === tab;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => goToStep(step.id)}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                        current && "border-primary/40 bg-primary text-primary-foreground shadow-sm",
                        !current &&
                          done &&
                          "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200",
                        !current && !done && "border-border bg-background text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      <span>
                        {idx + 1}. {step.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!awaitingFirstSave && active ? (
              <div className="space-y-5 px-6 py-6">
                {tab === "identity" && (
                  <>
                    {identityForm(false)}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    {footerActions({
                      onSave: () => saveIdentity(false),
                      onSaveNext: () => saveIdentity(true),
                    })}
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => {
                        archiveEcmContact(active.id, actorId);
                        onOpenChange(false);
                      }}
                    >
                      Archive contact
                    </Button>
                  </>
                )}

                {currentStep?.kind === "role" && renderRolePanel(currentStep)}
              </div>
            ) : (
              <div className="space-y-0">
                <div className="mx-auto max-w-3xl space-y-5 px-6 py-6">
                  {identityForm(true)}
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                {footerActions({
                  onSave: () => saveIdentity(false),
                  onSaveNext: () => saveIdentity(true),
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {active && (
        <LoanCreateFormDialog
          open={loanDialogOpen}
          onOpenChange={setLoanDialogOpen}
          title="Start Loan Journey"
          description="Loan File is pre-populated from Contact Identity and Borrower MIR. Do not re-enter known information."
          prefillCustomer={buildLoanPrefill(active)}
          onSubmit={handleLoanCreated}
        />
      )}
    </>
  );
}
