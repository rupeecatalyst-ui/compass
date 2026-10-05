"use client";

import { useMemo, useState } from "react";
import type { FieldInventoryEntry } from "@/lib/field-control-master/field-inventory-catalogue";
import {
  FIELD_INVENTORY_AMBIGUITY_FILTERS,
  FIELD_INVENTORY_CLASSIFICATIONS,
  FIELD_INVENTORY_ELIGIBILITY,
  FIELD_INVENTORY_FCM_STATUSES,
  FIELD_INVENTORY_INTRO,
  FIELD_INVENTORY_OWNERSHIP_STATUSES,
  FIELD_INVENTORY_SOURCE_CLASSES,
  FIELD_INVENTORY_TITLE,
  fieldInventoryMatchesSearch,
} from "@/lib/field-control-master/field-inventory-presentation";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type InventoryFilters = {
  search: string;
  domain: string;
  sourceClass: string;
  dataType: string;
  fcmStatus: string;
  ownershipStatus: string;
  registrationEligibility: string;
  classification: string;
  ambiguity: string;
};

const EMPTY_FILTERS: InventoryFilters = {
  search: "",
  domain: "",
  sourceClass: "",
  dataType: "",
  fcmStatus: "",
  ownershipStatus: "",
  registrationEligibility: "",
  classification: "",
  ambiguity: "",
};

