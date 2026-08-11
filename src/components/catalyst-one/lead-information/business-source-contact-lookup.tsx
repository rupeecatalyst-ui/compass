"use client";

/**
 * Dynamic Source Name / Contact lookup for Opportunity Business Source (CO-OPP-003).
 */

import { useCallback, useEffect, useState } from "react";
import {
  EntityMasterSearch,
  type EntityMasterOption,
} from "@/components/catalyst-one/shared/entity-master-search";
import {
  resolveBusinessSourceContactLookup,
} from "@/constants/opportunity-business-source";
import { wealthPartnerTypeLabel, wealthPartnerLifecycleLabel } from "@/constants/enterprise-wealth-partner-registry";
import { searchAssignableUsers } from "@/lib/assigned-users";
import { liveSearchOperationalContacts } from "@/lib/enterprise-registry/live-search";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { listLoanJourneySourceContacts } from "@/lib/enterprise-registry/legacy-loan-journey";
import { wealthPartnerApiClient } from "@/lib/enterprise-wealth-partner-registry";
import {
  deriveAgreementRuntimeStatus,
  getLegalDocketFromCompliance,
  resolveWealthPartnerOpportunitySelectability,
} from "@/lib/enterprise-wealth-partner-legal-docket";
import { cn } from "@/lib/utils";

export type SourceContactSelection = {
  id: string;
  name: string;
  /** When selected from Wealth Partner Registry. */
  wealthPartnerId?: string;
  /** Underlying Contact id for Business Sourcing compatibility. */
  contactId?: string | null;
  partnerType?: string | null;
};

type Props = {
  businessSource: string;
  selectedId: string;
  selectedName: string;
  selectedWealthPartnerId?: string;
  onSelect: (next: SourceContactSelection | null) => void;
  error?: string;
  className?: string;
  autoCustomerName?: string | null;
};

