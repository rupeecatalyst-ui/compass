"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Circle } from "lucide-react";
import {
  getEcmRoleDefinition,
} from "@/constants/enterprise-contact-master";
import {
  archiveEcmContact,
  buildEcmWorkspaceTabs,
  getEcmContactAssignedRoles,
  registerEcmContact,
  updateEcmContact,
} from "@/lib/enterprise-contact-master";
import type { EcmWorkspaceTab } from "@/lib/enterprise-contact-master";
import { listEdcTimeline } from "@/lib/enterprise-dialogue-center";
import type { EcmContact, EcmContactRole } from "@/types/enterprise-contact-master";
import { ContactRoleChips } from "@/components/catalyst-one/contacts/contact-role-chips";
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

function IdentitySummaryCard({ contact }: { contact: EcmContact }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-slate-50 to-white p-4 dark:from-zinc-900 dark:to-zinc-950">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Identity (already collected)
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
          <p className="text-xs text-muted-foreground">Roles</p>
          <ContactRoleChips roles={contact.roles} className="mt-1" />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm shadow-black/[0.02]">
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
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
  const isCreate = mode === "create" || !contact;
  const [draftSaved, setDraftSaved] = useState<EcmContact | null>(null);
  const active = draftSaved ?? contact;

  const [name, setName] = useState("");
  const [mobilePrimary, setMobilePrimary] = useState("");
  const [mobileSecondary, setMobileSecondary] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [roles, setRoles] = useState<EcmContactRole[]>(["customer"]);
  const [roleProfiles, setRoleProfiles] = useState<
    Partial<Record<EcmContactRole, Record<string, string>>>
  >({});
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(initialTab);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDraftSaved(null);
    setCompletedSteps(new Set());
    setTab(initialTab);
    if (contact && mode === "edit") {
      setName(contact.name);
      setMobilePrimary(contact.mobilePrimary);
      setMobileSecondary(contact.mobileSecondary ?? "");
      setPersonalEmail(contact.personalEmail ?? "");
      setOfficialEmail(contact.officialEmail ?? "");
      setRoles(getEcmContactAssignedRoles(contact));
      setRoleProfiles(contact.roleProfiles ?? {});
      setCompletedSteps(new Set(["identity"]));
    } else {
      setName("");
      setMobilePrimary("");
      setMobileSecondary("");
      setPersonalEmail("");
      setOfficialEmail("");
      setRoles(["customer"]);
      setRoleProfiles({});
    }
  }, [open, contact, mode, initialTab]);

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

  const timeline = useMemo(() => {
    if (!active) return [];
    return listEdcTimeline().filter(
      (e) =>
        e.contextRef.id === active.id ||
        (typeof e.description === "string" && e.description.includes(active.name)),
    );
  }, [active]);

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

  const goToStep = (stepId: string) => setTab(stepId);

  const goNext = () => {
    const next = workspaceTabs[stepIndex + 1];
    if (next) setTab(next.id);
  };

  const goPrev = () => {
    const prev = workspaceTabs[stepIndex - 1];
    if (prev) setTab(prev.id);
  };

  const saveIdentity = (thenNext: boolean) => {
    setError(null);
    setSaving(true);
    try {
      if (isCreate && !draftSaved) {
        const created = registerEcmContact({
          name,
          mobilePrimary,
          mobileSecondary: mobileSecondary || undefined,
          personalEmail: personalEmail || undefined,
          officialEmail: officialEmail || undefined,
          roles,
          ownerName: "Platform Admin",
          createdBy: actorId,
        });
        setDraftSaved(created);
        onSaved(created);
        markComplete("identity");
        if (thenNext) {
          const tabs = buildEcmWorkspaceTabs(created.roles);
          const firstRole = tabs.find((t) => t.kind === "role") ?? tabs[1];
          if (firstRole) setTab(firstRole.id);
        }
      } else if (active) {
        const updated = updateEcmContact(
          active.id,
          {
            name,
            mobilePrimary,
            mobileSecondary: mobileSecondary || undefined,
            personalEmail: personalEmail || undefined,
            officialEmail: officialEmail || undefined,
            roles,
            roleProfiles,
          },
          actorId,
        );
        setDraftSaved(updated);
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
      const updated = updateEcmContact(
        active.id,
        { roleProfiles },
        actorId,
      );
      setDraftSaved(updated);
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

  const saveOperationalStep = (stepId: string, thenNext: boolean) => {
    markComplete(stepId);
    if (thenNext) goNext();
    else onOpenChange(false);
  };

  const setRoleField = (role: EcmContactRole, key: string, value: string) => {
    setRoleProfiles((prev) => ({
      ...prev,
      [role]: { ...(prev[role] ?? {}), [key]: value },
    }));
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

  const renderRolePanel = (step: EcmWorkspaceTab) => {
    if (!active || !step.roleCode) return null;
    const def = getEcmRoleDefinition(step.roleCode);
    if (!def) return null;
    const values = roleProfiles[step.roleCode] ?? {};

    return (
      <div className="space-y-4">
        <IdentitySummaryCard contact={active} />
        <SectionCard
          title={`${def.label} details`}
          description="Only role-specific information is requested here. Identity fields are never re-entered."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {def.roleSpecificFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">{field.label}</Label>
                <Input
                  value={values[field.key] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(e) => setRoleField(step.roleCode!, field.key, e.target.value)}
                  className="h-10 rounded-xl"
                />
                {field.hint && <p className="text-[11px] text-muted-foreground">{field.hint}</p>}
              </div>
            ))}
          </div>
        </SectionCard>
        {footerActions({
          onSave: () => saveRoleStep(step.roleCode!, false),
          onSaveNext: () => saveRoleStep(step.roleCode!, true),
        })}
      </div>
    );
  };

  return (
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
                {isCreate && !draftSaved ? "Add Contact" : active?.name ?? "Contact Workspace"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                {active
                  ? `Step ${stepIndex + 1} of ${workspaceTabs.length} · ${currentStep?.label ?? "Workspace"}`
                  : "Capture identity once. Roles unlock guided workspaces automatically."}
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
                      !current && done && "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200",
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
          {!active ? (
            <div className="space-y-0">
              <div className="mx-auto max-w-3xl space-y-5 px-6 py-6">
                <SectionCard
                  title="Person identity"
                  description="Common person information only. Role details are collected after Save & Next."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Contact Name</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full legal name"
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Mobile</Label>
                      <Input
                        value={mobilePrimary}
                        onChange={(e) => setMobilePrimary(e.target.value)}
                        className="h-10 rounded-xl"
                      />
                    </div>
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
                  </div>
                </SectionCard>
                <SectionCard
                  title="Assigned roles"
                  description="Select every role this person performs. Each role unlocks a dedicated workspace step."
                >
                  <ContactRoleChips
                    roles={roles}
                    selected={roles}
                    interactive
                    size="md"
                    onToggle={toggleRole}
                  />
                </SectionCard>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              {footerActions({
                onSave: () => saveIdentity(false),
                onSaveNext: () => saveIdentity(true),
              })}
            </div>
          ) : (
            <div className="space-y-0">
              <div className="space-y-5 px-6 py-6">
                {tab === "identity" && (
                  <>
                    <SectionCard title="Identity" description="Edit person-level fields. Changes flow into every role workspace.">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Contact Name</Label>
                          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label>Primary Mobile</Label>
                          <Input
                            value={mobilePrimary}
                            onChange={(e) => setMobilePrimary(e.target.value)}
                            className="h-10 rounded-xl"
                          />
                        </div>
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
                        <div className="space-y-2 md:col-span-2">
                          <Label>Assigned Roles</Label>
                          <ContactRoleChips roles={roles} selected={roles} interactive size="md" onToggle={toggleRole} />
                        </div>
                      </div>
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
                    </SectionCard>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    {footerActions({
                      onSave: () => saveIdentity(false),
                      onSaveNext: () => saveIdentity(true),
                    })}
                    <div className="px-0">
                      <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => {
                        archiveEcmContact(active.id, actorId);
                        onOpenChange(false);
                      }}>
                        Archive contact
                      </Button>
                    </div>
                  </>
                )}

                {currentStep?.kind === "role" && renderRolePanel(currentStep)}

                {tab === "documents" && (
                  <>
                    <IdentitySummaryCard contact={active} />
                    <SectionCard title="Documents" description="EDIE artefacts linked to this Contact SSOT.">
                      <p className="text-sm text-muted-foreground">
                        No documents linked in this dry-run registry. Link documents from Opportunities or Loan Files without re-entering identity.
                      </p>
                    </SectionCard>
                    {footerActions({
                      onSave: () => saveOperationalStep("documents", false),
                      onSaveNext: () => saveOperationalStep("documents", true),
                    })}
                  </>
                )}

                {tab === "timeline" && (
                  <>
                    <IdentitySummaryCard contact={active} />
                    <SectionCard title="Timeline" description="Business interactions associated with this person.">
                      {timeline.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No timeline events yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {timeline.map((event) => (
                            <div
                              key={event.id}
                              className="rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm"
                            >
                              <p className="font-medium">{event.title}</p>
                              <p className="text-muted-foreground">{event.description}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{formatTs(event.occurredOn)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </SectionCard>
                    {footerActions({
                      onSave: () => saveOperationalStep("timeline", false),
                      onSaveNext: () => saveOperationalStep("timeline", true),
                    })}
                  </>
                )}

                {tab === "communication" && (
                  <>
                    <IdentitySummaryCard contact={active} />
                    <SectionCard title="Communication" description="ENCE notification history for this contact.">
                      <p className="text-sm text-muted-foreground">
                        Outbound delivery remains simulation-only. Communication events will attach to this Contact ID.
                      </p>
                    </SectionCard>
                    {footerActions({
                      onSave: () => saveOperationalStep("communication", false),
                      onSaveNext: () => saveOperationalStep("communication", true),
                    })}
                  </>
                )}

                {tab === "audit" && (
                  <>
                    <IdentitySummaryCard contact={active} />
                    <SectionCard title="Audit" description="Enterprise audit trail for Contact Master changes.">
                      <p className="text-sm text-muted-foreground">
                        Created {formatTs(active.createdOn)} · Last modified {formatTs(active.modifiedOn)} · Score{" "}
                        {active.contactScore}
                      </p>
                    </SectionCard>
                    {footerActions({
                      onSave: () => saveOperationalStep("audit", false),
                      showFinish: true,
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
