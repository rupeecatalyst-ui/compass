"use client";

import { useMemo, useState } from "react";
import { Library } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import {
  listFieldControlDefinitions,
  listOwnershipReviewDefinitions,
  sourceBindingLabel,
} from "@/lib/field-control-master";
import type { FieldControlClassification, FieldControlDefinition } from "@/types/field-control-master";
import { cn } from "@/lib/utils";

const CLASSIFICATION_LABELS: Record<FieldControlClassification, string> = {
  raw_canonical: "Raw / canonical",
  derived: "Derived",
  reference_mirror: "Reference / mirror",
  alias: "Alias",
  system: "System",
  configuration: "Configuration",
  programme_constraint_reference: "Programme constraint reference",
};

function ownershipLabel(definition: FieldControlDefinition): string {
  if (definition.ownershipReview === "owner_requires_product_decision") {
    return "Owner requires product decision";
  }
  return definition.owningDomain.replaceAll("_", " ");
}

function applicabilityLabel(definition: FieldControlDefinition): string {
  if (!definition.applicabilityDeclared) return "Not yet declared";
  return definition.productApplicability.join(", ");
}

export function FieldControlMasterView() {
  const definitions = useMemo(() => listFieldControlDefinitions(), []);
  const reviewCount = useMemo(() => listOwnershipReviewDefinitions().length, []);
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState("all");
  const [review, setReview] = useState("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return definitions.filter((definition) => {
      if (classification !== "all" && definition.classification !== classification) return false;
      if (review !== "all" && definition.ownershipReview !== review) return false;
      if (!needle) return true;
      const binding = sourceBindingLabel(definition.sourceBinding).toLowerCase();
      const haystack = [
        definition.fieldId,
        definition.friendlyLabel,
        definition.owningDomain,
        binding,
        definition.aliases.join(" "),
        definition.candidateMirrorOf ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [classification, definitions, query, review]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Field Control Master"
        description="Read-only registry of canonical field identities. Existing customer values stay in their current records."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-foreground">
            <Library className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold tabular-nums">{definitions.length} definitions</span>
            <span className="text-muted-foreground">·</span>
            <span className="tabular-nums">{reviewCount} need an ownership decision</span>
          </div>
        }
      />

      <div
        role="status"
        className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
      >
        Foundation V1 is inspection only. Create, edit, activate, and runtime assignment are not available.
        COMPASS, CHANAKYA, Match %, Product Journey, and domain forms do not read this registry yet. The
        database table is prepared locally and is not commissioned.
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs font-medium text-foreground">
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Field id, label, binding, alias"
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
          Classification
          <select
            value={classification}
            onChange={(event) => setClassification(event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            <option value="all">All</option>
            {Object.entries(CLASSIFICATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
          Ownership review
          <select
            value={review}
            onChange={(event) => setReview(event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            <option value="all">All</option>
            <option value="certified_binding">Certified binding</option>
            <option value="owner_requires_product_decision">Owner requires product decision</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
          <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              {[
                "Canonical field",
                "Type",
                "Classification",
                "Owner",
                "Source binding",
                "Lifecycle",
                "Version",
                "Product applicability",
                "Customer category",
                "Consumers",
                "Aliases",
                "Validation",
                "Presentation",
              ].map((heading) => (
                <th key={heading} className="px-3 py-2 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No definitions match this inspection filter.
                </td>
              </tr>
            ) : (
              visible.map((definition) => (
                <tr key={definition.fieldId} className="align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{definition.friendlyLabel}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{definition.fieldId}</div>
                    {definition.candidateMirrorOf ? (
                      <div className="mt-1 text-[11px] text-foreground">
                        Candidate mirror of {definition.candidateMirrorOf}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-foreground">{definition.fieldType}</td>
                  <td className="px-3 py-2 text-foreground">{CLASSIFICATION_LABELS[definition.classification]}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                        definition.ownershipReview === "owner_requires_product_decision"
                          ? "bg-amber-500/15 text-amber-950 dark:text-amber-100"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {ownershipLabel(definition)}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-foreground">
                    {sourceBindingLabel(definition.sourceBinding)}
                  </td>
                  <td className="px-3 py-2 text-foreground">{definition.lifecycleStatus}</td>
                  <td className="px-3 py-2 tabular-nums text-foreground">{definition.versionNumber}</td>
                  <td className="px-3 py-2 text-foreground">{applicabilityLabel(definition)}</td>
                  <td className="px-3 py-2 text-foreground">Not yet declared</td>
                  <td className="px-3 py-2 text-foreground">
                    {definition.authorisedConsumers.length ? definition.authorisedConsumers.join(", ") : "None"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-foreground">
                    {definition.aliases.length ? definition.aliases.join(", ") : "None"}
                  </td>
                  <td className="px-3 py-2 text-foreground">{definition.validationSummary}</td>
                  <td className="px-3 py-2 text-foreground">{definition.presentationSummary}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
