"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import {
  EntityMasterSearch,
  type EntityMasterOption,
} from "@/components/catalyst-one/shared/entity-master-search";
import {
  liveSearchOperationalCompanies,
  liveSearchOperationalContacts,
} from "@/lib/enterprise-registry/live-search";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";

type EntityKind = "contact" | "company";

interface LiveEntityMasterSearchProps {
  kind: EntityKind;
  placeholder?: string;
  selectedId?: string;
  selectedLabel?: string;
  /** Fallback options (memory mode / while warming). */
  fallbackOptions?: EntityMasterOption[];
  onSelect: (option: EntityMasterOption) => void;
  className?: string;
  onCreateNew?: (query: string) => void;
  createNewLabel?: string;
  allowCreateNew?: boolean;
  /** When true, mark registry warmed after parent dialog open (no panel). */
  warmOnMount?: boolean;
}

/**
 * CO-BLOCKER-001 — Picker that searches PostgreSQL directly in prisma mode.
 * Uses the Enterprise Search Autocomplete standard (close on select).
 */
export function LiveEntityMasterSearch({
  kind,
  placeholder,
  selectedId,
  selectedLabel,
  fallbackOptions = [],
  onSelect,
  className,
  onCreateNew,
  createNewLabel,
  allowCreateNew = true,
  warmOnMount = false,
}: LiveEntityMasterSearchProps) {
  const registryVersion = useEcmContactRegistryVersion();
  const [query, setQuery] = useState("");
  const [liveOptions, setLiveOptions] = useState<EntityMasterOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (warmOnMount) {
      void registryVersion;
    }
  }, [warmOnMount, registryVersion]);

  const runSearch = useCallback(
    async (q: string) => {
      if (!isEnterprisePersistencePrisma()) return;
      if (!q.trim()) {
        setLiveOptions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const rows =
          kind === "contact"
            ? await liveSearchOperationalContacts(q)
            : await liveSearchOperationalCompanies(q);
        setLiveOptions(rows);
      } catch {
        setLiveOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [kind],
  );

  useEffect(() => {
    if (!isEnterprisePersistencePrisma()) return;
    const handle = window.setTimeout(() => {
      void runSearch(query);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query, runSearch]);

  const options = useMemo(() => {
    if (isEnterprisePersistencePrisma()) return liveOptions;
    return fallbackOptions;
  }, [fallbackOptions, liveOptions]);

  const emptyLabel =
    kind === "company" ? "No matching Company found." : "No matching Contact found.";

  if (!isEnterprisePersistencePrisma()) {
    return (
      <EntityMasterSearch
        placeholder={placeholder}
        selectedId={selectedId}
        selectedLabel={selectedLabel}
        options={fallbackOptions}
        onSelect={onSelect}
        className={className}
        onCreateNew={onCreateNew}
        createNewLabel={createNewLabel}
        allowCreateNew={allowCreateNew}
        emptyLabel={emptyLabel}
      />
    );
  }

  return (
    <EntityMasterSearch
      placeholder={placeholder}
      selectedId={selectedId}
      selectedLabel={selectedLabel}
      options={options}
      onSelect={onSelect}
      className={className}
      onCreateNew={onCreateNew}
      createNewLabel={createNewLabel}
      allowCreateNew={allowCreateNew}
      onQueryChange={setQuery}
      loading={loading}
      emptyLabel={emptyLabel}
    />
  );
}
