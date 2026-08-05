"use client";

import { useMemo, useState } from "react";
import { ERW_COLOUR_FAMILY_TOKENS } from "@/constants/enterprise-relationship-workspace";
import { listNetworkWorkspaceContacts } from "@/lib/contact-strategy/live-registry";
import type { RicContact } from "@/lib/contact-strategy/ric-types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function StrategicContactPool({
  selectedId,
  onSelect,
  registryVersion,
}: {
  selectedId: string | null;
  onSelect: (contact: RicContact) => void;
  /** Bump when ECM registry mutates so the pool refreshes. */
  registryVersion?: number;
}) {
  const [query, setQuery] = useState("");

  const contacts = useMemo(() => {
    return listNetworkWorkspaceContacts({ query });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, registryVersion]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-border/70 bg-card">
      <header className="shrink-0 space-y-2 border-b border-border/60 px-3 py-2.5">
        <div>
          <h2 className="text-sm font-semibold">Contact Registry</h2>
          <p className="text-[11px] text-muted-foreground">
            Live Enterprise Contact Registry · select to explore relationships.
          </p>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, mobile, city…"
          className="h-8 text-xs"
          aria-label="Search contacts"
        />
      </header>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
        {contacts.map((contact) => {
          const tone = ERW_COLOUR_FAMILY_TOKENS[contact.colourFamily];
          const selected = selectedId === contact.id;
          return (
            <button
              key={contact.id}
              type="button"
              onClick={() => onSelect(contact)}
              className={cn(
                "w-full rounded-lg border bg-background/80 p-2.5 text-left transition-colors",
                selected
                  ? "border-teal-500/50 bg-teal-500/10 ring-1 ring-teal-500/30"
                  : "border-border/70 hover:bg-muted/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-snug">{contact.name}</p>
                {contact.relationshipScore > 0 ? (
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                    style={{ background: tone.soft, color: tone.text }}
                  >
                    {contact.relationshipScore}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    borderColor: tone.ring,
                    background: tone.soft,
                    color: tone.text,
                  }}
                >
                  {contact.category}
                </span>
                <span className="text-[10px] text-muted-foreground">{contact.businessRole}</span>
              </div>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">{contact.company}</p>
            </button>
          );
        })}
        {contacts.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            {query.trim()
              ? "No matching contacts in the Enterprise Registry."
              : "No operational contacts in the Enterprise Registry."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
