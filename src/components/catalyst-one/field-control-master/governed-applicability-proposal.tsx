"use client";

import { useState } from "react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { listCanonicalProductOptions } from "@/constants/enterprise-product-master/canonical-catalog";
import { fieldControlApplicabilityVersionPath } from "@/lib/field-control-master/production-governance-applicability";
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
    </section>
  );
}
