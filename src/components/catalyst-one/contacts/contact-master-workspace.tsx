"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  listEcmContacts,
  promptEcmMissingEmail,
  registerEcmContact,
} from "@/lib/enterprise-contact-master";
import { listEdcTimeline } from "@/lib/enterprise-dialogue-center";
import type { EcmContact, EcmContactRole, EcmMissingEmailPrompt } from "@/types/enterprise-contact-master";
import { EnterpriseEngagementCard } from "@/components/catalyst-one/shared/enterprise-engagement-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES: EcmContactRole[] = [
  "customer",
  "employee",
  "lender_employee",
  "partner",
  "investor",
  "builder",
  "chartered_accountant",
];

type ContactDetailTab = "identity" | "roles" | "documents" | "timeline";

function seedContactsIfEmpty() {
  if (listEcmContacts().length > 0) return;

  registerEcmContact({
    name: "Suresh Patel",
    mobilePrimary: "9811100001",
    primaryRole: "customer",
    personalEmail: "suresh.patel@demo.in",
    additionalRoles: ["investor"],
    createdBy: "system",
  });

  registerEcmContact({
    name: "Meera Iyer",
    mobilePrimary: "9811100002",
    primaryRole: "employee",
    officialEmail: "meera.iyer@rupeecatalyst.demo",
    mobileSecondary: "9811100003",
    createdBy: "system",
  });

  registerEcmContact({
    name: "No Email Contact",
    mobilePrimary: "9811100099",
    primaryRole: "partner",
    additionalRoles: ["builder"],
    createdBy: "system",
  });
}

