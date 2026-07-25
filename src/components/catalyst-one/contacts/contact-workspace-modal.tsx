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
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  getEcmMasterLabel,
  getEcmMasterOption,
  getEcmRoleDefinition,
  getEcmRoleLabel,
  getVisibleMirFields,
  getVisibleOptionalFields,
  getEcmRoleWorkspaceTemplate,
  isEcmFieldRelevant,
  isEcmRoleMirComplete,
  listEcmMasterOptions,
  normalizeEcmEmploymentTypeId,
  getEcmRoleCompletionPct,
  getEcmRoleProgressStatus,
  getEcmRoleStatusLabel,
  getEcmRoleWorkspaceDashAction,
  getEcmBusinessJourneyDashAction,
  getEcmContactReadinessPct,
  getEnabledEcmRoleMaster,
  deriveEcmEmployeeCode,
  ECM_ACTIVE_JOURNEY_PROFILE_KEY,
  ECM_DEFAULT_RESIDENT_STATUS_ID,
  type EcmBusinessActionId,
  type EcmConfigurableField,
  type EcmMasterOption,
} from "@/constants/enterprise-contact-master";
import {
  buildEcmBankerReportingChain,
  buildEcmWorkspaceTabs,
  formatEcmBankerOrgPath,
  getEcmBankerOrgPlacement,
  getEcmBankerReportingManagerId,
  getEcmContactAssignedRoles,
  isEcmDuplicateContactError,
  registerEcmContact,
  setBankerReportingManager,
  updateEcmContact,
  type EcmDuplicateMatchField,
} from "@/lib/enterprise-contact-master";
import { findOperationalEcmContactById } from "@/lib/enterprise-registry";
import type { EcmWorkspaceTab } from "@/lib/enterprise-contact-master";
import { loadDealsSync } from "@/lib/enterprise-deal/deal-data-access";
import { isLoanCompleted } from "@/lib/customer-utils";
import { ROUTES } from "@/constants/routes";
import { buildOpportunityWorkspaceStageHref } from "@/constants/opportunity-workspace-stages";
import type { EcmContact, EcmContactRole } from "@/types/enterprise-contact-master";
import type { LoanFile } from "@/types/catalyst-one";
import { toast } from "sonner";
import {
  startOpportunityFromContact,
  openExistingOpportunityWorkspace,
  assertContactReadyForLoanJourney,
} from "@/lib/enterprise-opportunity/start-opportunity-from-contact";
import { ActiveOpportunityConflictDialog } from "@/components/catalyst-one/contacts/active-opportunity-conflict-dialog";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { useAuthContext } from "@/components/providers/auth-provider";
import { ContactRoleChips } from "@/components/catalyst-one/contacts/contact-role-chips";
import { ChanakyaJourneyGuidanceCard } from "@/components/catalyst-one/contacts/chanakya-journey-guidance-card";
import { EcmMasterSelect } from "@/components/catalyst-one/contacts/ecm-master-select";
import { ReportingManagerPicker } from "@/components/catalyst-one/contacts/reporting-manager-picker";
import { PotentialDuplicateContactDialog } from "@/components/catalyst-one/contacts/potential-duplicate-contact-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UnsavedChangesDialog } from "@/components/catalyst-one/shared/unsaved-changes-dialog";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
import { SoftDeleteConfirmDialog } from "@/components/enterprise/soft-delete/soft-delete-dialogs";
import { EnterpriseRelationshipWorkspace } from "@/components/catalyst-one/enterprise-relationship-workspace";
import { CreateTaskActionButton } from "@/components/catalyst-one/tasks/create-task-action-button";
import { listContactCompanyLinks, getEcmCompany } from "@/lib/enterprise-company-master";
import { ECM_COMPANY_RELATION_ROLE_LABELS } from "@/constants/enterprise-company-master";
import { canSoftDelete, softDeleteApi } from "@/lib/enterprise-soft-delete";
import { isEnterprisePersistencePrisma } from "@/lib/enterprise-persistence";
import { cn } from "@/lib/utils";

export type ContactWorkspaceMode = "create" | "edit";

