"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Plus, Search, Trash2, X } from "lucide-react";
import {
  ECM_COMPANY_RELATION_ROLE_LABELS,
  ECM_COMPANY_RELATION_ROLES,
} from "@/constants/enterprise-company-master";
import { getEcmMasterLabel } from "@/constants/enterprise-contact-master";
import { ROUTES } from "@/constants/routes";
import {
  deriveEcmCompanyReadiness,
  getEcmCompany,
  listCompanyLinks,
} from "@/lib/enterprise-company-master";
import {
  listOperationalEcmContacts,
  searchOperationalContacts,
  findOperationalEcmContactById,
} from "@/lib/enterprise-registry";
import {
  normalizeEcmMobile,
  normalizePersonName,
} from "@/lib/enterprise-contact-master";
import { useEnterpriseRegistry } from "@/hooks/use-enterprise-registry";
import {
  persistLinkCompanyContact,
  persistRegisterEcmCompany,
  persistRegisterEcmContact,
  persistUpdateEcmCompany,
} from "@/lib/enterprise-persistence";
import type { EcmCompany, EcmCompanyRelationRole } from "@/types/enterprise-company-master";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { EcmMasterSelect } from "@/components/catalyst-one/contacts/ecm-master-select";
import { UnsavedChangesDialog } from "@/components/catalyst-one/shared/unsaved-changes-dialog";
import { SoftDeleteConfirmDialog } from "@/components/enterprise/soft-delete/soft-delete-dialogs";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { canSoftDelete, softDeleteApi } from "@/lib/enterprise-soft-delete";
import { isEnterprisePersistencePrisma } from "@/lib/enterprise-persistence";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CompanyTab = "identity" | "business" | "relationships" | "readiness";

const COMPANY_TABS: { id: CompanyTab; label: string }[] = [
  { id: "identity", label: "Company Identity" },
  { id: "business", label: "Business Profile" },
  { id: "relationships", label: "Relationship" },
  { id: "readiness", label: "Business Readiness" },
];

type CompanyFieldErrors = Partial<
  Record<
    | "companyName"
    | "constitution"
    | "industry"
    | "nature"
    | "years"
    | "turnover"
    | "_form",
    string
  >
>;

export interface CompanyWorkspaceModalProps {
  open: boolean;
  mode: "create" | "edit";
  company: EcmCompany | null;
  initialCompanyName?: string;
  actorId?: string;
  ownerName?: string;
  /** Optional contact to link after create (Individual + Company flow). */
  linkContactId?: string;
  linkRelationRole?: EcmCompanyRelationRole;
  onOpenChange: (open: boolean) => void;
  onSaved: (company: EcmCompany) => void;
  /** Fired after final step — wizard should close and registry refresh. */
  onCompleted?: (company: EcmCompany) => void;
  /** CO-SPRINT-119 — called after soft delete succeeds. */
  onDeleted?: (companyId: string) => void;
}

/**
 * Prompt 012 — Company Workspace (tab-based).
 * Does not reuse Individual Business Profile.
 */
