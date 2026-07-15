"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Plus, Search, X } from "lucide-react";
import {
  ECM_COMPANY_RELATION_ROLE_LABELS,
  ECM_COMPANY_RELATION_ROLES,
} from "@/constants/enterprise-company-master";
import { getEcmMasterLabel } from "@/constants/enterprise-contact-master";
import { ROUTES } from "@/constants/routes";
import {
  deriveEcmCompanyReadiness,
  getEcmCompany,
  linkCompanyContact,
  listCompanyLinks,
  registerEcmCompany,
  updateEcmCompany,
} from "@/lib/enterprise-company-master";
import {
  listEcmContacts,
  registerEcmContact,
  normalizeEcmMobile,
  normalizePersonName,
} from "@/lib/enterprise-contact-master";
import type { EcmCompany, EcmCompanyRelationRole } from "@/types/enterprise-company-master";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { EcmMasterSelect } from "@/components/catalyst-one/contacts/ecm-master-select";
import { UnsavedChangesDialog } from "@/components/catalyst-one/shared/unsaved-changes-dialog";
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
}: CompanyWorkspaceModalProps) {
  const [tab, setTab] = useState<CompanyTab>("identity");
  const [draftId, setDraftId] = useState<string | null>(null);
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
  const [relSearch, setRelSearch] = useState("");
  const [newRelName, setNewRelName] = useState("");
  const [newRelMobile, setNewRelMobile] = useState("");
  const [newRelRole, setNewRelRole] = useState<EcmCompanyRelationRole>("director");
  const [busy, setBusy] = useState(false);
  const baselineRef = useRef("");

  useEffect(() => {
    if (!open) return;
    setTab("identity");
    if (company) {
      setDraftId(company.id);
      setCompanyName(company.companyName);
      setConstitution(company.constitution ?? "");
      setCin(company.cin ?? "");
      setPan(company.pan ?? "");
      setGst(company.gst ?? "");
      setDoi(company.dateOfIncorporation ?? "");
      setAddress(company.registeredAddress ?? "");
      setIndustry(company.industry ?? "");
      setNature(company.natureOfBusiness ?? "");
      setYears(company.yearsInBusiness ?? "");
      setTurnover(company.annualTurnover ?? "");
      setProfit(company.approximateNetProfit ?? "");
      setEmployees(company.employeeStrength ?? "");
      setWebsite(company.website ?? "");
      baselineRef.current = company.companyName;
    } else {
      setDraftId(null);
      setCompanyName(initialCompanyName?.trim() || "");
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
      baselineRef.current = initialCompanyName?.trim() || "";
    }
  }, [open, company, initialCompanyName]);

  const liveCompany = draftId ? getEcmCompany(draftId) ?? company : company;

  const links = useMemo(() => {
    void linkTick;
    if (!draftId) return [];
    return listCompanyLinks(draftId);
  }, [draftId, linkTick]);

  const contactsById = useMemo(() => {
    const map = new Map<string, EcmContact>();
    for (const c of listEcmContacts()) map.set(c.id, c);
    return map;
  }, [linkTick]);

  const searchHits = useMemo(() => {
    const q = relSearch.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return listEcmContacts()
      .filter((c) => {
        const hay = `${c.name} ${c.mobilePrimary} ${c.personalEmail ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [relSearch, linkTick]);

  const readiness = useMemo(
    () => (liveCompany ? deriveEcmCompanyReadiness(liveCompany) : null),
    [liveCompany, linkTick],
  );

  const persistIdentity = () => {
    if (!companyName.trim()) {
      toast.message("Company Name is required.");
      return null;
    }
    setBusy(true);
    try {
      if (!draftId) {
        const created = registerEcmCompany({
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
          linkCompanyContact({
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
      const updated = updateEcmCompany(
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
      toast.success("Company identity updated.");
      return updated;
    } catch (e) {
      toast.message(e instanceof Error ? e.message : "Could not save company.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const persistBusiness = () => {
    let targetId = draftId;
    if (!targetId) {
      const created = persistIdentity();
      if (!created) return;
      targetId = created.id;
    }
    setBusy(true);
    try {
      const updated = updateEcmCompany(
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
    } catch (e) {
      toast.message(e instanceof Error ? e.message : "Could not save business profile.");
    } finally {
      setBusy(false);
    }
  };

  const linkExisting = (contactId: string) => {
    if (!draftId) {
      toast.message("Save Company Identity first.");
      return;
    }
    linkCompanyContact({
      companyId: draftId,
      contactId,
      relationRole: newRelRole,
      createdBy: actorId,
    });
    setRelSearch("");
    setLinkTick((n) => n + 1);
    toast.success("Relationship linked — contact stored once.");
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
    try {
      const contact = registerEcmContact({
        name,
        mobilePrimary: mobile,
        roles: ["customer"],
        ownerName,
        createdBy: actorId,
      });
      linkCompanyContact({
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
  };

  const tabs: { id: CompanyTab; label: string }[] = [
    { id: "identity", label: "Company Identity" },
    { id: "business", label: "Business Profile" },
    { id: "relationships", label: "Relationships" },
    { id: "readiness", label: "Business Readiness" },
  ];

  const hasUnsavedChanges =
    open &&
    (companyName.trim() !== baselineRef.current.trim() ||
      Boolean(constitution || cin || pan || gst || address || industry || nature));

  const closeApi = useWorkspaceClose({
    onClose: () => onOpenChange(false),
    hasUnsavedChanges,
    enableEscapeKey: false,
    onSaveAndClose: () => {
      const saved = persistIdentity();
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
              onClick={closeApi.requestClose}
            >
              <X className="h-4 w-4" />
            </Button>
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
              <p className="text-xs text-zinc-400">
                Company Name was captured on the entry screen — do not re-enter a Business Name.
              </p>
              <Field label="Company Name">
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="border-zinc-700 bg-zinc-900"
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
                onClick={() => {
                  const saved = persistIdentity();
                  if (saved) setTab("business");
                }}
              >
                Save & Continue
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {tab === "business" && (
            <div className="space-y-4">
              <Field label="Industry">
                <EcmMasterSelect
                  domain="industry"
                  value={industry}
                  onChange={(id) => setIndustry(id)}
                  placeholder="Select industry…"
                />
              </Field>
              <Field label="Nature of Business">
                <EcmMasterSelect
                  domain="nature_of_business"
                  value={nature}
                  onChange={(id) => setNature(id)}
                  placeholder="Search nature of business…"
                  searchPlaceholder="Search nature of business…"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Years in Business">
                  <Input value={years} onChange={(e) => setYears(e.target.value)} className="border-zinc-700 bg-zinc-900" />
                </Field>
                <Field label="Annual Turnover">
                  <Input value={turnover} onChange={(e) => setTurnover(e.target.value)} className="border-zinc-700 bg-zinc-900" />
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
                onClick={() => {
                  persistBusiness();
                  setTab("relationships");
                }}
              >
                Save & Continue
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {tab === "relationships" && (
            <div className="space-y-5">
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
                className="rounded-xl bg-violet-600 hover:bg-violet-500"
                onClick={() => setTab("readiness")}
              >
                Continue to Readiness
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {tab === "readiness" && readiness && liveCompany && (
            <div className="space-y-4">
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
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-300">{label}</Label>
      {children}
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
