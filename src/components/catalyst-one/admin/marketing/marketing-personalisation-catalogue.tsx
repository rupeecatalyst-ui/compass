"use client";

/**
 * CO-MARKETING-REDESIGN-008 — Searchable personalisation catalogue.
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MarketingPersonalisationCatalogueEntry } from "@/lib/enterprise-marketing-engine/personalisation-catalogue";
import { searchMarketingPersonalisationCatalogue } from "@/lib/enterprise-marketing-engine/personalisation-catalogue";
import type { MarketingPersonalizationToken } from "@/constants/enterprise-marketing-engine/content";

export function MarketingPersonalisationCatalogue({
  entries,
  onInsert,
}: {
  entries: MarketingPersonalisationCatalogueEntry[];
  onInsert: (token: MarketingPersonalizationToken, target: "subject" | "preheader" | "content") => void;
}) {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<"subject" | "preheader" | "content">("content");
  const visible = useMemo(
    () => searchMarketingPersonalisationCatalogue(entries, query),
    [entries, query],
  );

  return (
    <section className="mkt-person-catalogue">
      <h3 className="font-semibold">Available mapped variables</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Only confirmed, allowlisted sheet fields can be inserted. Email, mobile, consent, and source keys stay hidden.
      </p>
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="mkt-person-search">Search variables</Label>
        <Input
          id="mkt-person-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or mapped column"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["subject", "preheader", "content"] as const).map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={target === item ? "default" : "outline"}
            onClick={() => setTarget(item)}
          >
            Insert into {item}
          </Button>
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {visible.map((entry) => (
          <li key={entry.token} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">
                {entry.label} <span className="font-mono text-xs">{entry.insertValue}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {entry.source === "mapped" ? `Mapped: ${entry.mappedHeader}` : "System"} · Fallback: {entry.fallback || "(required)"}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => onInsert(entry.token, target)}>
              Insert
            </Button>
          </li>
        ))}
        {visible.length === 0 ? <li className="text-sm text-muted-foreground">No matching variables.</li> : null}
      </ul>
    </section>
  );
}
