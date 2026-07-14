"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search, UserRound, X } from "lucide-react";
import {
  listEcmContacts,
  normalizePersonName,
  registerEcmContact,
  searchEcmContactsForReportingManager,
} from "@/lib/enterprise-contact-master";
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

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return searchEcmContactsForReportingManager(q, excludeContactId);
  }, [query, excludeContactId]);

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

  const linked = valueContactId
    ? listEcmContacts().find((c) => c.id === valueContactId)
    : undefined;

  return (
    <div className={cn("space-y-3", className)}>
      {valueContactId ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-teal-800/60 bg-teal-950/30 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <UserRound className="h-4 w-4 shrink-0 text-teal-400" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-100">
                {valueName || linked?.name || "Selected Contact"}
              </p>
              <p className="text-xs text-zinc-400">
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
            className="h-8 text-zinc-400 hover:text-zinc-100"
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts by name, mobile, or email…"
              className="h-10 rounded-xl border-zinc-700 bg-zinc-950 pl-9 text-zinc-100"
            />
          </div>
          {!query.trim() && (
            <p className="text-xs text-zinc-500">
              Type to look up an existing Contact. If not found, create a basic Contact below.
            </p>
          )}
          {query.trim() && (
            <div className="max-h-44 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950">
              {results.length === 0 ? (
                <p className="px-3 py-3 text-sm text-zinc-500">
                  No match. Create a basic Contact below and link immediately.
                </p>
              ) : (
                results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-start gap-2 border-b border-zinc-900 px-3 py-2.5 text-left last:border-0 hover:bg-zinc-900"
                    onClick={() => onChange(c)}
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                    <span>
                      <span className="block text-sm font-medium text-zinc-100">{c.name}</span>
                      <span className="block text-xs text-zinc-500">
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
              variant="outline"
              className="gap-2 rounded-xl border-zinc-700 bg-zinc-900 text-zinc-100"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-4 w-4" />
              Create Basic Contact
            </Button>
          ) : (
            <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-950 p-3">
              <p className="text-xs font-medium text-zinc-300">
                Create basic Contact · stay on Banker workspace · auto-link on create
              </p>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-9 rounded-lg border-zinc-700 bg-zinc-900"
                  placeholder="Full name"
                  autoFocus
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Mobile (optional)</Label>
                  <Input
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    className="h-9 rounded-lg border-zinc-700 bg-zinc-900"
                    placeholder="10-digit mobile"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Email (optional)</Label>
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="h-9 rounded-lg border-zinc-700 bg-zinc-900"
                    placeholder="name@example.com"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" size="sm" className="rounded-lg" onClick={createBasic}>
                  Create & Link
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-lg text-zinc-400"
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
