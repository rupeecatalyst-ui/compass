"use client";

import { ERW_COLOUR_FAMILY_TOKENS } from "@/constants/enterprise-relationship-workspace";
import { RIC_MOCK_CONTACTS } from "@/lib/contact-strategy/ric-mock-data";
import type { RicContact } from "@/lib/contact-strategy/ric-types";
import { cn } from "@/lib/utils";

export function StrategicContactPool({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (contact: RicContact) => void;
}) {
  return (
    <section className="flex min-h-[420px] flex-col rounded-xl border border-border/70 bg-card">
      <header className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold">Strategic Contact Pool</h2>
        <p className="text-[11px] text-muted-foreground">
          Select a contact to explore first-level relationships.
        </p>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {RIC_MOCK_CONTACTS.map((contact) => {
          const tone = ERW_COLOUR_FAMILY_TOKENS[contact.colourFamily];
          const selected = selectedId === contact.id;
          return (
            <button
              key={contact.id}
              type="button"
              onClick={() => onSelect(contact)}
              className={cn(
                "w-full rounded-lg border bg-background/80 p-3 text-left transition-colors",
                selected
                  ? "border-teal-500/50 bg-teal-500/10 ring-1 ring-teal-500/30"
                  : "border-border/70 hover:bg-muted/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-snug">{contact.name}</p>
                <span
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                  style={{ background: tone.soft, color: tone.text }}
                >
                  {contact.relationshipScore}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
              <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{contact.company}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
