"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { fetchOpportunityAssessmentCapture } from "@/lib/enterprise-opportunity/opportunity-assessment-api-client";
import type { AssessmentFact, OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import type { OpportunityAssessmentCaptureDto } from "@/types/opportunity-assessment-capture";
import { StrategicTabToolbar } from "./strategic-tab-toolbar";

function factRows(facts: OpportunityAssessmentFactsV1): Array<{ label: string; fact: AssessmentFact<unknown> }> {
  const rows: Array<{ label: string; fact: AssessmentFact<unknown> }> = [];
  const walk = (section: string, value: object) => {
    for (const [key, fact] of Object.entries(value)) {
      rows.push({ label: `${section}.${key}`, fact: fact as AssessmentFact<unknown> });
    }
  };
  walk("borrower", facts.borrower);
  walk("income", facts.incomeAndObligations);
  walk("loan", facts.loanRequirement);
  walk("property", facts.property);
  walk("cibil", facts.cibil);
  walk("balanceTransfer", facts.balanceTransfer);
  return rows.filter((row) => row.fact.state !== "missing" || row.fact.value != null);
}

export function WorkspaceOpportunityAssessmentPanel({
  opportunityId,
}: {
  opportunityId: string;
  opportunityContext?: { productLabel?: string | null; cityLabel?: string | null };
}) {
  const [model, setModel] = useState<OpportunityAssessmentCaptureDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const next = await fetchOpportunityAssessmentCapture(opportunityId);
    setModel(next);
    setError(null);
  }, [opportunityId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "ASSESSMENT_PERSISTENCE_FAILURE");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (error && !model) return <p className="text-sm text-destructive">{error}</p>;
  if (!model) return <p className="text-sm text-zinc-400">Loading Opportunity Assessment…</p>;

  const rows = factRows(model.facts);

  return (
    <div className="space-y-3">
      <StrategicTabToolbar
        title="Opportunity Assessment"
        description="Read-only system snapshot of canonical Opportunity facts. Historical revisions stay stored."
      />
      <div className="flex flex-wrap gap-2">
        <Badge>{model.readinessStatus}</Badge>
        {model.currentRevisionKind ? <Badge variant="outline">{model.currentRevisionKind}</Badge> : <Badge variant="outline">No revision</Badge>}
        <Badge variant="outline">row {model.rowVersion}</Badge>
        {model.currentRevisionNumber ? <Badge variant="outline">revision {model.currentRevisionNumber}</Badge> : null}
      </div>
      <p className="text-xs text-zinc-400">{model.readinessCopy}</p>
      {model.missingLabels.length > 0 ? (
        <p className="text-xs text-zinc-400">Missing: {model.missingLabels.join(", ")}</p>
      ) : null}
      <ul className="space-y-1 text-xs text-zinc-200">
        {rows.map((row) => (
          <li key={row.label}>
            {row.label}: {row.fact.value == null ? row.fact.state : String(row.fact.value)}
          </li>
        ))}
      </ul>
    </div>
  );
}