export function FieldInventoryPanel({ entries }: { entries: readonly FieldInventoryEntry[] }) {
  const [filters, setFilters] = useState<InventoryFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const domains = useMemo(() => unique(entries.map((entry) => entry.domain)), [entries]);
  const dataTypes = useMemo(() => unique(entries.map((entry) => entry.dataType)), [entries]);
  const historicalCount = entries.filter((entry) => entry.boundary === "historical_155").length;
  const outsideCount = entries.filter((entry) => entry.boundary === "outside_v1_5_raw").length;

  const visible = useMemo(
    () =>
      entries.filter((entry) => {
        if (!fieldInventoryMatchesSearch(entry, filters.search)) return false;
        if (filters.domain && entry.domain !== filters.domain) return false;
        if (filters.sourceClass && entry.sourceClass !== filters.sourceClass) return false;
        if (filters.dataType && entry.dataType !== filters.dataType) return false;
        if (filters.fcmStatus && entry.fcmStatus !== filters.fcmStatus) return false;
        if (filters.ownershipStatus && entry.ownershipStatus !== filters.ownershipStatus) return false;
        if (filters.registrationEligibility && entry.registrationEligibility !== filters.registrationEligibility) return false;
        if (filters.classification && entry.classification !== filters.classification) return false;
        if (filters.ambiguity === "None recorded" && entry.ambiguity !== "None recorded") return false;
        if (filters.ambiguity === "Distinction recorded" && entry.ambiguity === "None recorded") return false;
        return true;
      }),
    [entries, filters],
  );

  const selected = entries.find((entry) => entry.identity === selectedId) ?? null;

  function setFilter<Key extends keyof InventoryFilters>(key: Key, value: InventoryFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <section data-field-inventory="read-only" className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{FIELD_INVENTORY_TITLE}</h1>
        <p className="max-w-4xl text-sm leading-6 text-foreground">{FIELD_INVENTORY_INTRO}</p>
        <p className="text-sm text-muted-foreground">
          {historicalCount} catalogue identities and {outsideCount} additional physical sources already on the
          V1.5 allowlist. Showing {visible.length} of {entries.length}.
        </p>
      </header>

      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
        <FilterSearch value={filters.search} onChange={(value) => setFilter("search", value)} />
        <FilterSelect label="Domain" value={filters.domain} options={domains} onChange={(value) => setFilter("domain", value)} />
        <FilterSelect
          label="Source class"
          value={filters.sourceClass}
          options={[...FIELD_INVENTORY_SOURCE_CLASSES]}
          onChange={(value) => setFilter("sourceClass", value)}
        />
        <FilterSelect label="Type" value={filters.dataType} options={dataTypes} onChange={(value) => setFilter("dataType", value)} />
        <FilterSelect
          label="FCM status"
          value={filters.fcmStatus}
          options={[...FIELD_INVENTORY_FCM_STATUSES]}
          onChange={(value) => setFilter("fcmStatus", value)}
        />
        <FilterSelect
          label="Ownership status"
          value={filters.ownershipStatus}
          options={[...FIELD_INVENTORY_OWNERSHIP_STATUSES]}
          onChange={(value) => setFilter("ownershipStatus", value)}
        />
        <FilterSelect
          label="Registration eligibility"
          value={filters.registrationEligibility}
          options={[...FIELD_INVENTORY_ELIGIBILITY]}
          onChange={(value) => setFilter("registrationEligibility", value)}
        />
        <FilterSelect
          label="Classification"
          value={filters.classification}
          options={[...FIELD_INVENTORY_CLASSIFICATIONS]}
          onChange={(value) => setFilter("classification", value)}
        />
        <FilterSelect
          label="Ambiguity"
          value={filters.ambiguity}
          options={[...FIELD_INVENTORY_AMBIGUITY_FILTERS]}
          onChange={(value) => setFilter("ambiguity", value)}
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-border lg:overflow-x-visible">
        <table className="w-full min-w-[72rem] border-collapse text-left text-sm lg:min-w-0 lg:table-fixed">
          <colgroup>
            <col className="w-[13%]" />
            <col className="w-[11%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[6%]" />
            <col className="w-[11%]" />
            <col className="w-[13%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            <col className="w-[6%]" />
          </colgroup>
          <thead className="bg-muted text-foreground">
            <tr>
              {[
                "Field / Identity",
                "Business label",
                "Domain",
                "Source class",
                "Type",
                "FCM status",
                "Ownership status",
                "Registration eligibility",
                "Ambiguity",
                "Source",
              ].map((heading) => (
                <th key={heading} scope="col" className="px-2 py-2 align-bottom text-xs font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-2 py-6 text-foreground">
                  No inventory identities match these filters.
                </td>
              </tr>
            ) : (
              visible.map((entry) => (
                <tr key={entry.identity} className="border-t border-border align-top">
                  <td className="max-w-0 px-2 py-2">
                    <button
                      type="button"
                      title={entry.identity}
                      className="block w-full truncate whitespace-nowrap text-left font-mono text-xs text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setSelectedId(entry.identity)}
                    >
                      {entry.identity}
                    </button>
                  </td>
                  <td className="px-2 py-2 text-foreground">
                    <span title={entry.businessLabel} className="line-clamp-2 break-words">
                      {entry.businessLabel}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs leading-snug text-foreground">{entry.domain}</td>
                  <td className="px-2 py-2 text-xs leading-snug text-foreground">{entry.sourceClass}</td>
                  <td className="px-2 py-2 text-xs leading-snug text-foreground">{entry.dataType}</td>
                  <td className="px-2 py-2 text-xs leading-snug text-foreground">{entry.fcmStatus}</td>
                  <td className="px-2 py-2 text-xs leading-snug text-foreground">{entry.ownershipStatus}</td>
                  <td className="px-2 py-2 text-xs leading-snug text-foreground">{entry.registrationEligibility}</td>
                  <td className="px-2 py-2 text-xs leading-snug text-foreground">
                    <span title={entry.ambiguity} className="line-clamp-2 break-words">
                      {entry.ambiguity}
                    </span>
                  </td>
                  <td className="max-w-0 px-2 py-2">
                    <span title={entry.source} className="block truncate whitespace-nowrap font-mono text-xs text-foreground">
                      {entry.source}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={selected != null} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl" data-inventory-drawer="read-only">
          {selected ? <InventoryDetail entry={selected} /> : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function InventoryDetail({ entry }: { entry: FieldInventoryEntry }) {
  const rows: Array<[string, string]> = [
    ["Inventory identity", entry.identity],
    ["Business label", entry.businessLabel],
    ["Domain", entry.domain],
    ["Source", entry.source],
    ["Source class", entry.sourceClass],
    ["Data type", entry.dataType],
    ["Known usage", entry.knownUsage],
    ["Classification", entry.classification],
    ["FCM relationship", entry.fcmStatus],
    ["FCM field_id", entry.fcmFieldId ?? "Not registered"],
    ["Ownership status", entry.ownershipStatus],
    ["Registration eligibility", entry.registrationEligibility],
    ["Ambiguity / mirror notes", entry.ambiguity],
    ["Product Programme exclusion reason", entry.programmeExclusionReason ?? "Not applicable"],
    [
      "Derived calculator",
      entry.derivedCalculator
        ? `${entry.derivedCalculator.calculatorId ?? "No single calculator export"} · ${entry.derivedCalculator.module} · ${entry.derivedCalculator.note}`
        : "Not a derived calculator output",
    ],
  ];
  return (
    <>
      <SheetHeader>
        <SheetTitle>{entry.businessLabel}</SheetTitle>
        <SheetDescription className="font-mono text-xs text-foreground">{entry.identity}</SheetDescription>
      </SheetHeader>
      <dl className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="break-words text-sm text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function FilterSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
      Search
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Identity, label, or source"
        className="h-9 rounded-md border border-border bg-background px-2 text-sm font-normal text-foreground"
      />
    </label>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-border bg-background px-2 text-sm font-normal text-foreground"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
