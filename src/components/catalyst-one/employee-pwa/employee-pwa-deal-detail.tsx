"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { EMPLOYEE_PWA_HUMAN_DEAL_STAGES, EMPLOYEE_PWA_OFFLINE_MUTATION_BLOCKED } from "@/constants/employee-pwa";
import { employeePwaIsOnline, employeePwaJson } from "@/lib/employee-pwa/api";
import {
  formatEmployeePwaAmount,
  formatEmployeePwaDate,
  formatEmployeePwaSourceIdentity,
} from "@/lib/employee-pwa/source-identity";
import { ROUTES } from "@/constants/routes";

type DealDetail = {
  id: string;
  dealNumber?: string;
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactEmail?: string | null;
  productLabel?: string | null;
  requestedAmount?: number | null;
  currencyCode?: string | null;
  sourceCode?: string | null;
  sourceContactName?: string | null;
  relationshipManagerName?: string | null;
  createdAt?: string | null;
  grossStage?: string | null;
  rowVersion?: number;
  opportunityId?: string | null;
};

export function EmployeePwaDealDetail() {
  const params = useParams<{ dealId: string }>();
  const dealId = params.dealId;
  const [row, setRow] = useState<DealDetail | null>(null);
  const [stage, setStage] = useState("identified");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const data = await employeePwaJson<DealDetail>(`/api/enterprise-deals/${dealId}`);
    setRow(data);
    setStage(data.grossStage || "identified");
  }, [dealId]);

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
      await employeePwaJson(`/api/enterprise-deals/${dealId}/transitions`, {
        method: "POST",
        body: JSON.stringify({
          rowVersion: row.rowVersion,
          toGrossStage: stage,
          reason: "Employee PWA canonical stage transition",
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stage change was refused.");
    } finally {
      setBusy(false);
    }
  };

  if (!row) return <p className="text-sm">{error || "Loading…"}</p>;

  return (
    <div data-employee-pwa-deal-detail="true" className="space-y-3">
      <h1 className="text-xl font-semibold">{row.primaryContactName || "Deal"}</h1>
      <p className="text-xs text-muted-foreground">{row.dealNumber}</p>
      <div className="text-sm">
        <p>Product: {row.productLabel || "Not Specified"}</p>
        <p>Amount: {formatEmployeePwaAmount(row.requestedAmount, row.currencyCode || "INR")}</p>
        <p>Source: {formatEmployeePwaSourceIdentity(row)}</p>
        <p>Created: {formatEmployeePwaDate(row.createdAt)}</p>
      </div>
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
        {row.opportunityId ? (
          <Button asChild size="sm" variant="outline" className="min-h-11">
            <Link href={`/pwa/work/documents/${row.opportunityId}?dealId=${row.id}`}>Documents</Link>
          </Button>
        ) : null}
        <Button asChild size="sm" variant="outline" className="min-h-11">
          <Link href={`${ROUTES.DEALS}/${row.id}`}>Desktop Deal Workspace</Link>
        </Button>
      </div>
      <Label htmlFor="deal-stage">Lender pipeline stage</Label>
      <select
        id="deal-stage"
        className="min-h-11 w-full rounded-md border bg-background px-3 text-sm"
        value={stage}
        onChange={(event) => setStage(event.target.value)}
      >
        {EMPLOYEE_PWA_HUMAN_DEAL_STAGES.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <Button type="button" disabled={busy} className="min-h-11 w-full" onClick={() => void saveStage()}>
        Apply canonical Deal transition
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
