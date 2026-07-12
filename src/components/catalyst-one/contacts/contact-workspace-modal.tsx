"use client";

import { useEffect, useMemo, useState } from "react";
import {
  archiveEcmContact,
  buildEcmWorkspaceTabs,
  getEcmContactAssignedRoles,
  registerEcmContact,
  updateEcmContact,
} from "@/lib/enterprise-contact-master";
import { listEdcTimeline } from "@/lib/enterprise-dialogue-center";
import type { EcmContact, EcmContactRole } from "@/types/enterprise-contact-master";
import { ContactRoleChips } from "@/components/catalyst-one/contacts/contact-role-chips";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(initialTab);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDraftSaved(null);
    setTab(initialTab);
    if (contact && mode === "edit") {
      setName(contact.name);
      setMobilePrimary(contact.mobilePrimary);
      setMobileSecondary(contact.mobileSecondary ?? "");
      setPersonalEmail(contact.personalEmail ?? "");
      setOfficialEmail(contact.officialEmail ?? "");
      setRoles(getEcmContactAssignedRoles(contact));
    } else {
      setName("");
      setMobilePrimary("");
      setMobileSecondary("");
      setPersonalEmail("");
      setOfficialEmail("");
      setRoles(["customer"]);
    }
  }, [open, contact, mode, initialTab]);

  const workspaceTabs = useMemo(
    () => buildEcmWorkspaceTabs(active ? getEcmContactAssignedRoles(active) : roles),
    [active, roles],
  );

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

  const saveIdentity = () => {
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
        const tabs = buildEcmWorkspaceTabs(created.roles);
        const firstRole = tabs.find((t) => t.kind === "role");
        if (firstRole) setTab(firstRole.id);
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
          },
          actorId,
        );
        setDraftSaved(updated);
        onSaved(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  const onArchive = () => {
    if (!active) return;
    const updated = archiveEcmContact(active.id, actorId);
    setDraftSaved(updated);
    onSaved(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] w-[80vw] max-w-[80vw] flex-col gap-0 overflow-hidden p-0 sm:rounded-xl",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="text-xl">
            {isCreate && !draftSaved ? "Add Contact" : active?.name ?? "Contact Workspace"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Contact is the single source of truth for the person. Roles activate dynamic workspace tabs.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {!active ? (
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Contact Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label>Primary Mobile</Label>
                  <Input value={mobilePrimary} onChange={(e) => setMobilePrimary(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Secondary Mobile</Label>
                  <Input value={mobileSecondary} onChange={(e) => setMobileSecondary(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Personal Email</Label>
                  <Input value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Official Email</Label>
                  <Input value={officialEmail} onChange={(e) => setOfficialEmail(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Assigned Roles</Label>
                  <ContactRoleChips roles={roles} selected={roles} interactive onToggle={toggleRole} />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={saveIdentity} disabled={saving}>
                  Save & Continue
                </Button>
              </div>
            </div>
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
                {workspaceTabs.map((t) => (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className="rounded-full border border-transparent data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="identity" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Contact Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Primary Mobile</Label>
                    <Input value={mobilePrimary} onChange={(e) => setMobilePrimary(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Mobile</Label>
                    <Input value={mobileSecondary} onChange={(e) => setMobileSecondary(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Personal Email</Label>
                    <Input value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Official Email</Label>
                    <Input value={officialEmail} onChange={(e) => setOfficialEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Assigned Roles</Label>
                    <ContactRoleChips roles={roles} selected={roles} interactive onToggle={toggleRole} />
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm md:col-span-2">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Contact ID</p>
                        <p className="font-mono text-xs">{active.id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Created Date</p>
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
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={saveIdentity} disabled={saving}>
                    Save Identity
                  </Button>
                  <Button type="button" variant="outline" onClick={onArchive}>
                    Archive
                  </Button>
                </div>
              </TabsContent>

              {workspaceTabs
                .filter((t) => t.kind === "role")
                .map((t) => (
                  <TabsContent key={t.id} value={t.id} className="space-y-3">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <h3 className="text-sm font-semibold">{t.label} workspace</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Role-specific fields for <span className="font-medium text-foreground">{t.label}</span>{" "}
                        load from Role Master metadata. Future roles require configuration only — no UI code
                        changes.
                      </p>
                      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-muted-foreground">Role code</dt>
                          <dd className="text-sm font-medium">{t.roleCode}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Contact</dt>
                          <dd className="text-sm font-medium">{active.name}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Status</dt>
                          <dd className="text-sm font-medium capitalize">{active.status}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Contact Score</dt>
                          <dd className="text-sm font-medium">{active.contactScore}</dd>
                        </div>
                      </dl>
                    </div>
                  </TabsContent>
                ))}

              <TabsContent value="documents" className="text-sm text-muted-foreground">
                Document intelligence for this contact will surface EDIE artefacts linked to the Contact SSOT.
                No documents linked in this dry-run registry.
              </TabsContent>

              <TabsContent value="timeline" className="space-y-2">
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No timeline events for this contact yet.</p>
                ) : (
                  timeline.map((event) => (
                    <div key={event.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-muted-foreground">{event.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatTs(event.occurredOn)}</p>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="communication" className="text-sm text-muted-foreground">
                Communication history (ENCE) for this contact will appear here. Outbound delivery remains
                simulation-only in the current environment.
              </TabsContent>

              <TabsContent value="audit" className="text-sm text-muted-foreground">
                Audit references are recorded through the Enterprise Asset Framework when contacts are created
                or modified. Created {formatTs(active.createdOn)} · Last modified {formatTs(active.modifiedOn)}.
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
