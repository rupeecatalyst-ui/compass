"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search, UserRound, X } from "lucide-react";
import {
  normalizePersonName,
  registerEcmContact,
} from "@/lib/enterprise-contact-master";
import { useEnterpriseRegistry } from "@/hooks/use-enterprise-registry";
import { findOperationalEcmContactById, searchOperationalContacts } from "@/lib/enterprise-registry";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ReportingManagerPickerProps {
  valueContactId?: string;
  valueName?: string;
  excludeContactId?: string;
  actorId?: string;
  onChange: (contact: EcmContact | null) => void;
  className?: string;
}

export function ReportingManagerPicker({
  valueContactId,
  valueName,
  excludeContactId,
  actorId = "ui",
  onChange,
  className,
}: ReportingManagerPickerProps) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { registryVersion } = useEnterpriseRegistry({ hydrateOnMount: true });

  const results = useMemo(() => {
    void registryVersion;
    const q = query.trim();
    if (!q) return [];
    return searchOperationalContacts(q, { roles: ["lender_employee"] })
      .filter((c) => c.id !== excludeContactId)
      .slice(0, 12)
      .map((c) => findOperationalEcmContactById(c.id))
      .filter((c): c is EcmContact => Boolean(c));
  }, [query, excludeContactId, registryVersion]);

  const createBasic = () => {
    setError(null);
    const name = normalizePersonName(newName);
    if (!name) {
      setError("Name is mandatory.");
      return;
    }
    try {
      const mobile = newMobile.trim();
      // Optional mobile — use unique placeholder so Contact SSOT remains valid without trapping the user
      const created = registerEcmContact({
        name,
        mobilePrimary: mobile || `9${String(Date.now()).slice(-9)}`,
        personalEmail: newEmail.trim() || undefined,
        roles: ["lender_employee"],
        createdBy: actorId,
        ownerName: "Platform Admin",
      });
      onChange(created);
      setCreating(false);
      setNewName("");
      setNewMobile("");
      setNewEmail("");
      setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create contact.");
    }
  };

  const linked = useMemo(() => {
    void registryVersion;
    return valueContactId ? findOperationalEcmContactById(valueContactId) : undefined;
  }, [valueContactId, registryVersion]);

  return (
    <div className={cn("space-y-2", className)}>
      {valueContactId ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-teal-800/60 bg-teal-950/30 px-2.5 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-teal-400" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-100">
                {valueName || linked?.name || "Selected Contact"}
              </p>
              <p className="text-[11px] text-zinc-400">
                {linked?.mobilePrimary ? `${linked.mobilePrimary} · ` : ""}
                <span className="font-mono text-[10px] text-zinc-500">
                  {valueContactId.slice(0, 8)}…
                </span>
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-zinc-400 hover:text-zinc-100"
            onClick={() => onChange(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts by name, mobile, or email…"
              className="h-9 rounded-lg border-zinc-700 bg-zinc-950 pl-9 text-zinc-100"
            />
          </div>
          {!query.trim() && (
            <p className="text-[11px] text-zinc-500">
              Lookup existing Contact, or create a basic Contact below.
            </p>
          )}
          {query.trim() && (
            <div className="max-h-36 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950">
              {results.length === 0 ? (
                <p className="px-2.5 py-2 text-xs text-zinc-500">
                  No match. Create a basic Contact below and link immediately.
                </p>
              ) : (
                results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-start gap-2 border-b border-zinc-900 px-2.5 py-2 text-left last:border-0 hover:bg-zinc-900"
                    onClick={() => onChange(c)}
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />
                    <span>
                      <span className="block text-sm font-medium text-zinc-100">{c.name}</span>
                      <span className="block text-[11px] text-zinc-500">
                        {c.mobilePrimary}
                        {c.personalEmail || c.officialEmail
                          ? ` · ${c.personalEmail || c.officialEmail}`
                          : ""}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
          {!creating ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 rounded-lg border-zinc-700 bg-zinc-900 text-zinc-100"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Create Basic Contact
            </Button>
          ) : (
            <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-950 p-2.5">
              <p className="text-[11px] font-medium text-zinc-300">
                Create basic Contact · auto-link · stay on Banker workspace
              </p>
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-400">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-8 rounded-md border-zinc-700 bg-zinc-900"
                  placeholder="Full name"
                  autoFocus
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-400">Mobile (optional)</Label>
                  <Input
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    className="h-8 rounded-md border-zinc-700 bg-zinc-900"
                    placeholder="10-digit mobile"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-400">Email (optional)</Label>
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="h-8 rounded-md border-zinc-700 bg-zinc-900"
                    placeholder="name@example.com"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" size="sm" className="h-7 rounded-md" onClick={createBasic}>
                  Create & Link
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-md text-zinc-400"
                  onClick={() => {
                    setCreating(false);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