function ContactEntityWorkspaceShell({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-50">{title}</h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">{description}</p>
        </div>
        {actionLabel && onAction ? (
          <Button
            type="button"
            size="sm"
            className="h-7 rounded-md bg-teal-700 px-2.5 text-xs hover:bg-teal-600"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

interface ContactWorkspaceModalProps {
  open: boolean;
  mode: ContactWorkspaceMode;
  contact: EcmContact | null;
  actorId?: string;
  initialTab?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (contact: EcmContact) => void;
  /** When a duplicate is found — open the existing registry contact instead of creating. */
  onOpenExisting?: (contact: EcmContact) => void;
  /** CO-SPRINT-119 — called after soft delete succeeds. */
  onDeleted?: (contactId: string) => void;
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

/** Resolve stored city/state to ECM master ids (id or label → id). */
function resolveEcmMasterValue(
  domain: "city" | "state",
  raw?: string | null,
): string {
  const value = raw?.trim() ?? "";
  if (!value) return "";
  const byId = getEcmMasterOption(domain, value);
  if (byId) return byId.id;
  const byLabel = listEcmMasterOptions(domain).find(
    (o) => o.label.toLowerCase() === value.toLowerCase(),
  );
  return byLabel?.id ?? value;
}

function resolveContactCityState(source: {
  city?: string | null;
  state?: string | null;
}): { city: string; state: string } {
  const city = resolveEcmMasterValue("city", source.city);
  const cityOpt = city ? getEcmMasterOption("city", city) : undefined;
  const state =
    cityOpt?.parentId ?? resolveEcmMasterValue("state", source.state);
  return { city, state };
}

function serializeContactDraft(input: {
  name: string;
  mobilePrimary: string;
  mobileSecondary: string;
  personalEmail: string;
  officialEmail: string;
  city: string;
  state: string;
  country: string;
  address: string;
  pan: string;
  aadhaar: string;
  dateOfBirth: string;
  roles: EcmContactRole[];
  roleProfiles: Partial<Record<EcmContactRole, Record<string, string>>>;
}) {
  return JSON.stringify(input);
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
    <section className="rounded-xl border border-border/70 bg-card p-3 shadow-sm shadow-black/[0.02]">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
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
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        complete
          ? "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200"
          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
      )}
    >
      {complete ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
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
        className="min-h-[56px] w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    );
  }
  return (
    <Input
      type={field.control === "number" ? "number" : "text"}
      value={value}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg"
    />
  );
}

export function ContactWorkspaceModal({
  open,
  mode,
  contact,
  actorId = "ui",
  initialTab = "overview",
  onOpenChange,
  onSaved,
  onOpenExisting,
  onDeleted,
}: ContactWorkspaceModalProps) {
  const router = useRouter();
  const { user } = useAuthContext();
  const { success: toastSuccess, error: toastError } = useToast();
  const advisorFirstName = user?.firstName?.trim() || "there";
  const [draftSaved, setDraftSaved] = useState<EcmContact | null>(null);
  const active = draftSaved ?? contact;
  const awaitingFirstSave = !active;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const allowDelete =
    Boolean(active) &&
    canSoftDelete(user?.role ?? "VIEWER") &&
    isEnterprisePersistencePrisma();

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
  const [dupOpen, setDupOpen] = useState(false);
  const [dupContact, setDupContact] = useState<EcmContact | null>(null);
  const [dupField, setDupField] = useState<EcmDuplicateMatchField | null>(null);
  const [showIdentityAdditional, setShowIdentityAdditional] = useState(false);
  const [showRoleAdditional, setShowRoleAdditional] = useState(false);
  const [startingJourney, setStartingJourney] = useState(false);
  const [activeOppConflict, setActiveOppConflict] = useState<{
    message: string;
    productLabel: string;
    existing: EnterpriseOpportunityApiRecord;
  } | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showAddRole, setShowAddRole] = useState(false);
  const wasOpenRef = useRef(false);
  const hydratedIdRef = useRef<string | null>(null);
  const baselineRef = useRef("");

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
    const geo = resolveContactCityState(source);
    setCity(geo.city);
    setState(geo.state);
    setCountry(source.country ?? "IN");
    setAddress(source.address ?? "");
    setPan(source.pan ?? "");
    setAadhaar(source.aadhaar ?? "");
    setDateOfBirth(source.dateOfBirth ?? "");
    setRoles(getEcmContactAssignedRoles(source));
    setRoleProfiles(source.roleProfiles ?? {});
    hydratedIdRef.current = source.id;
    baselineRef.current = serializeContactDraft({
      name: source.name,
      mobilePrimary: source.mobilePrimary,
      mobileSecondary: source.mobileSecondary ?? "",
      personalEmail: source.personalEmail ?? "",
      officialEmail: source.officialEmail ?? "",
      city: geo.city,
      state: geo.state,
      country: source.country ?? "IN",
      address: source.address ?? "",
      pan: source.pan ?? "",
      aadhaar: source.aadhaar ?? "",
      dateOfBirth: source.dateOfBirth ?? "",
      roles: getEcmContactAssignedRoles(source),
      roleProfiles: source.roleProfiles ?? {},
    });
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
      setStartingJourney(false);
      return;
    }

    if (!open) return;

    if (justOpened) {
      setError(null);
      if (contact) {
        hydrateFromContact(contact);
        setCompletedSteps(new Set(["identity"]));
        setTab(initialTab === "dashboard" ? "overview" : initialTab || "overview");
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

  const stepIndex = workspaceTabs.findIndex((t) => t.id === tab);
  const currentStep = stepIndex >= 0 ? workspaceTabs[stepIndex] : undefined;
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
    if (stepIndex < 0) return;
    const next = workspaceTabs[stepIndex + 1];
    if (next) goToStep(next.id);
  };

  const goPrev = () => {
    if (stepIndex < 0) return;
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
        toast.success("Contact saved successfully.");
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
        toast.success("Contact saved successfully.");
        if (thenNext) goNext();
      }
    } catch (e) {
      if (isEcmDuplicateContactError(e)) {
        setDupContact(e.match);
        setDupField(e.matchField);
        setDupOpen(true);
        setError(null);
      } else {
        const message =
          e instanceof Error
            ? e.message
            : "I couldn't save this contact just now. Please try again.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const saveRoleStep = (roleCode: EcmContactRole, thenNext: boolean) => {
    if (!active) return;
    setSaving(true);
    setError(null);
    try {
      const profile = { ...(roleProfiles[roleCode] ?? {}) };
      // CF-CDC-002 — Employee Code is system-derived, never shown for manual entry
      if (roleCode === "employee" && !profile.employeeCode?.trim()) {
        profile.employeeCode = deriveEcmEmployeeCode(active.id);
      }
      const nextProfiles = { ...roleProfiles, [roleCode]: profile };
      const patch: Parameters<typeof updateEcmContact>[1] = { roleProfiles: nextProfiles };
      // Keep Contact identity employment in sync when Borrower profile updates it (SSOT header)
      if (roleCode === "customer" && profile.employmentType) {
        patch.employmentType = profile.employmentType;
      }
      setRoleProfiles(nextProfiles);
      const updated = updateEcmContact(active.id, patch, actorId);
      hydrateFromContact(updated);
      onSaved(updated);
      const def = getEcmRoleDefinition(roleCode);
      if (def) markComplete(def.workspaceTabId);
      toast.success("Contact saved successfully.");
      if (thenNext) goNext();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "I couldn't save these role details just now. Please try again.";
      setError(message);
      toast.error(message);
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
      const resolvedValue =
        key === "employmentType"
          ? normalizeEcmEmploymentTypeId(value) ?? value
          : value;
      const current = { ...(prev[role] ?? {}), [key]: resolvedValue };
      // Clear cascading children when parent master changes (e.g. Employment → Occupation)
      const dependents =
        getEcmRoleWorkspaceTemplate(role)?.fields.filter((f) => f.parentFieldKey === key) ?? [];
      for (const dep of dependents) {
        current[dep.key] = "";
      }
      // CF-CDC-002 — drop values that are no longer relevant after the controlling field changes
      if (key === "employmentType") {
        const templateFields = getEcmRoleWorkspaceTemplate(role)?.fields ?? [];
        for (const field of templateFields) {
          if (field.key === key || field.parentFieldKey === key) continue;
          if (!isEcmFieldRelevant(field, current) && current[field.key]) {
            current[field.key] = "";
          }
        }
      }
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
      if (active?.id) {
        const managerId = getEcmBankerReportingManagerId(active.id);
        if (managerId && next.reportingManagerContactId !== managerId) {
          const manager = findOperationalEcmContactById(managerId);
          next.reportingManagerContactId = managerId;
          next.reportingManagerName = manager?.name ?? next.reportingManagerName ?? "";
          changed = true;
        }
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
      // CF-CON-041 — Resident Indian default; field hidden until ECC enables variants
      if (!next.residentStatus) {
        next.residentStatus = ECM_DEFAULT_RESIDENT_STATUS_ID;
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

  const canOverrideActiveOpportunity = true;

  const completeStartLoanJourney = (
    opportunity: EnterpriseOpportunityApiRecord,
    workspaceHref: string,
    created: boolean,
  ) => {
    markRoleJourneyStarted("customer", opportunity.id);
    toastSuccess(
      created ? "Draft Opportunity created" : "Opening Loan Journey",
      `${opportunity.opportunityNumber} · opening Execution Hub`,
    );
    setActiveOppConflict(null);
    onOpenChange(false);
    router.push(workspaceHref);
  };

  const handleStartLoanJourney = async (opts?: { forceCreate?: boolean }) => {
    if (!active || startingJourney) return;
    setStartingJourney(true);
    setActionNotice(null);
    try {
      // ADR-018 Wave 3 — always create Draft (identity only); land on /loan-journey.
      // Active Contact+Product uniqueness applies from Requirement Captured onward.
      const result = await startOpportunityFromContact(active, {
        allowActiveDuplicateOverride: Boolean(opts?.forceCreate),
        overrideReason: opts?.forceCreate
          ? `Explicit override from Contact Workspace by ${user?.email || user?.id || "user"}`
          : undefined,
      });
      completeStartLoanJourney(result.opportunity, result.workspaceHref, result.created);
    } catch (err) {
      const conflict = (
        err as Error & {
          code?: string;
          conflict?: {
            message: string;
            productLabel: string;
            existing: EnterpriseOpportunityApiRecord;
          };
        }
      ).conflict;
      if (conflict?.existing) {
        setActiveOppConflict(conflict);
        return;
      }
      const message =
        err instanceof Error ? err.message : "Opportunity could not be created.";
      toastError("Could not start loan journey", message);
    } finally {
      setStartingJourney(false);
    }
  };

  const handleOpenExistingActiveOpportunity = () => {
    if (!activeOppConflict) return;
    const result = openExistingOpportunityWorkspace(activeOppConflict.existing);
    completeStartLoanJourney(result.opportunity, result.workspaceHref, false);
  };

  const handleOverrideCreateOpportunity = async () => {
    const confirmed = window.confirm(
      "Create another active Opportunity for the same Contact and Product?\n\nThis is an exceptional override. Prefer Open Existing Opportunity whenever possible.",
    );
    if (!confirmed) return;
    await handleStartLoanJourney({ forceCreate: true });
  };

  const handleBusinessAction = (
    actionId: EcmBusinessActionId,
    href?: string,
    opts?: { mode?: "start" | "open"; openHref?: string; loanFileId?: string },
  ) => {
    setActionNotice(null);
    if (actionId === "start_loan_journey") {
      if (opts?.mode === "open") {
        onOpenChange(false);
        // Prefer Opportunity Workspace when continuing an existing journey.
        const target = opts.openHref?.includes("opportunities")
          ? opts.loanFileId
            ? `${ROUTES.OPPORTUNITY_WORKSPACE}?file=${opts.loanFileId}`
            : opts.openHref
          : opts.loanFileId
            ? `${ROUTES.LOAN_FILES}?file=${opts.loanFileId}`
            : opts.openHref ?? href ?? ROUTES.OPPORTUNITY_WORKSPACE;
        router.push(target);
        return;
      }
      void handleStartLoanJourney();
      return;
    }
    if (actionId === "create_user_account" && active) {
      onOpenChange(false);
      router.push(`${ROUTES.ADMIN_USERS}?grantContact=${encodeURIComponent(active.id)}`);
      return;
    }
    const navigateTo = opts?.mode === "open" ? opts.openHref ?? href : href;
    if (navigateTo) {
      onOpenChange(false);
      router.push(navigateTo);
      return;
    }
    const messages: Partial<Record<EcmBusinessActionId, string>> = {
      start_investment: "Investment journey workspace will open from this contact once Investment Engine is certified.",
      create_referral: "Partner onboarding continues — next commercial / referral steps open from this role.",
      add_project: "Builder project workspace is ready — project details belong to the Project Journey.",
      link_lender: "Opening lender relationship management…",
      manage_ca_engagement: "CA engagement continues from this Contact identity.",
    };
    setActionNotice(messages[actionId] ?? "Next business step recorded.");
  };

  const markRoleJourneyStarted = (roleCode: EcmContactRole, journeyRef: string) => {
    if (!active) return;
    const profile = {
      ...(roleProfiles[roleCode] ?? {}),
      [ECM_ACTIVE_JOURNEY_PROFILE_KEY]: journeyRef,
    };
    const nextProfiles = { ...roleProfiles, [roleCode]: profile };
    setRoleProfiles(nextProfiles);
    try {
      const updated = updateEcmContact(active.id, { roleProfiles: nextProfiles }, actorId);
      hydrateFromContact(updated);
      onSaved(updated);
    } catch {
      /* journey ref is best-effort continuity marker */
    }
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
    <div className="grid gap-2.5 md:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.key}
          className={cn(
            "space-y-1",
            (field.control === "textarea" || field.control === "contact_ref") && "md:col-span-2",
          )}
        >
          <Label className="text-[11px] font-medium text-muted-foreground">
            {field.label}
            {field.mandatory && <span className="text-destructive"> *</span>}
          </Label>
          {field.control === "contact_ref" ? (
            <ReportingManagerPicker
              valueContactId={values.reportingManagerContactId}
              valueName={values.reportingManagerName}
              excludeContactId={active?.id}
              actorId={actorId}
              onChange={(picked) => {
                if (!active) return;
                try {
                  const updated = setBankerReportingManager({
                    bankerContactId: active.id,
                    manager: picked,
                    actorId,
                  });
                  hydrateFromContact(updated);
                  onSaved(updated);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to link reporting manager");
                }
              }}
            />
          ) : (
            <RoleFieldControl
              field={field}
              value={values[field.key] ?? ""}
              parentValue={field.parentFieldKey ? values[field.parentFieldKey] : undefined}
              onChange={(next, option) =>
                setRoleField(roleCode, field.key, next, option, field.inheritMetaKeys)
              }
            />
          )}
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
    const mirFields = getVisibleMirFields(step.roleCode, values).filter(
      (f) => f.control !== "contact_ref",
    );
    const optionalFields = getVisibleOptionalFields(step.roleCode, values).filter(
      (f) => f.control !== "contact_ref",
    );
    const reportingField = getEcmRoleWorkspaceTemplate(step.roleCode)?.fields.find(
      (f) => f.control === "contact_ref",
    );
    const mirComplete = isEcmRoleMirComplete(step.roleCode, values);
    const actions = template.businessActions.filter((a) => a.enabled);
    const isBanker = step.roleCode === "lender_employee";
    const bankerChain =
      isBanker && active ? buildEcmBankerReportingChain(active.id) : [];
    const bankerOrg =
      isBanker && active
        ? formatEcmBankerOrgPath(getEcmBankerOrgPlacement({ ...active, roleProfiles }))
        : "—";

    return (
      <div className="flex min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Role Workspace
              </p>
              <h3 className="text-base font-semibold tracking-tight text-zinc-50">{def.label}</h3>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 rounded-lg border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              onClick={() => {
                setShowRoleAdditional(false);
                setTab("overview");
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Button>
          </div>

          {/* Contact owns person SSOT — never re-asked here */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Contact Summary · Read-only
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 gap-1 px-2 text-[11px] text-zinc-400 hover:text-zinc-100"
                onClick={() => setTab("identity")}
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
            </div>
            <div className="mt-1.5 grid gap-1.5 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-zinc-500">Name</p>
                <p className="font-medium text-zinc-200">{active.name}</p>
              </div>
              <div>
                <p className="text-zinc-500">Mobile</p>
                <p className="font-medium text-zinc-200">{active.mobilePrimary}</p>
              </div>
              <div>
                <p className="text-zinc-500">Email</p>
                <p className="font-medium text-zinc-200 truncate">
                  {active.personalEmail || active.officialEmail || "—"}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Roles</p>
                <ContactRoleChips roles={active.roles} size="sm" className="mt-0.5" />
              </div>
            </div>
          </div>

          {isBanker && (
            <div className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 p-2.5 text-xs sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                  Org Location
                </p>
                <p className="mt-0.5 text-zinc-200">{bankerOrg}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                  Reporting Chain
                </p>
                {bankerChain.length <= 1 && !values.reportingManagerContactId ? (
                  <p className="mt-0.5 text-zinc-400">No manager linked</p>
                ) : (
                  <p className="mt-0.5 text-zinc-200">
                    {bankerChain
                      .map((n) => `${n.name}${n.designation ? ` (${n.designation})` : ""}`)
                      .join(" ← ")}
                  </p>
                )}
              </div>
            </div>
          )}

          <SectionCard
            title="Business Profile Details"
            description={
              isBanker
                ? "Institution, City, Branch, Designation, Official Mobile — asked once for this role."
                : "Only the business details this role needs — asked once, reused across journeys."
            }
            badge={<MirStatusBadge complete={mirComplete} />}
          >
            {renderFieldGrid(mirFields, step.roleCode, values)}
          </SectionCard>

          {isBanker && reportingField && (
            <SectionCard
              title="Reporting Manager"
              description="Lookup/create Contact · hierarchy from reports_to (not hardcoded levels)."
            >
              <ReportingManagerPicker
                valueContactId={values.reportingManagerContactId}
                valueName={values.reportingManagerName}
                excludeContactId={active?.id}
                actorId={actorId}
                onChange={(picked) => {
                  if (!active) return;
                  try {
                    const updated = setBankerReportingManager({
                      bankerContactId: active.id,
                      manager: picked,
                      actorId,
                    });
                    hydrateFromContact(updated);
                    onSaved(updated);
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Failed to link reporting manager",
                    );
                  }
                }}
              />
              {bankerChain.length > 1 && (
                <p className="mt-3 text-xs text-zinc-400">
                  Live chain:{" "}
                  <span className="text-zinc-200">
                    {bankerChain
                      .map((n) => `${n.name}${n.designation ? ` (${n.designation})` : ""}`)
                      .join(" ← ")}
                  </span>
                </p>
              )}
            </SectionCard>
          )}

          {optionalFields.length > 0 && (
            <div className="space-y-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-lg border-zinc-700 bg-zinc-900 text-zinc-100"
                onClick={() => setShowRoleAdditional((v) => !v)}
              >
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", showRoleAdditional && "rotate-180")}
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

          {(mirComplete ||
            actions.some((a) => a.id === "start_loan_journey" && a.enabled)) &&
            actions.length > 0 && (
            <SectionCard
              title="Next business action"
              description="Continue into the relevant journey — no dead ends."
            >
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => {
                  const loanReady =
                    action.id !== "start_loan_journey" ||
                    (active
                      ? assertContactReadyForLoanJourney(active).ready
                      : false);
                  const blockedByMir =
                    action.requiresMirComplete && !mirComplete;
                  const blockedByLoanMin =
                    action.id === "start_loan_journey" && !loanReady;
                  return (
                  <Button
                    key={action.id}
                    type="button"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg"
                    disabled={
                      blockedByMir ||
                      blockedByLoanMin ||
                      (action.id === "start_loan_journey" && startingJourney)
                    }
                    onClick={() => {
                      saveRoleStep(step.roleCode!, false);
                      handleBusinessAction(action.id, action.href);
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {action.label}
                  </Button>
                  );
                })}
              </div>
              {actions[0]?.description && (
                <p className="mt-2 text-xs text-muted-foreground">{actions[0].description}</p>
              )}
              {actionNotice && (
                <p className="mt-2 rounded-lg border border-teal-200/70 bg-teal-50/80 px-2.5 py-1.5 text-xs text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
                  {actionNotice}
                </p>
              )}
            </SectionCard>
          )}
        </div>

        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 bg-zinc-950/95 px-1 py-2.5 backdrop-blur">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-zinc-300"
            onClick={() => setTab("overview")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 rounded-lg"
            disabled={saving}
            onClick={() => {
              saveRoleStep(step.roleCode!, false);
              setTab("overview");
            }}
          >
            <Check className="h-3.5 w-3.5" />
            Save & Continue
          </Button>
        </div>
      </div>
    );
  };

  const assignedRoles = useMemo(
    () => (active ? getEcmContactAssignedRoles(active) : roles),
    [active, roles],
  );

  const readinessPct = useMemo(
    () => getEcmContactReadinessPct(assignedRoles, roleProfiles),
    [assignedRoles, roleProfiles],
  );

  const findActiveLoanForContact = (contact: EcmContact): LoanFile | undefined => {
    const digits = contact.mobilePrimary.replace(/\D/g, "");
    return loadDealsSync("loan_workspace").files.find((f) => {
      if (f.archived || isLoanCompleted(f)) return false;
      if (f.customerId === contact.id) return true;
      const mobile = (f.customerMobile ?? "").replace(/\D/g, "");
      return Boolean(digits) && mobile === digits;
    });
  };

  const handleRoleWorkspaceAction = (roleCode: EcmContactRole) => {
    const def = getEcmRoleDefinition(roleCode);
    if (def) {
      setShowRoleAdditional(false);
      setTab(def.workspaceTabId);
    }
  };

  const handleBusinessJourneyAction = (roleCode: EcmContactRole) => {
    if (!active) return;
    const values = roleProfiles[roleCode] ?? {};
    const activeLoan = roleCode === "customer" ? findActiveLoanForContact(active) : undefined;
    const profileJourney = Boolean(values[ECM_ACTIVE_JOURNEY_PROFILE_KEY]?.trim());
    const journey = getEcmBusinessJourneyDashAction(roleCode, values, {
      hasActiveJourney: Boolean(activeLoan) || profileJourney,
      loanJourneyReady: assertContactReadyForLoanJourney(active).ready,
    });
    if (!journey || journey.mode === "guide") return;

    if (journey.mode === "start" && journey.actionId !== "start_loan_journey") {
      markRoleJourneyStarted(roleCode, `started-${Date.now()}`);
    }

    if (
      journey.mode === "open" &&
      journey.actionId === "start_loan_journey" &&
      profileJourney &&
      !activeLoan
    ) {
      const opportunityRef = values[ECM_ACTIVE_JOURNEY_PROFILE_KEY]!.trim();
      onOpenChange(false);
      router.push(
        buildOpportunityWorkspaceStageHref("opportunity_creation", {
          opportunityId: opportunityRef,
          fileId: null,
        }),
      );
      return;
    }

    handleBusinessAction(journey.actionId, journey.href, {
      mode: journey.mode,
      openHref: journey.openHref,
      loanFileId: activeLoan?.id,
    });
  };

  const addRole = (roleCode: EcmContactRole) => {
    if (!active) return;
    if (roles.includes(roleCode)) return;
    const nextRoles = [...roles, roleCode];
    const nextProfiles = { ...roleProfiles };
    if (roleCode === "customer") {
      nextProfiles.customer = {
        ...nextProfiles.customer,
        residentStatus:
          nextProfiles.customer?.residentStatus || ECM_DEFAULT_RESIDENT_STATUS_ID,
      };
      setRoleProfiles(nextProfiles);
    }
    setRoles(nextRoles);
    try {
      const updated = updateEcmContact(
        active.id,
        { roles: nextRoles, roleProfiles: nextProfiles },
        actorId,
      );
      hydrateFromContact(updated);
      onSaved(updated);
      setShowAddRole(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "I couldn't add that role just now. Please try again.");
    }
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
              <Label>City</Label>
              <EcmMasterSelect
                domain="city"
                value={city}
                onChange={(id, option) => {
                  setCity(id);
                  if (option?.parentId) {
                    setState(option.parentId);
                  } else {
                    const resolved = getEcmMasterOption("city", id);
                    if (resolved?.parentId) setState(resolved.parentId);
                  }
                }}
                placeholder="Search and select city"
                searchPlaceholder="Search city…"
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                readOnly
                tabIndex={-1}
                value={state ? masterDisplay("state", state) : ""}
                placeholder="Populated from city"
                className="h-10 rounded-xl bg-muted/40"
                aria-readonly="true"
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
                          <div className="mt-3 space-y-1 md:col-span-2">
                            <Label className="text-[11px]">Assigned Roles</Label>
                            <ContactRoleChips roles={roles} size="sm" />
                            <p className="text-[10px] text-muted-foreground">
                              Compact chips only. Use + Add Role on the dashboard to assign more.
                            </p>
                          </div>
                        )}

        {!compactCreate && active && (
          <div className="mt-3 grid gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs sm:grid-cols-2 lg:grid-cols-4">
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
          <ContactRoleChips roles={roles} selected={roles} interactive size="sm" onToggle={toggleRole} />
        </SectionCard>
      )}
    </>
  );

  const draftSnapshot = serializeContactDraft({
    name,
    mobilePrimary,
    mobileSecondary,
    personalEmail,
    officialEmail,
    city,
    state,
    country,
    address,
    pan,
    aadhaar,
    dateOfBirth,
    roles,
    roleProfiles,
  });
  const hasUnsavedChanges =
    open &&
    (awaitingFirstSave
      ? Boolean(name.trim() || mobilePrimary.trim())
      : draftSnapshot !== baselineRef.current);

  const closeApi = useWorkspaceClose({
    onClose: () => onOpenChange(false),
    hasUnsavedChanges,
    enableEscapeKey: false,
    onSaveAndClose: () => {
      if (currentStep?.kind === "role" && currentStep.roleCode) {
        saveRoleStep(currentStep.roleCode, false);
        return true;
      }
      saveIdentity(false);
      return true;
    },
  });

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true);
          else closeApi.requestClose();
        }}
      >
        <DialogContent
          className={cn(
            "flex max-h-[92vh] w-[min(1280px,96vw)] max-w-[1280px] flex-col gap-0 overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-100 sm:rounded-2xl [&>button]:hidden",
          )}
        >
          {!awaitingFirstSave && active ? (
            <>
              <div className="shrink-0 border-b border-zinc-800 bg-zinc-950 px-4 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-teal-800/60 bg-teal-950/50 text-teal-200"
                      aria-hidden
                    >
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <DialogTitle className="truncate text-base font-semibold tracking-tight text-zinc-50">
                          {active.name}
                        </DialogTitle>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium",
                            active.status === "active"
                              ? "border-teal-800 bg-teal-950/60 text-teal-300"
                              : "border-zinc-700 bg-zinc-900 text-zinc-400",
                          )}
                        >
                          {active.status === "active" ? "Active" : "Archived"}
                        </span>
                        <div className="min-w-[100px] max-w-[160px] flex-1">
                          <div className="mb-0.5 flex items-center justify-between text-[10px] text-zinc-400">
                            <span>Readiness</span>
                            <span className="font-semibold text-teal-300">{readinessPct}%</span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-teal-500 transition-all"
                              style={{ width: `${readinessPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogDescription className="sr-only">
                        Contact Workspace — Enterprise Relationship Workspace
                      </DialogDescription>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-400">
                        <span>
                          <span className="text-zinc-500">ID </span>
                          <span className="font-mono text-zinc-300">{active.id.slice(0, 8)}…</span>
                        </span>
                        <span>
                          <span className="text-zinc-500">Mobile </span>
                          <span className="text-zinc-200">{active.mobilePrimary}</span>
                        </span>
                        <span className="truncate max-w-[180px]">
                          <span className="text-zinc-500">Email </span>
                          <span className="text-zinc-200">
                            {active.personalEmail || active.officialEmail || "—"}
                          </span>
                        </span>
                        <span>
                          <span className="text-zinc-500">DOB </span>
                          <span className="text-zinc-200">{active.dateOfBirth || "—"}</span>
                        </span>
                        <span className="truncate max-w-[160px]">
                          <span className="text-zinc-500">Location </span>
                          <span className="text-zinc-200">
                            {[active.city, active.state].filter(Boolean).join(", ") || "—"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <CreateTaskActionButton
                      className="h-7 rounded-md border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100 hover:bg-zinc-800"
                      context={{
                        contactId: active.id,
                        borrowerName: active.name,
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1 rounded-md bg-teal-600 px-2 text-xs text-white hover:bg-teal-500"
                      onClick={() => setTab("relationships")}
                    >
                      <Plus className="h-3 w-3" />
                      Add Relationship
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 rounded-md border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100 hover:bg-zinc-800"
                      onClick={() => {
                        setShowAddRole(false);
                        setTab("identity");
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 border-zinc-700 bg-zinc-900 px-2 text-xs"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                      More
                    </Button>
                    {allowDelete ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 rounded-md border-red-900/60 bg-red-950/40 px-2 text-xs text-red-200 hover:bg-red-950/70"
                        onClick={() => setDeleteOpen(true)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1 rounded-md bg-zinc-800 px-2 text-xs text-zinc-100 hover:bg-zinc-700"
                      onClick={() => {
                        setTab("overview");
                        setShowAddRole((v) => !v);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      Add Role
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1 rounded-md bg-teal-700 px-2 text-xs text-white hover:bg-teal-600"
                      disabled={saving}
                      onClick={() => {
                        if (currentStep?.kind === "role" && currentStep.roleCode) {
                          saveRoleStep(currentStep.roleCode, false);
                          return;
                        }
                        saveIdentity(false);
                      }}
                    >
                      <Save className="h-3 w-3" />
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1 rounded-md bg-teal-700 px-2 text-xs text-white hover:bg-teal-600"
                      disabled={saving}
                      onClick={() => void closeApi.handleSaveAndClose()}
                    >
                      <Save className="h-3 w-3" />
                      Save & Exit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs text-zinc-400 hover:text-zinc-100"
                      onClick={closeApi.requestClose}
                      aria-label="Close workspace"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                      Close
                    </Button>
                  </div>
                </div>

                <nav
                  className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5"
                  aria-label="Contact workspace tabs"
                >
                  {workspaceTabs.map((t) => {
                    const activeTab = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => goToStep(t.id)}
                        className={cn(
                          "shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium transition",
                          activeTab
                            ? "border-teal-600 bg-teal-950/50 text-teal-200"
                            : "border-transparent text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200",
                        )}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Primary workspace */}
              <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-950">
                <div className="space-y-2 px-4 py-3">
                  {tab === "overview" && (
                    <>
                      {showAddRole && (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                            Add Role
                          </p>
                          <div className="mt-1.5 flex max-h-16 flex-wrap gap-1 overflow-y-auto">
                            {getEnabledEcmRoleMaster()
                              .filter((r) => !assignedRoles.includes(r.code))
                              .map((role) => (
                                <button
                                  key={role.code}
                                  type="button"
                                  onClick={() => addRole(role.code)}
                                  className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-0.5 text-[11px] text-zinc-200 transition hover:border-teal-500 hover:text-teal-300"
                                >
                                  {role.label}
                                </button>
                              ))}
                            {getEnabledEcmRoleMaster().every((r) =>
                              assignedRoles.includes(r.code),
                            ) && (
                              <p className="text-xs text-zinc-500">All roles already assigned</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
                        <div className="border-b border-zinc-800 px-2.5 py-1.5">
                          <h3 className="text-xs font-semibold tracking-tight text-zinc-100">
                            Role Dashboard
                          </h3>
                          <p className="mt-0.5 text-[10px] text-zinc-500">
                            Role Workspace and Business Journey are separate next steps — never a dead end.
                          </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[860px] text-left text-xs">
                              <thead className="bg-zinc-950/80 text-[10px] uppercase tracking-[0.1em] text-zinc-500">
                                <tr>
                                  <th className="px-2.5 py-1.5 font-medium">Role</th>
                                  <th className="px-2.5 py-1.5 font-medium">Status</th>
                                  <th className="px-2.5 py-1.5 font-medium">Completion</th>
                                  <th className="px-2.5 py-1.5 font-medium">Role Workspace</th>
                                  <th className="px-2.5 py-1.5 font-medium">
                                    Business Journey
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {assignedRoles.map((roleCode) => {
                                  const values = roleProfiles[roleCode] ?? {};
                                  const pct = getEcmRoleCompletionPct(roleCode, values);
                                  const status = getEcmRoleProgressStatus(pct);
                                  const workspaceAction = getEcmRoleWorkspaceDashAction(
                                    roleCode,
                                    values,
                                  );
                                  const activeLoan =
                                    roleCode === "customer" && active
                                      ? findActiveLoanForContact(active)
                                      : undefined;
                                  const profileJourney = Boolean(
                                    values[ECM_ACTIVE_JOURNEY_PROFILE_KEY]?.trim(),
                                  );
                                  const loanJourneyReady = active
                                    ? assertContactReadyForLoanJourney(active).ready
                                    : false;
                                  const journeyAction = getEcmBusinessJourneyDashAction(
                                    roleCode,
                                    values,
                                    {
                                      hasActiveJourney:
                                        Boolean(activeLoan) || profileJourney,
                                      loanJourneyReady,
                                    },
                                  );
                                  const roleLabel = getEcmRoleLabel(roleCode);
                                  return (
                                    <tr
                                      key={roleCode}
                                      className="border-t border-zinc-800/80 align-top transition-colors hover:bg-zinc-900"
                                    >
                                      <td className="px-2.5 py-2 font-medium text-zinc-100">
                                        {roleLabel}
                                      </td>
                                      <td className="px-2.5 py-2">
                                        <span
                                          className={cn(
                                            "inline-flex rounded-full border px-1.5 py-0 text-[10px] font-medium",
                                            status === "complete" &&
                                              "border-teal-800 bg-teal-950/50 text-teal-300",
                                            status === "in_progress" &&
                                              "border-amber-800 bg-amber-950/40 text-amber-200",
                                            status === "not_started" &&
                                              "border-zinc-700 bg-zinc-950 text-zinc-400",
                                          )}
                                        >
                                          {getEcmRoleStatusLabel(status)}
                                        </span>
                                      </td>
                                      <td className="px-2.5 py-2">
                                        <div className="flex items-center gap-1.5">
                                          <div className="h-1 w-14 overflow-hidden rounded-full bg-zinc-800">
                                            <div
                                              className="h-full rounded-full bg-teal-500"
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                          <span className="tabular-nums text-[11px] text-zinc-300">
                                            {pct}%
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-2.5 py-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="h-7 rounded-md border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100 hover:bg-zinc-800"
                                          onClick={() => handleRoleWorkspaceAction(roleCode)}
                                        >
                                          {workspaceAction.label}
                                        </Button>
                                      </td>
                                      <td className="px-2.5 py-2">
                                        {!journeyAction ? (
                                          <span className="text-[11px] text-zinc-600">—</span>
                                        ) : journeyAction.mode === "guide" ? (
                                          <ChanakyaJourneyGuidanceCard
                                            mode="guide"
                                            userFirstName={advisorFirstName}
                                            roleLabel={roleLabel}
                                            completionPct={pct}
                                            journeyLabel={journeyAction.label}
                                            completeProfileLabel={journeyAction.guideCtaLabel}
                                            onCompleteProfile={() =>
                                              handleRoleWorkspaceAction(roleCode)
                                            }
                                          />
                                        ) : journeyAction.mode === "start" ? (
                                          <ChanakyaJourneyGuidanceCard
                                            mode="ready"
                                            userFirstName={advisorFirstName}
                                            roleLabel={roleLabel}
                                            completionPct={pct}
                                            journeyLabel={journeyAction.label}
                                            onStartOrOpenJourney={() =>
                                              handleBusinessJourneyAction(roleCode)
                                            }
                                            busy={startingJourney}
                                          />
                                        ) : (
                                          <ChanakyaJourneyGuidanceCard
                                            mode="open"
                                            userFirstName={advisorFirstName}
                                            roleLabel={roleLabel}
                                            completionPct={pct}
                                            journeyLabel={journeyAction.label}
                                            onStartOrOpenJourney={() =>
                                              handleBusinessJourneyAction(roleCode)
                                            }
                                            busy={startingJourney}
                                          />
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                                {assignedRoles.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={5}
                                      className="px-2.5 py-4 text-center text-zinc-500"
                                    >
                                      No roles assigned. Use + Add Role to begin.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                        </div>
                      </div>
                    </>
                  )}

                  {tab === "identity" && (
                    <div className="flex min-h-0 flex-col rounded-lg border border-zinc-800 bg-zinc-900/40">
                      <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                            Edit Contact
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            Identity SSOT — edit only when needed.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-zinc-300"
                          onClick={() => setTab("overview")}
                        >
                          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                          Dashboard
                        </Button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-foreground [&_.bg-card]:bg-zinc-900 [&_.bg-card]:text-zinc-100 [&_.border-border\/70]:border-zinc-800 [&_label]:text-zinc-400">
                        {identityForm(false)}
                        {error && (
                          <p className="mt-2 rounded-lg border border-violet-300/50 bg-violet-50/80 px-3 py-2 text-sm text-violet-950 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
                            {error}
                          </p>
                        )}
                      </div>
                      <div className="sticky bottom-0 z-10 flex flex-wrap gap-2 border-t border-zinc-800 bg-zinc-950/95 px-3 py-2.5 backdrop-blur">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-lg"
                          disabled={saving}
                          onClick={() => {
                            saveIdentity(false);
                            setTab("overview");
                          }}
                        >
                          Save & Continue
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg border-zinc-700"
                          onClick={() => setTab("overview")}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {tab === "relationships" && active && (
                    <EnterpriseRelationshipWorkspace
                      contact={active}
                      onAddRelationship={() => setTab("companies")}
                    />
                  )}

                  {tab === "companies" && active && (
                    <ContactEntityWorkspaceShell
                      title="Companies"
                      description="Companies linked to this contact via the Company Registry."
                      actionLabel="Open Directory"
                      onAction={() => router.push(ROUTES.CONTACTS)}
                    >
                      {listContactCompanyLinks(active.id).length === 0 ? (
                        <p className="text-sm text-zinc-500">No company links yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {listContactCompanyLinks(active.id).map((link) => {
                            const company = getEcmCompany(link.companyId);
                            return (
                              <li
                                key={link.id}
                                className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm font-medium text-zinc-100">
                                    {company?.companyName ?? "Company"}
                                  </p>
                                  <p className="text-[11px] text-zinc-500">
                                    {ECM_COMPANY_RELATION_ROLE_LABELS[link.relationRole] ??
                                      link.relationRole}
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </ContactEntityWorkspaceShell>
                  )}

                  {tab === "opportunities" && (
                    <ContactEntityWorkspaceShell
                      title="Opportunities"
                      description="Opportunity Workspace for journeys linked to this contact."
                      actionLabel="Open Opportunities"
                      onAction={() => router.push(ROUTES.OPPORTUNITY_WORKSPACE)}
                    >
                      <p className="text-sm text-zinc-500">
                        Continue from Relationships or Role Dashboard into Opportunity Workspace —
                        context is preserved from this contact.
                      </p>
                    </ContactEntityWorkspaceShell>
                  )}

                  {tab === "loans" && active && (
                    <ContactEntityWorkspaceShell
                      title="Loans"
                      description="Loan files linked to this contact."
                      actionLabel="Open Loan Files"
                      onAction={() => router.push(ROUTES.LOAN_FILES)}
                    >
                      {findActiveLoanForContact(active) ? (
                        <p className="text-sm text-zinc-200">
                          Active loan found · continue execution from Loan Workspace.
                        </p>
                      ) : (
                        <p className="text-sm text-zinc-500">No active loan files for this contact.</p>
                      )}
                    </ContactEntityWorkspaceShell>
                  )}

                  {tab === "investments" && (
                    <ContactEntityWorkspaceShell
                      title="Investments"
                      description="Investment relationships for this contact."
                      actionLabel="Open Investments"
                      onAction={() => router.push(ROUTES.INVESTMENTS)}
                    >
                      <p className="text-sm text-zinc-500">
                        Investment product line workspace — linked via Relationships when available.
                      </p>
                    </ContactEntityWorkspaceShell>
                  )}

                  {tab === "documents" && (
                    <ContactEntityWorkspaceShell
                      title="Documents"
                      description="Document Center for this contact’s journeys."
                      actionLabel="Open Document Center"
                      onAction={() => router.push(ROUTES.DOCUMENT_CENTER)}
                    >
                      <p className="text-sm text-zinc-500">
                        Open Document Center from an active loan or opportunity for full checklist
                        execution.
                      </p>
                    </ContactEntityWorkspaceShell>
                  )}

                  {tab === "communication" && (
                    <ContactEntityWorkspaceShell
                      title="Communication"
                      description="Communication Hub for this contact."
                      actionLabel="Open Communication"
                      onAction={() => router.push(ROUTES.COMMUNICATION)}
                    >
                      <p className="text-sm text-zinc-500">
                        Relationship-aware communication templates filter by recipient and journey
                        context.
                      </p>
                    </ContactEntityWorkspaceShell>
                  )}

                  {tab === "timeline" && (
                    <ContactEntityWorkspaceShell
                      title="Timeline"
                      description="Dialogue and activity timeline for this contact."
                      actionLabel="Open Timeline"
                      onAction={() => router.push(ROUTES.DIALOGUE)}
                    >
                      <p className="text-sm text-zinc-500">
                        Timeline entries accumulate from relationships, loans, and communications.
                      </p>
                    </ContactEntityWorkspaceShell>
                  )}

                  {currentStep?.kind === "role" && renderRolePanel(currentStep)}
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="shrink-0 space-y-3 border-b border-zinc-800 px-6 pb-4 pt-5 text-left">
                <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-50">
                  Add Contact
                </DialogTitle>
                <DialogDescription className="text-sm text-zinc-400">
                  Prefer Quick Contact Creation from the registry for the guided wizard.
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl space-y-5 px-6 py-6 text-foreground">
                  {identityForm(true)}
                  {error && (
                    <p className="rounded-lg border border-violet-300/50 bg-violet-50/80 px-3 py-2 text-sm text-violet-950 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
                      {error}
                    </p>
                  )}
                </div>
                {footerActions({
                  onSave: () => saveIdentity(false),
                  onSaveNext: () => saveIdentity(true),
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={closeApi.confirmOpen}
        onOpenChange={closeApi.setConfirmOpen}
        onDiscard={closeApi.handleDiscard}
        onSaveAndClose={closeApi.handleSaveAndClose}
        saving={closeApi.saving}
      />

      <PotentialDuplicateContactDialog
        open={dupOpen}
        onOpenChange={setDupOpen}
        contact={dupContact}
        matchField={dupField}
        onOpenExisting={(existing) => {
          setDupOpen(false);
          onOpenChange(false);
          if (onOpenExisting) {
            onOpenExisting(existing);
            return;
          }
          onSaved(existing);
        }}
      />

      <ActiveOpportunityConflictDialog
        open={Boolean(activeOppConflict)}
        productLabel={activeOppConflict?.productLabel ?? "Home Loan"}
        existing={
          activeOppConflict?.existing ??
          ({
            id: "",
            opportunityNumber: "",
            primaryContactId: "",
            productFamily: "lending",
            requirementStage: "raw_lead",
          } satisfies EnterpriseOpportunityApiRecord)
        }
        message={activeOppConflict?.message ?? ""}
        canOverride={canOverrideActiveOpportunity}
        busy={startingJourney}
        onOpenExisting={handleOpenExistingActiveOpportunity}
        onOverride={() => void handleOverrideCreateOpportunity()}
        onCancel={() => setActiveOppConflict(null)}
      />

      <SoftDeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        recordLabel={active?.name ?? "Contact"}
        busy={deleting}
        onConfirm={async (reason) => {
          if (!active) return;
          setDeleting(true);
          try {
            await softDeleteApi.softDelete({
              module: "contacts",
              entityId: active.id,
              reason,
            });
            setDeleteOpen(false);
            onOpenChange(false);
            onDeleted?.(active.id);
          } catch (err) {
            window.alert(err instanceof Error ? err.message : "Delete failed");
          } finally {
            setDeleting(false);
          }
        }}
      />
    </>
  );
}
