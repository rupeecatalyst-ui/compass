"use client";

import { useEffect, useState } from "react";
import {
  listEcmContacts,
  promptEcmMissingEmail,
  registerEcmContact,
} from "@/lib/enterprise-contact-master";
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

export function ContactMasterWorkspace() {
  const [contacts, setContacts] = useState<EcmContact[]>([]);
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

  const onCreate = () => {
    setError(null);
    try {
      registerEcmContact({
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to register contact");
    }
  };

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

      <div className="grid gap-3 md:grid-cols-2">
        {contacts.map((c) => {
          const prompt = emailPrompts[c.id];
          const roles = [c.primaryRole, ...c.additionalRoles];
          return (
            <EnterpriseEngagementCard
              key={c.id}
              title={c.name}
              description={`${c.mobilePrimary}${c.mobileSecondary ? ` · ${c.mobileSecondary}` : ""}`}
              tone={prompt?.warning ? "amber" : "blue"}
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
          );
        })}
      </div>
    </div>
  );
}