export function BusinessSourceContactLookupField({
  businessSource,
  selectedId,
  selectedName,
  selectedWealthPartnerId,
  onSelect,
  error,
  className,
  autoCustomerName,
}: Props) {
  const lookup = resolveBusinessSourceContactLookup(businessSource);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<EntityMasterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [wpMeta, setWpMeta] = useState<
    Map<string, { contactId: string | null; partnerType: string | null }>
  >(new Map());

  useEffect(() => {
    setQuery("");
    setOptions([]);
    setWpMeta(new Map());
  }, [businessSource]);

  const runSearch = useCallback(
    async (q: string, sourceCode: string) => {
      const config = resolveBusinessSourceContactLookup(sourceCode);
      if (
        config.hideField ||
        config.registry === "none" ||
        config.registry === "auto_customer" ||
        config.registry === "campaign" ||
        config.registry === "free_text_referrer"
      ) {
        setOptions([]);
        return;
      }
      if (!q.trim()) {
        setOptions([]);
        return;
      }
      setLoading(true);
      try {
        if (config.registry === "wealth_partner") {
          /**
           * CO-WP-OPP-REFINEMENT-001 — Do not restrict to RegistryStatus=active only.
           * Include Draft / Onboarding / Active lifecycle partners; terminal states
           * filtered via resolveWealthPartnerOpportunitySelectability.
           */
          const result = await wealthPartnerApiClient.queryPartners({
            search: q.trim(),
            pageSize: 25,
            enabled: true,
          });
          const meta = new Map<
            string,
            { contactId: string | null; partnerType: string | null }
          >();
          const options: EntityMasterOption[] = [];
          for (const p of result.items) {
            const docket = getLegalDocketFromCompliance(p.complianceJson);
            const agreementStatus = deriveAgreementRuntimeStatus(docket.agreement);
            const select = resolveWealthPartnerOpportunitySelectability({
              lifecycleStatus: p.lifecycleStatus,
              operationalStatus: p.operationalStatus,
              agreementStatus,
              registryStatus: p.status,
              enabled: p.enabled,
            });
            // Expired / Suspended / Retired / Archived — not selectable for new Opportunities.
            if (select.selectability === "not_selectable") continue;
            meta.set(p.id, {
              contactId: p.contactId,
              partnerType: p.partnerType,
            });
            const lifecycleLabel = wealthPartnerLifecycleLabel(p.lifecycleStatus);
            options.push({
              id: p.id,
              label: p.displayName,
              sublabel: [
                lifecycleLabel,
                p.code,
                wealthPartnerTypeLabel(p.partnerType),
                select.selectability === "selectable_with_warning"
                  ? "⚠ Renewal Due"
                  : null,
              ]
                .filter(Boolean)
                .join(" · "),
            });
          }
          setOptions(options);
          setWpMeta(meta);
          return;
        }

        if (config.registry === "enterprise_user") {
          const users = await searchAssignableUsers(q);
          setOptions(
            users.map((u) => ({
              id: u.id,
              label: u.fullName,
              sublabel: [u.employeeId, u.email].filter(Boolean).join(" · ") || undefined,
            })),
          );
          return;
        }

        if (isEnterprisePersistencePrisma()) {
          const rows = await liveSearchOperationalContacts(q, {
            pageSize: 25,
            roles: config.ecmRoles,
          });
          setOptions(
            rows.map((r) => ({
              id: r.id,
              label: r.label,
              sublabel: r.sublabel,
            })),
          );
          return;
        }

        const legacySource =
          config.registry === "ecm_builder"
            ? "Builder"
            : config.registry === "ecm_ca"
              ? "Chartered Accountant"
              : config.registry === "ecm_partner"
                ? "DSA Partner"
                : config.registry === "ecm_customer"
                  ? "Existing Customer"
                  : "Other Referral";
        const rows = listLoanJourneySourceContacts(legacySource).filter((c) => {
          const hay = `${c.label} ${c.sublabel ?? ""}`.toLowerCase();
          return hay.includes(q.trim().toLowerCase());
        });
        setOptions(
          rows.slice(0, 25).map((r) => ({
            id: r.id,
            label: r.label,
            sublabel: r.sublabel,
          })),
        );
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void runSearch(query, businessSource);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query, businessSource, runSearch]);

  if (!businessSource.trim()) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Select a Business Source to continue.
      </p>
    );
  }

  if (lookup.registry === "auto_customer") {
    return (
      <div className={cn("rounded-md border border-border/60 bg-muted/30 px-3 py-2", className)}>
        <p className="text-[11px] text-muted-foreground">
          Direct — Source auto-uses the Opportunity customer
          {autoCustomerName?.trim() ? (
            <>
              : <span className="font-medium text-foreground">{autoCustomerName.trim()}</span>
            </>
          ) : (
            " when available."
          )}
        </p>
      </div>
    );
  }

  if (lookup.hideField) {
    return (
      <p className="text-[11px] text-muted-foreground">
        {lookup.fieldLabel} is not applicable for this Business Source.
      </p>
    );
  }

  const effectiveSelectedId =
    lookup.registry === "wealth_partner"
      ? selectedWealthPartnerId || selectedId
      : selectedId;

  return (
    <div className={cn("space-y-1", className)}>
      <EntityMasterSearch
        placeholder={lookup.placeholder}
        selectedId={effectiveSelectedId || undefined}
        selectedLabel={selectedName || undefined}
        options={options}
        onQueryChange={setQuery}
        loading={loading}
        emptyLabel={`No matching record in ${lookup.registryLabel}.`}
        allowCreateNew={false}
        onSelect={(option) => {
          if (lookup.registry === "wealth_partner") {
            const meta = wpMeta.get(option.id);
            onSelect({
              id: meta?.contactId || option.id,
              name: option.label,
              wealthPartnerId: option.id,
              contactId: meta?.contactId ?? null,
              partnerType: meta?.partnerType ?? null,
            });
          } else {
            onSelect({ id: option.id, name: option.label });
          }
          setQuery("");
          setOptions([]);
        }}
      />
      {effectiveSelectedId ? (
        <button
          type="button"
          className="text-[10px] text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => onSelect(null)}
        >
          Clear {lookup.fieldLabel}
        </button>
      ) : null}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
      <p className="text-[10px] text-muted-foreground">
        Lookup: {lookup.registryLabel}
        {lookup.contactMandatory ? " · Required" : ""}
      </p>
    </div>
  );
}
