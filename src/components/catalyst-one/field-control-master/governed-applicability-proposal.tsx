"use client";

import { useState } from "react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { listCanonicalProductOptions } from "@/constants/enterprise-product-master/canonical-catalog";
import {
  fieldControlApplicabilityVersionPath,
  fieldControlEmploymentApplicabilityVersionPath,
} from "@/lib/field-control-master/production-governance-applicability";
import { OPPORTUNITY_FORM_EMPLOYMENT_TYPE_OPTIONS } from "@/lib/field-control-master/opportunity-employment-applicability";
import type { FieldControlGovernanceDefinition } from "@/lib/field-control-master/production-governance-read";
import type { ApiResponse } from "@/types/api";

const PROPOSAL_COPY =
  "Creating this proposal creates a new governed version. It does not change application behaviour.";

export function GovernedApplicabilityProposal({
  definition,
  onCreated,
}: {
  definition: FieldControlGovernanceDefinition;
  onCreated: (definitionId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (definition.ownershipReview !== "owner_requires_product_decision") return null;
  if (definition.lifecycleStatus !== "approved") return null;

  const products = listCanonicalProductOptions();

  function toggle(code: string) {
    setSelected((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  }

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const response = await authenticatedJsonFetch(fieldControlApplicabilityVersionPath(definition.id), {
        method: "POST",
        body: JSON.stringify({ productCodes: selected, expectedUpdatedAt: definition.updatedAt }),
      });
      const payload = (await response.json()) as ApiResponse<{ definition: FieldControlGovernanceDefinition }>;
      if (!response.ok || !payload.success || !payload.data?.definition.id) {
        setError(payload.error?.message ?? "The applicability proposal could not be saved.");
        return;
      }
      onCreated(payload.data.definition.id);
    } catch {
      setError("The applicability proposal could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section data-applicability-proposal="bounded" className="mt-6 space-y-3 border-t border-border pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product applicability</h3>
      <p className="text-sm text-foreground">{PROPOSAL_COPY}</p>
      <p className="text-sm text-foreground">Customer categories stay as recorded on this version.</p>
      {!open ? (
        <button
          type="button"
          className="h-9 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => setOpen(true)}
        >Propose Applicability</button>
      ) : (
        <div className="space-y-3">
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {products.map((product) => (
              <li key={product.code}>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={selected.includes(product.code)}
                    onChange={() => toggle(product.code)}
                  />
                  <span>{product.label}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{product.code}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="text-sm text-foreground">
            Selected product applicability: {selected.length > 0 ? selected.join(", ") : "None"}
          </p>
          <button
            type="button"
            disabled={pending || selected.length === 0}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
            onClick={() => void submit()}
          >Save applicability proposal</button>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-sm text-foreground">
          {error}
        </p>
      ) : null}
      {definition.owningDomain === "opportunity" ? (
        <EmploymentApplicabilityProposal definition={definition} onCreated={onCreated} />
      ) : null}
    </section>
  );
}

function EmploymentApplicabilityProposal({
  definition,
  onCreated,
}: {
  definition: FieldControlGovernanceDefinition;
  onCreated: (definitionId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(code: string) {
    setSelected((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  }

  async function submit(declared: boolean) {
    setPending(true);
    setError(null);
    try {
      const response = await authenticatedJsonFetch(fieldControlEmploymentApplicabilityVersionPath(definition.id), {
        method: "POST",
        body: JSON.stringify({
          declared,
          employmentTypeCodes: declared ? selected : [],
          expectedUpdatedAt: definition.updatedAt,
        }),
      });
      const payload = (await response.json()) as ApiResponse<{ definition: FieldControlGovernanceDefinition }>;
      if (!response.ok || !payload.success || !payload.data?.definition.id) {
        setError(payload.error?.message ?? "The employment applicability proposal could not be saved.");
        return;
      }
      onCreated(payload.data.definition.id);
    } catch {
      setError("The employment applicability proposal could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Employment type applicability
      </h3>
      <p className="text-sm text-foreground">
        This controls whether the question appears on the Opportunity form. It does not decide lender eligibility.
      </p>
      <p className="text-sm text-foreground">
        Customer categories stay separate. Creating this proposal creates a new governed version and does not change the approved version.
      </p>
      {!open ? (
        <button
          type="button"
          className="h-9 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => setOpen(true)}
        >
          Propose employment type applicability
        </button>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-1 rounded-md border border-border p-2">
            {OPPORTUNITY_FORM_EMPLOYMENT_TYPE_OPTIONS.map((option) => (
              <li key={option.value}>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(option.value)} />
                  <span>{option.label}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{option.value}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || selected.length === 0}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
              onClick={() => void submit(true)}
            >
              Save employment restriction
            </button>
            <button
              type="button"
              disabled={pending}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
              onClick={() => void submit(false)}
            >
              Do not restrict by employment type
            </button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-sm text-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
