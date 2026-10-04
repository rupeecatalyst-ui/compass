"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OPPORTUNITY_LIFECYCLE_FILTER_OPTIONS } from "@/constants/opportunity-lifecycle";
import { EMPLOYEE_PWA_OFFLINE_MUTATION_BLOCKED } from "@/constants/employee-pwa";
import { employeePwaIsOnline, employeePwaJson } from "@/lib/employee-pwa/api";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  formatEmployeePwaAmount,
  formatEmployeePwaDate,
  formatEmployeePwaSourceIdentity,
} from "@/lib/employee-pwa/source-identity";
import { ROUTES } from "@/constants/routes";

type OpportunityDetail = {
  id: string;
  opportunityNumber?: string;
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactEmail?: string | null;
  companyName?: string | null;
  productLabel?: string | null;
  requestedAmount?: number | null;
  currencyCode?: string | null;
  sourceCode?: string | null;
  sourceContactName?: string | null;
  relationshipManagerName?: string | null;
  createdAt?: string | null;
  lifecycleStatus?: string | null;
  rowVersion?: number;
  primaryContactId?: string | null;
};

export function EmployeePwaOpportunityDetail() {
  const params = useParams<{ opportunityId: string }>();
  const opportunityId = params.opportunityId;
  const [row, setRow] = useState<OpportunityDetail | null>(null);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [assessment, setAssessment] = useState<Record<string, unknown> | null>(null);
  const [inbound, setInbound] = useState(0);

  const load = useCallback(async () => {
    const data = await employeePwaJson<OpportunityDetail>(
      `/api/enterprise-opportunities/${opportunityId}`,
    );
    setRow(data);
    setStage(data.lifecycleStatus || "dialogue");
    const inboundSummary = await employeePwaJson<{ count?: number }>(
      `/api/document-workspace/refinement-014?view=inbound-new-summary&opportunityIds=${opportunityId}`,
    );
    setInbound(Number(inboundSummary.count || 0));
    if ((data.sourceCode || "").toLowerCase().includes("compass") || data.sourceCode === "website_compass") {
      const compass = await authenticatedJsonFetch(
        `/api/opportunities/${opportunityId}/compass-assessment`,
      );
      const json = await compass.json().catch(() => ({}));
      setAssessment(json.assessment ?? null);
    }
  }, [opportunityId]);

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, [load]);

  const saveStage = async () => {
    if (!employeePwaIsOnline()) {
      setError(EMPLOYEE_PWA_OFFLINE_MUTATION_BLOCKED);
      return;
    }
    if (!row) return;
    setBusy(true);
    setError("");
    try {
      await employeePwaJson(`/api/enterprise-opportunities/${opportunityId}`, {
        method: "PATCH",
        body: JSON.stringify({ lifecycleStatus: stage, rowVersion: row.rowVersion }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stage change was refused.");
    } finally {
      setBusy(false);
    }
  };

  if (!row) return <p className="text-sm">{error || "Loading…"}</p>;

  const sla = assessment?.expertSla as { state?: string; remainingLabel?: string } | undefined;

  return (
    <div data-employee-pwa-opportunity-detail="true" className="space-y-3">
      <h1 className="text-xl font-semibold">{row.primaryContactName || row.companyName || "Opportunity"}</h1>
      <p className="text-xs text-muted-foreground">{row.opportunityNumber}</p>
      <dl className="space-y-1 text-sm">
        <div>Product: {row.productLabel || "Not Specified"}</div>
        <div>Amount: {formatEmployeePwaAmount(row.requestedAmount, row.currencyCode || "INR")}</div>
        <div>Source: {formatEmployeePwaSourceIdentity(row)}</div>
        <div>Created: {formatEmployeePwaDate(row.createdAt)}</div>
        {inbound ? <div data-employee-pwa-new-from-email="true">New from Email: {inbound}</div> : null}
      </dl>
      <div className="flex flex-wrap gap-2">
        {row.primaryContactMobile ? (
          <Button asChild size="sm" className="min-h-11">
            <a href={`tel:${row.primaryContactMobile}`}>Call</a>
          </Button>
        ) : null}
        {row.primaryContactEmail ? (
          <Button asChild size="sm" variant="outline" className="min-h-11">
            <a href={`mailto:${row.primaryContactEmail}`}>Email</a>
          </Button>
        ) : null}
        <Button asChild size="sm" variant="outline" className="min-h-11">
          <Link href={`/pwa/work/documents/${row.id}`}>Documents</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="min-h-11">
          <Link href={`${ROUTES.MY_OPPORTUNITIES}?opportunityId=${row.id}`}>Desktop</Link>
        </Button>
      </div>
      <Label htmlFor="stage">Stage</Label>
      <select
        id="stage"
        className="min-h-11 w-full rounded-md border bg-background px-3 text-sm"
        value={stage}
        onChange={(event) => setStage(event.target.value)}
      >
        {OPPORTUNITY_LIFECYCLE_FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Button type="button" disabled={busy} className="min-h-11 w-full" onClick={() => void saveStage()}>
        Apply canonical stage transition
      </Button>
      {sla ? (
        <p className="text-xs" data-employee-pwa-expert-sla="true">
          Talk-to-Expert SLA: {sla.state || "unknown"} {sla.remainingLabel || ""}
        </p>
      ) : null}
      {assessment ? (
        <pre className="max-h-40 overflow-auto rounded-lg border p-2 text-[11px]" data-employee-pwa-compass-assessment="true">
          COMPASS Assessment loaded
        </pre>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