function ContactMasterInner() {
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<EcmContact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<ContactDetailTab>("identity");
  const [name, setName] = useState("");
  const [mobilePrimary, setMobilePrimary] = useState("");
  const [mobileSecondary, setMobileSecondary] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [primaryRole, setPrimaryRole] = useState<EcmContactRole>("customer");
  const [additionalRole, setAdditionalRole] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);
  const [emailPrompts, setEmailPrompts] = useState<Record<string, EcmMissingEmailPrompt>>({});

  const refresh = () => {
    const list = listEcmContacts();
    setContacts(list);
    const prompts: Record<string, EcmMissingEmailPrompt> = {};
    for (const c of list) {
      prompts[c.id] = promptEcmMissingEmail(c.id);
    }
    setEmailPrompts(prompts);
  };

  useEffect(() => {
    seedContactsIfEmpty();
    refresh();
  }, []);

  useEffect(() => {
    const fromQuery = searchParams.get("contact");
    if (fromQuery) {
      setSelectedId(fromQuery);
      setDetailTab("identity");
    }
  }, [searchParams]);

  const selected = useMemo(
    () => contacts.find((c) => c.id === selectedId) ?? null,
    [contacts, selectedId],
  );

  const timeline = useMemo(() => {
    if (!selected) return [];
    return listEdcTimeline().filter(
      (e) =>
        e.contextRef.id === selected.id ||
        (typeof e.description === "string" && e.description.includes(selected.name)),
    );
  }, [selected]);

  const onCreate = () => {
    setError(null);
    try {
      const created = registerEcmContact({
        name,
        mobilePrimary,
        primaryRole,
        mobileSecondary: mobileSecondary || undefined,
        personalEmail: personalEmail || undefined,
        officialEmail: officialEmail || undefined,
        additionalRoles:
          additionalRole !== "none" && additionalRole !== primaryRole
            ? [additionalRole as EcmContactRole]
            : [],
        createdBy: "ui",
      });
      setName("");
      setMobilePrimary("");
      setMobileSecondary("");
      setPersonalEmail("");
      setOfficialEmail("");
      setAdditionalRole("none");
      refresh();
      setSelectedId(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to register contact");
    }
  };

  const roleList = selected
    ? [selected.primaryRole, ...selected.additionalRoles]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Contact Master"
        description="Multi-role contacts with mandatory mobile. Missing email surfaces an operational workflow warning."
      />

      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Primary mobile</Label>
          <Input value={mobilePrimary} onChange={(e) => setMobilePrimary(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Secondary mobile</Label>
          <Input value={mobileSecondary} onChange={(e) => setMobileSecondary(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Personal email</Label>
          <Input value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Official email</Label>
          <Input value={officialEmail} onChange={(e) => setOfficialEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Primary role</Label>
          <Select value={primaryRole} onValueChange={(v) => setPrimaryRole(v as EcmContactRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Additional role</Label>
          <Select value={additionalRole} onValueChange={setAdditionalRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={onCreate}>Register contact</Button>
        </div>
        {error && <p className="text-sm text-destructive md:col-span-full">{error}</p>}
      </div>

      {selected && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{selected.name}</p>
              <p className="text-xs text-muted-foreground">Contact workspace · {selected.id}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
              Close
            </Button>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(["identity", "roles", "documents", "timeline"] as ContactDetailTab[]).map((tab) => (
              <Button
                key={tab}
                size="sm"
                variant={detailTab === tab ? "default" : "secondary"}
                className="h-7 capitalize"
                onClick={() => setDetailTab(tab)}
              >
                {tab}
              </Button>
            ))}
          </div>
          {detailTab === "identity" && (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <DetailRow label="Name" value={selected.name} />
              <DetailRow label="Primary mobile" value={selected.mobilePrimary} />
              <DetailRow label="Secondary mobile" value={selected.mobileSecondary ?? "—"} />
              <DetailRow label="Personal email" value={selected.personalEmail ?? "—"} />
              <DetailRow label="Official email" value={selected.officialEmail ?? "—"} />
              <DetailRow label="Primary role" value={selected.primaryRole.replace(/_/g, " ")} />
            </dl>
          )}
          {detailTab === "roles" && (
            <div className="flex flex-wrap gap-2">
              {roleList.map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-background px-3 py-1 text-xs font-medium ring-1 ring-border"
                >
                  {role.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
          {detailTab === "documents" && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Linked document placeholders for this contact:</p>
              <ul className="list-disc space-y-1 pl-5 text-xs">
                <li>KYC pack · pending / linked via opportunity workspace</li>
                <li>Identity proof · available when uploaded on opportunity</li>
                <li>Income proof · available when uploaded on opportunity</li>
              </ul>
            </div>
          )}
          {detailTab === "timeline" && (
            <div className="space-y-2">
              {timeline.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No dialogue events matched for this contact yet. Events appear when activity
                  references this contact from Opportunity Workspace.
                </p>
              )}
              {timeline.slice(0, 12).map((e) => (
                <div key={e.id} className="rounded-lg border border-border px-3 py-2 text-xs">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-muted-foreground">{e.description}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(e.occurredOn).toLocaleString()} · {e.actorId} · {e.eventType}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {contacts.map((c) => {
          const prompt = emailPrompts[c.id];
          const roles = [c.primaryRole, ...c.additionalRoles];
          const active = selectedId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              className="text-left"
              onClick={() => {
                setSelectedId(c.id);
                setDetailTab("identity");
              }}
            >
              <EnterpriseEngagementCard
                title={c.name}
                description={`${c.mobilePrimary}${c.mobileSecondary ? ` · ${c.mobileSecondary}` : ""}`}
                tone={active ? "cyan" : prompt?.warning ? "amber" : "blue"}
                badge={c.primaryRole.replace(/_/g, " ")}
                meta={[c.personalEmail, c.officialEmail].filter(Boolean).join(" · ") || "No email on file"}
              >
                <div className="flex flex-wrap gap-1">
                  {roles.map((role) => (
                    <span
                      key={`${c.id}-${role}`}
                      className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium ring-1 ring-border"
                    >
                      {role.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
                {prompt?.warning && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{prompt.message}</p>
                )}
              </EnterpriseEngagementCard>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/60 pb-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-right text-xs font-medium">{value}</dd>
    </div>
  );
}

export function ContactMasterWorkspace() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading contacts…</div>}>
      <ContactMasterInner />
    </Suspense>
  );
}
