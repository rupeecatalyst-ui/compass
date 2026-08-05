"use client";

/**
 * CO-BUG-005 — Banker Institution / City / Branch bound to Enterprise Lender Registry.
 * Institution SSOT = lenderRegistryClient (UUID id). Not ECM lender catalog / empty Tier-2 cache.
 */

import { useEffect, useMemo, useState } from "react";
import { EnterpriseLenderRegistrySelect } from "@/components/catalyst-one/shared/enterprise-lender-registry-select";
import { EcmMasterSelect } from "@/components/catalyst-one/contacts/ecm-master-select";
import {
  listEcmMasterOptions,
  type EcmMasterOption,
} from "@/constants/enterprise-contact-master";
import {
  getEnterpriseRegionStateCodes,
  normalizeEnterpriseRegionId,
} from "@/constants/enterprise-region-master";
import { lenderRegistryClient } from "@/lib/enterprise-lender-registry";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";
import {
  parseBankerProductsHandled,
  serializeBankerProductsHandled,
} from "@/lib/enterprise-contact-master/banker-hierarchy";
import { useProductMasterOptions } from "@/lib/enterprise-product-master";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function SimpleOptionSelect({
  value,
  options,
  placeholder,
  onChange,
  emptyHint,
}: {
  value: string;
  options: EcmMasterOption[];
  placeholder: string;
  onChange: (id: string, option?: EcmMasterOption) => void;
  emptyHint: string;
}) {
  const [open, setOpen] = useState(false);
  const label = value
    ? options.find((o) => o.id === value)?.label || value
    : "";

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="h-9 w-full justify-between rounded-lg px-3 text-sm font-normal"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cn("truncate", label ? "text-foreground" : "text-muted-foreground")}>
          {label || placeholder}
        </span>
        <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
      </Button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
            <Command className="bg-popover">
              <CommandInput placeholder="Search…" className="h-9 text-sm" />
              <CommandList className="max-h-40">
                <CommandEmpty className="py-3 text-xs">{emptyHint}</CommandEmpty>
                <CommandGroup>
                  {options.map((opt) => (
                    <CommandItem
                      key={opt.id}
                      value={opt.label}
                      className="text-sm"
                      onSelect={() => {
                        onChange(opt.id, opt);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5",
                          value === opt.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {opt.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function BankerInstitutionSelect({
  value,
  selectedName,
  placeholder,
  onChange,
}: {
  value: string;
  selectedName?: string;
  placeholder?: string;
  onChange: (id: string, option?: EcmMasterOption) => void;
}) {
  return (
    <EnterpriseLenderRegistrySelect
      value={value}
      selectedName={selectedName}
      placeholder={placeholder ?? "Search Institution (Lender)…"}
      inputClassName="h-9 rounded-lg text-sm"
      onSelect={(lender) =>
        onChange(lender.id, {
          id: lender.id,
          label: lender.name,
          enabled: true,
        })
      }
    />
  );
}

export function BankerCitySelect({
  institutionId,
  regionId,
  value,
  placeholder,
  onChange,
}: {
  institutionId?: string;
  /** CO-MASTER-REGION-001 — filter cities to selected Enterprise Region */
  regionId?: string;
  value: string;
  placeholder?: string;
  onChange: (id: string, option?: EcmMasterOption) => void;
}) {
  const [lender, setLender] = useState<EnterpriseLenderRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!institutionId?.trim()) {
      setLender(null);
      return;
    }
    void (async () => {
      const row = await lenderRegistryClient.getLender(institutionId);
      if (!cancelled) setLender(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [institutionId]);

  const regionNorm = normalizeEnterpriseRegionId(regionId);

  const coverageOptions = useMemo((): EcmMasterOption[] => {
    const cities = (lender?.coverageCities ?? []).map((c) => c.trim()).filter(Boolean);
    if (cities.length === 0) return [];
    return cities.map((label, idx) => ({
      id: slugify(label) || `city-${idx}`,
      label,
      enabled: true,
      sortOrder: idx + 1,
    }));
  }, [lender]);

  const masterCityOptions = useMemo(() => {
    const all = listEcmMasterOptions("city");
    if (!regionNorm) return all;
    const stateCodes = new Set(getEnterpriseRegionStateCodes(regionNorm));
    return all.filter((o) => {
      if (isOtherOptionSafe(o)) return true;
      const metaRegion = normalizeEnterpriseRegionId(o.meta?.region);
      if (metaRegion) return metaRegion === regionNorm;
      if (o.parentId && stateCodes.has(o.parentId)) return true;
      return false;
    });
  }, [regionNorm]);

  if (!institutionId?.trim()) {
    return (
      <p className="text-xs text-muted-foreground">Select Institution first.</p>
    );
  }

  if (!regionNorm) {
    return (
      <p className="text-xs text-muted-foreground">Select Region first.</p>
    );
  }

  if (coverageOptions.length > 0) {
    return (
      <SimpleOptionSelect
        value={value}
        options={coverageOptions}
        placeholder={placeholder ?? "Select city"}
        onChange={onChange}
        emptyHint="No city in lender coverage."
      />
    );
  }

  return (
    <SimpleOptionSelect
      value={value}
      options={masterCityOptions}
      placeholder={placeholder ?? "Select city"}
      onChange={onChange}
      emptyHint="No cities for this region."
    />
  );
}

function isOtherOptionSafe(o: EcmMasterOption): boolean {
  const id = o.id.trim().toLowerCase();
  return id === "other" || id === "others" || o.label.trim().toLowerCase() === "other";
}

export function BankerBranchSelect({
  institutionId,
  regionId,
  cityId,
  value,
  placeholder,
  onChange,
}: {
  institutionId?: string;
  regionId?: string;
  cityId?: string;
  value: string;
  placeholder?: string;
  onChange: (id: string, option?: EcmMasterOption) => void;
}) {
  const [lender, setLender] = useState<EnterpriseLenderRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!institutionId?.trim()) {
      setLender(null);
      return;
    }
    void (async () => {
      const row = await lenderRegistryClient.getLender(institutionId);
      if (!cancelled) setLender(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [institutionId]);

  const regionNorm = normalizeEnterpriseRegionId(regionId);

  const coverageOptions = useMemo((): EcmMasterOption[] => {
    const branches = (lender?.branchCoverage ?? []).map((b) => b.trim()).filter(Boolean);
    if (branches.length === 0) return [];
    return branches.map((label, idx) => ({
      id: slugify(label) || `branch-${idx}`,
      label,
      enabled: true,
      sortOrder: idx + 1,
      parentId: institutionId,
    }));
  }, [lender, institutionId]);

  const masterBranchOptions = useMemo(() => {
    const all = listEcmMasterOptions("branch", institutionId);
    return all.filter((o) => {
      if (isOtherOptionSafe(o)) return true;
      const metaRegion = normalizeEnterpriseRegionId(o.meta?.region);
      if (regionNorm && metaRegion && metaRegion !== regionNorm) return false;
      if (cityId?.trim() && o.meta?.city && o.meta.city !== cityId.trim()) return false;
      return true;
    });
  }, [institutionId, regionNorm, cityId]);

  if (!institutionId?.trim()) {
    return (
      <p className="text-xs text-muted-foreground">Select Institution first.</p>
    );
  }

  if (!regionNorm) {
    return (
      <p className="text-xs text-muted-foreground">Select Region first.</p>
    );
  }

  if (coverageOptions.length > 0) {
    return (
      <SimpleOptionSelect
        value={value}
        options={coverageOptions}
        placeholder={placeholder ?? "Select branch"}
        onChange={onChange}
        emptyHint="No branch in lender coverage."
      />
    );
  }

  const legacy = listEcmMasterOptions("branch", institutionId);
  if (legacy.length === 0 && masterBranchOptions.length === 0) {
    return (
      <EcmMasterSelect
        domain="branch"
        value={value}
        parentId={institutionId}
        placeholder={placeholder ?? "Select branch"}
        onChange={onChange}
      />
    );
  }

  return (
    <SimpleOptionSelect
      value={value}
      options={masterBranchOptions.length ? masterBranchOptions : legacy}
      placeholder={placeholder ?? "Select branch"}
      onChange={onChange}
      emptyHint="No branches for this region / city."
    />
  );
}

/**
 * CO-BUG-ELD-CONTACT — Products Handled multi-select from Enterprise Product Master (SSOT).
 * Persists as CSV of product codes on roleProfiles.lender_employee.productsHandled.
 */
export function BankerProductsHandledMultiSelect({
  value,
  onChange,
}: {
  /** CSV / JSON string of product codes */
  value: string;
  onChange: (serialized: string) => void;
}) {
  const { options, loading } = useProductMasterOptions(true);
  const selected = useMemo(() => new Set(parseBankerProductsHandled(value)), [value]);

  const toggle = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(serializeBankerProductsHandled([...next]));
  };

  if (loading && options.length === 0) {
    return <p className="text-xs text-muted-foreground">Loading products…</p>;
  }

  if (options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No products available from Enterprise Product Master.
      </p>
    );
  }

  return (
    <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-input bg-background p-2">
      {options.map((opt) => {
        const code = opt.code;
        const checked = selected.has(code);
        return (
          <label
            key={opt.id || code}
            className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted/50"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() => toggle(code)}
              aria-label={opt.label}
            />
            <span className="min-w-0 truncate text-foreground">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
