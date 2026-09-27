"use client";

import { useState } from "react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  fieldControlReviewPath,
  fieldControlSubmitReviewPath,
} from "@/lib/field-control-master/production-governance-lifecycle";
import type { FieldControlGovernanceDefinition } from "@/lib/field-control-master/production-governance-read";
import type { ApiResponse } from "@/types/api";

const GOVERNANCE_NOT_RUNTIME =
  "Approved is a governance status. It does not control runtime, customer-facing behaviour, or applicability.";

export function GovernedFieldLifecycleActions({
  definition,
  onCompleted,
}: {
  definition: FieldControlGovernanceDefinition;
  onCompleted: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (definition.ownershipReview !== "owner_requires_product_decision") return null;
  if (
    definition.lifecycleStatus !== "draft" &&
    definition.lifecycleStatus !== "checker_review" &&
    definition.lifecycleStatus !== "approved"
  ) {
    return null;
  }

  async function post(path: string, body: { expectedUpdatedAt: string; decision?: "approve" | "return" }) {
    setPending(true);
    setError(null);
    try {
      const response = await authenticatedJsonFetch(path, { method: "POST", body: JSON.stringify(body) });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success) {
        setError(payload.error?.message ?? "The governance action could not be saved.");
        return;
      }
      onCompleted();
    } catch {
      setError("The governance action could not be saved.");
    } finally {
      setPending(false);
    }
  }

  const stamp = definition.updatedAt;
  return (
    <section data-governance-lifecycle="bounded" className="mt-6 space-y-3 border-t border-border pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Governance review</h3>
      <p className="text-sm text-foreground">{GOVERNANCE_NOT_RUNTIME}</p>
      {definition.lifecycleStatus === "approved" ? (
        <p className="text-sm font-medium text-foreground">Approved. No further governance action is available.</p>
      ) : null}
      {definition.lifecycleStatus === "draft" ? (
        <button
          type="button"
          disabled={pending}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
          onClick={() => void post(fieldControlSubmitReviewPath(definition.id), { expectedUpdatedAt: stamp })}
        >Submit for Review</button>
      ) : null}
      {definition.lifecycleStatus === "checker_review" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Review Definition</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
              onClick={() =>
                void post(fieldControlReviewPath(definition.id), { decision: "approve", expectedUpdatedAt: stamp })
              }
            >Approve</button>
            <button
              type="button"
              disabled={pending}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
              onClick={() =>
                void post(fieldControlReviewPath(definition.id), { decision: "return", expectedUpdatedAt: stamp })
              }
            >Return to Maker</button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-foreground">
          {error}
        </p>
      ) : null}
    </section>
  );
}