export function CompanyWorkspaceModal({
  open,
  mode,
  company,
  initialCompanyName,
  actorId = "ui",
  ownerName = "Platform Admin",
  linkContactId,
  linkRelationRole = "director",
  onOpenChange,
  onSaved,
  onCompleted,
  onDeleted,
}: CompanyWorkspaceModalProps) {
  const { user } = useAuthContext();
  const [tab, setTab] = useState<CompanyTab>("identity");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const allowDelete =
    mode === "edit" &&
    Boolean(company) &&
    canSoftDelete(user?.role ?? "VIEWER") &&
    isEnterprisePersistencePrisma();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CompanyFieldErrors>({});
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [constitution, setConstitution] = useState("");
  const [cin, setCin] = useState("");
  const [pan, setPan] = useState("");
  const [gst, setGst] = useState("");
  const [doi, setDoi] = useState("");
  const [address, setAddress] = useState("");
  const [industry, setIndustry] = useState("");
  const [nature, setNature] = useState("");
  const [years, setYears] = useState("");
  const [turnover, setTurnover] = useState("");
  const [profit, setProfit] = useState("");
  const [employees, setEmployees] = useState("");
  const [website, setWebsite] = useState("");
  const [linkTick, setLinkTick] = useState(0);
  const { registryVersion } = useEnterpriseRegistry({
    hydrateOnMount: true,
    refreshOnOpen: true,
    open,
  });
  const [relSearch, setRelSearch] = useState("");
  const [newRelName, setNewRelName] = useState("");
  const [newRelMobile, setNewRelMobile] = useState("");
  const [newRelRole, setNewRelRole] = useState<EcmCompanyRelationRole>("director");
  const [busy, setBusy] = useState(false);
  const baselineRef = useRef("");
  const wasOpenRef = useRef(false);

  const hydrateFromCompany = (source: EcmCompany) => {
    setDraftId(source.id);
    setCompanyName(source.companyName);
    setConstitution(source.constitution ?? "");
    setCin(source.cin ?? "");
    setPan(source.pan ?? "");
    setGst(source.gst ?? "");
    setDoi(source.dateOfIncorporation ?? "");
    setAddress(source.registeredAddress ?? "");
    setIndustry(source.industry ?? "");
    setNature(source.natureOfBusiness ?? "");
    setYears(source.yearsInBusiness ?? "");
    setTurnover(source.annualTurnover ?? "");
    setProfit(source.approximateNetProfit ?? "");
    setEmployees(source.employeeStrength ?? "");
    setWebsite(source.website ?? "");
    baselineRef.current = source.companyName;
  };

  const resetBlankForm = (name?: string) => {
    setDraftId(null);
    setCompanyName(name?.trim() || "");
    setConstitution("");
    setCin("");
    setPan("");
    setGst("");
    setDoi("");
    setAddress("");
    setIndustry("");
    setNature("");
    setYears("");
    setTurnover("");
    setProfit("");
    setEmployees("");
    setWebsite("");
    baselineRef.current = name?.trim() || "";
  };

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;

    if (justOpened) {
      setTab("identity");
      setFieldErrors({});
      setValidationMessage(null);
      if (company) {
        hydrateFromCompany(company);
      } else {
        resetBlankForm(initialCompanyName);
      }
      return;
    }

    if (company?.id && company.id !== draftId) {
      setDraftId(company.id);
    }
  }, [open, company, initialCompanyName]);

  const liveCompany = draftId ? getEcmCompany(draftId) ?? company : company;

  const links = useMemo(() => {
    void linkTick;
    if (!draftId) return [];
    return listCompanyLinks(draftId);
  }, [draftId, linkTick]);

  const contactsById = useMemo(() => {
    void linkTick;
    void registryVersion;
    const map = new Map<string, EcmContact>();
    for (const c of listOperationalEcmContacts()) map.set(c.id, c);
    return map;
  }, [linkTick, registryVersion]);

  const searchHits = useMemo(() => {
    void registryVersion;
    const q = relSearch.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return searchOperationalContacts(relSearch)
      .map((hit) => findOperationalEcmContactById(hit.id))
      .filter((c): c is EcmContact => Boolean(c))
      .slice(0, 8);
  }, [relSearch, linkTick, registryVersion]);

  const readiness = useMemo(
    () => (liveCompany ? deriveEcmCompanyReadiness(liveCompany) : null),
    [liveCompany, linkTick],
  );

  const tabIndex = COMPANY_TABS.findIndex((t) => t.id === tab);
  const nextTab = tabIndex >= 0 ? COMPANY_TABS[tabIndex + 1]?.id : undefined;

  const goToTab = (next: CompanyTab) => {
    setValidationMessage(null);
    setFieldErrors({});
    setTab(next);
  };

  const validateIdentity = (): CompanyFieldErrors => {
    const errors: CompanyFieldErrors = {};
    if (!companyName.trim()) {
      errors.companyName = "Company Name is required.";
    }
    return errors;
  };

  const validateBusiness = (): CompanyFieldErrors => {
    const errors: CompanyFieldErrors = {};
    if (!industry.trim()) errors.industry = "Industry is required.";
    if (!nature.trim()) errors.nature = "Nature of Business is required.";
    if (!years.trim()) errors.years = "Years in Business is required.";
    if (!turnover.trim()) errors.turnover = "Annual Turnover is required.";
    return errors;
  };

  const applyValidationErrors = (errors: CompanyFieldErrors, headline: string): boolean => {
    if (Object.keys(errors).length === 0) return true;
    setFieldErrors(errors);
    setValidationMessage(headline);
    toast.message(headline);
    return false;
  };

  const persistIdentity = async (): Promise<EcmCompany | null> => {
    const errors = validateIdentity();
    if (!applyValidationErrors(errors, "Complete the required Company Identity fields.")) {
      return null;
    }

    setBusy(true);
    try {
      if (!draftId) {
        const created = await persistRegisterEcmCompany({
          companyName,
          constitution,
          cin,
          pan,
          gst,
          dateOfIncorporation: doi,
          registeredAddress: address,
          ownerName,
          createdBy: actorId,
        });
        setDraftId(created.id);
        if (linkContactId) {
          await persistLinkCompanyContact({
            companyId: created.id,
            contactId: linkContactId,
            relationRole: linkRelationRole,
            createdBy: actorId,
          });
          setLinkTick((n) => n + 1);
        }
        onSaved(created);
        toast.success("Company identity saved.");
        return created;
      }
      const updated = await persistUpdateEcmCompany(
        draftId,
        {
          companyName,
          constitution,
          cin,
          pan,
          gst,
          dateOfIncorporation: doi,
          registeredAddress: address,
        },
        actorId,
      );
      onSaved(updated);
      toast.success("Company identity saved.");
      return updated;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save company.";
      setValidationMessage(message);
      toast.message(message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const persistBusiness = async (): Promise<EcmCompany | null> => {
    const errors = validateBusiness();
    if (!applyValidationErrors(errors, "Complete the required Business Profile fields.")) {
      return null;
    }

    let targetId = draftId;
    if (!targetId) {
      const created = await persistIdentity();
      if (!created) return null;
      targetId = created.id;
    }

    setBusy(true);
    try {
      const updated = await persistUpdateEcmCompany(
        targetId,
        {
          industry,
          natureOfBusiness: nature,
          yearsInBusiness: years,
          annualTurnover: turnover,
          approximateNetProfit: profit,
          employeeStrength: employees,
          website,
        },
        actorId,
      );
      onSaved(updated);
      toast.success("Business profile saved.");
      return updated;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save business profile.";
      setValidationMessage(message);
      toast.message(message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAndContinue = () => {
    void (async () => {
      if (tab === "identity") {
        const saved = await persistIdentity();
        if (saved && nextTab) goToTab(nextTab);
        return;
      }
      if (tab === "business") {
        const saved = await persistBusiness();
        if (saved && nextTab) goToTab(nextTab);
        return;
      }
      if (tab === "relationships") {
        if (!draftId) {
          const message = "Save Company Identity before continuing.";
          setValidationMessage(message);
          toast.message(message);
          return;
        }
        if (nextTab) goToTab(nextTab);
      }
    })();
  };

  const handleCompleteSetup = () => {
    void (async () => {
      const saved = await persistBusiness();
      if (!saved) {
        if (!draftId || Object.keys(validateIdentity()).length > 0) {
          goToTab("identity");
        } else {
          goToTab("business");
        }
        return;
      }

      toast.success("Company profile setup complete.");
      if (onCompleted) {
        onCompleted(saved);
      } else {
        onSaved(saved);
        onOpenChange(false);
      }
    })();
  };

  const linkExisting = (contactId: string) => {
    if (!draftId) {
      toast.message("Save Company Identity first.");
      return;
    }
    void (async () => {
      try {
        await persistLinkCompanyContact({
          companyId: draftId,
          contactId,
          relationRole: newRelRole,
          createdBy: actorId,
        });
        setRelSearch("");
        setLinkTick((n) => n + 1);
        toast.success("Relationship linked — contact stored once.");
      } catch (e) {
        toast.message(e instanceof Error ? e.message : "Could not link contact.");
      }
    })();
  };

  const createAndLink = () => {
    if (!draftId) {
      toast.message("Save Company Identity first.");
      return;
    }
    const name = normalizePersonName(newRelName);
    const mobile = normalizeEcmMobile(newRelMobile);
    if (!name || mobile.length < 10) {
      toast.message("Enter individual name and a valid mobile to create the contact.");
      return;
    }
    void (async () => {
      try {
        const contact = await persistRegisterEcmContact({
          name,
          mobilePrimary: mobile,
          roles: ["customer"],
          ownerName,
          createdBy: actorId,
        });
        await persistLinkCompanyContact({
          companyId: draftId,
          contactId: contact.id,
          relationRole: newRelRole,
          createdBy: actorId,
        });
        setNewRelName("");
        setNewRelMobile("");
        setLinkTick((n) => n + 1);
        toast.success("Individual Contact created and linked.");
      } catch (e) {
        toast.message(e instanceof Error ? e.message : "Could not create contact.");
      }
    })();
  };

  const tabs = COMPANY_TABS;

  const validationBanner =
    validationMessage ? (
      <p
        role="alert"
        className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
      >
        {validationMessage}
      </p>
    ) : null;

  const hasUnsavedChanges =
    open &&
    (companyName.trim() !== baselineRef.current.trim() ||
      Boolean(constitution || cin || pan || gst || address || industry || nature));

  const closeApi = useWorkspaceClose({
    onClose: () => onOpenChange(false),
    hasUnsavedChanges,
    enableEscapeKey: false,
    onSaveAndClose: async () => {
      const saved = await persistIdentity();
      return Boolean(saved);
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
      <DialogContent className="flex h-[min(92vh,860px)] max-w-4xl flex-col gap-0 overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-50 sm:rounded-2xl [&>button]:hidden">
        <DialogHeader className="space-y-0 border-b border-zinc-800 px-5 py-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
                <Building2 className="h-5 w-5 text-violet-300" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight text-zinc-50">
                  {companyName || "Company Workspace"}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  Company Workspace · capture once, reuse everywhere · {mode === "create" ? "Create" : "Edit"}
                </DialogDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {allowDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-red-900/60 bg-red-950/40 px-2 text-xs text-red-200 hover:bg-red-950/70"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Delete
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
                onClick={closeApi.requestClose}
                aria-label="Close workspace"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Close
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                  tab === t.id
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "identity" && (
            <div className="space-y-4">
              {validationBanner}
              <p className="text-xs text-zinc-400">
                Company Name was captured on the entry screen — do not re-enter a Business Name.
              </p>
              <Field label="Company Name" required error={fieldErrors.companyName}>
                <Input
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (fieldErrors.companyName) {
                      setFieldErrors((prev) => ({ ...prev, companyName: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.companyName)}
                  className={cn(
                    "border-zinc-700 bg-zinc-900",
                    fieldErrors.companyName && "border-amber-500 ring-1 ring-amber-500/50",
                  )}
                />
              </Field>
              <Field label="Constitution">
                <EcmMasterSelect
                  domain="constitution"
                  value={constitution}
                  onChange={(id) => setConstitution(id)}
                  placeholder="Select constitution…"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="CIN">
                  <Input value={cin} onChange={(e) => setCin(e.target.value)} className="border-zinc-700 bg-zinc-900" />
                </Field>
                <Field label="PAN">
                  <Input value={pan} onChange={(e) => setPan(e.target.value)} className="border-zinc-700 bg-zinc-900" />
                </Field>
                <Field label="GST">
                  <Input value={gst} onChange={(e) => setGst(e.target.value)} className="border-zinc-700 bg-zinc-900" />
                </Field>
              </div>
              <Field label="Date of Incorporation">
                <Input
                  type="date"
                  value={doi}
                  onChange={(e) => setDoi(e.target.value)}
                  className="border-zinc-700 bg-zinc-900"
                />
              </Field>
              <Field label="Registered Address">
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus-visible:border-violet-500/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600/40"
                />
              </Field>
              <Button
                type="button"
                disabled={busy}
                className="rounded-xl bg-violet-600 hover:bg-violet-500"
                onClick={handleSaveAndContinue}
              >
                Save & Continue
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {tab === "business" && (
            <div className="space-y-4">
              {validationBanner}
              <Field label="Industry" required error={fieldErrors.industry}>
                <EcmMasterSelect
                  domain="industry"
                  value={industry}
                  onChange={(id) => {
                    setIndustry(id);
                    if (fieldErrors.industry) {
                      setFieldErrors((prev) => ({ ...prev, industry: undefined }));
                    }
                  }}
                  placeholder="Select industry…"
                />
              </Field>
              <Field label="Nature of Business" required error={fieldErrors.nature}>
                <EcmMasterSelect
                  domain="nature_of_business"
                  value={nature}
                  onChange={(id) => {
                    setNature(id);
                    if (fieldErrors.nature) {
                      setFieldErrors((prev) => ({ ...prev, nature: undefined }));
                    }
                  }}
                  placeholder="Search nature of business…"
                  searchPlaceholder="Search nature of business…"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Years in Business" required error={fieldErrors.years}>
                  <Input
                    value={years}
                    onChange={(e) => {
                      setYears(e.target.value);
                      if (fieldErrors.years) {
                        setFieldErrors((prev) => ({ ...prev, years: undefined }));
                      }
                    }}
                    aria-invalid={Boolean(fieldErrors.years)}
                    className={cn(
                      "border-zinc-700 bg-zinc-900",
                      fieldErrors.years && "border-amber-500 ring-1 ring-amber-500/50",
                    )}
                  />
                </Field>
                <Field label="Annual Turnover" required error={fieldErrors.turnover}>
                  <Input
                    value={turnover}
                    onChange={(e) => {
                      setTurnover(e.target.value);
                      if (fieldErrors.turnover) {
                        setFieldErrors((prev) => ({ ...prev, turnover: undefined }));
                      }
                    }}
                    aria-invalid={Boolean(fieldErrors.turnover)}
                    className={cn(
                      "border-zinc-700 bg-zinc-900",
                      fieldErrors.turnover && "border-amber-500 ring-1 ring-amber-500/50",
                    )}
                  />
                </Field>
                <Field label="Approximate Net Profit (Optional)">
                  <Input value={profit} onChange={(e) => setProfit(e.target.value)} className="border-zinc-700 bg-zinc-900" />
                </Field>
                <Field label="Employee Strength (Optional)">
                  <Input value={employees} onChange={(e) => setEmployees(e.target.value)} className="border-zinc-700 bg-zinc-900" />
                </Field>
              </div>
              <Field label="Website (Optional)">
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="border-zinc-700 bg-zinc-900" />
              </Field>
              <Button
                type="button"
                disabled={busy}
                className="rounded-xl bg-violet-600 hover:bg-violet-500"
                onClick={handleSaveAndContinue}
              >
                Save & Continue
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {tab === "relationships" && (
            <div className="space-y-5">
              {validationBanner}
              <p className="text-xs text-zinc-400">
                People are always Individual Contacts. Company stores only the relationship link — never
                duplicate contacts.
              </p>

              <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <Label className="text-zinc-300">Search existing Contact Registry</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  <Input
                    value={relSearch}
                    onChange={(e) => setRelSearch(e.target.value)}
                    placeholder="Name or mobile…"
                    className="border-zinc-700 bg-zinc-950 pl-9"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={newRelRole}
                    onValueChange={(v) => setNewRelRole(v as EcmCompanyRelationRole)}
                  >
                    <SelectTrigger className="h-9 w-48 border-zinc-700 bg-zinc-950">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ECM_COMPANY_RELATION_ROLES).map((role) => (
                        <SelectItem key={role} value={role}>
                          {ECM_COMPANY_RELATION_ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {searchHits.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-[11px] text-zinc-500">{c.mobilePrimary}</p>
                    </div>
                    <Button type="button" size="sm" className="h-7 text-xs" onClick={() => linkExisting(c.id)}>
                      Link
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <Label className="text-zinc-300">Or create a new Individual Contact</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={newRelName}
                    onChange={(e) => setNewRelName(e.target.value)}
                    placeholder="Individual name"
                    className="border-zinc-700 bg-zinc-950"
                  />
                  <Input
                    value={newRelMobile}
                    onChange={(e) => setNewRelMobile(e.target.value)}
                    placeholder="Mobile"
                    className="border-zinc-700 bg-zinc-950"
                  />
                </div>
                <Button type="button" size="sm" className="h-8 gap-1.5" onClick={createAndLink}>
                  <Plus className="h-3.5 w-3.5" />
                  Create Contact & Link
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Linked relationships
                </p>
                {links.length === 0 && (
                  <p className="text-sm text-zinc-500">No relationships yet.</p>
                )}
                {links.map((link) => {
                  const person = contactsById.get(link.contactId);
                  return (
                    <div
                      key={link.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{person?.name ?? "Contact"}</p>
                        <p className="text-[11px] text-zinc-500">
                          {ECM_COMPANY_RELATION_ROLE_LABELS[link.relationRole] ?? link.relationRole}
                          {person?.mobilePrimary ? ` · ${person.mobilePrimary}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                disabled={busy}
                className="rounded-xl bg-violet-600 hover:bg-violet-500"
                onClick={handleSaveAndContinue}
              >
                Save & Continue
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {tab === "readiness" && readiness && liveCompany && (
            <div className="space-y-4">
              {validationBanner}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Company Completion
                </p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{readiness.overallPct}%</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${readiness.overallPct}%` }}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatusTile label="Identity Status" pct={readiness.identityPct} ok={readiness.identityComplete} />
                <StatusTile
                  label="Business Profile Status"
                  pct={readiness.businessPct}
                  ok={readiness.businessComplete}
                />
                <StatusTile
                  label="Relationship Status"
                  pct={readiness.relationshipPct}
                  ok={readiness.relationshipsPresent}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="h-9 rounded-lg">
                  <Link href={ROUTES.LOAN_FILES}>Start Loan Journey</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="h-9 rounded-lg border-zinc-700">
                  <Link href={`${ROUTES.CONTACTS}?create=1&intent=investor`}>Start Investment Journey</Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-lg border-zinc-700"
                  onClick={() => setTab("relationships")}
                >
                  Add Another Relationship
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-9 rounded-lg"
                  onClick={() => toast.success("You are in Company Workspace.")}
                >
                  Open Company Workspace
                </Button>
              </div>
              <p className="text-[11px] text-zinc-500">
                Industry: {industry ? getEcmMasterLabel("industry", industry) : "—"} · Nature:{" "}
                {nature ? getEcmMasterLabel("nature_of_business", nature) : "—"}
              </p>
              <Button
                type="button"
                disabled={busy}
                className="rounded-xl bg-violet-600 hover:bg-violet-500"
                onClick={handleCompleteSetup}
              >
                Complete Company Profile
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {tab === "readiness" && !readiness && (
            <p className="text-sm text-zinc-400">Save Company Identity to view readiness.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <UnsavedChangesDialog
      open={closeApi.confirmOpen}
      onOpenChange={closeApi.setConfirmOpen}
      onDiscard={closeApi.handleDiscard}
      onSaveAndClose={closeApi.handleSaveAndClose}
      saving={closeApi.saving || busy}
    />
    <SoftDeleteConfirmDialog
      open={deleteOpen}
      onOpenChange={setDeleteOpen}
      recordLabel={company?.companyName || companyName || "Company"}
      busy={deleting}
      onConfirm={async (reason) => {
        if (!company) return;
        setDeleting(true);
        try {
          await softDeleteApi.softDelete({
            module: "companies",
            entityId: company.id,
            reason,
          });
          setDeleteOpen(false);
          onOpenChange(false);
          onDeleted?.(company.id);
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

function Field({
  label,
  children,
  required,
  error,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-300">
        {label}
        {required ? <span className="text-amber-400"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-amber-400">{error}</p> : null}
    </div>
  );
}

function StatusTile({ label, pct, ok }: { label: string; pct: number; ok: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{pct}%</p>
      <p className={cn("text-[11px]", ok ? "text-emerald-400" : "text-amber-400")}>
        {ok ? "Ready" : "Needs attention"}
      </p>
    </div>
  );
}
