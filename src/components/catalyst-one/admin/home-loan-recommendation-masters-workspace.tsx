"use client";

import { useEffect, useState } from "react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type MasterRow = { id: string; lifecycleStatus: string; versionNumber?: number; productCode?: string; labelledUnapproved?: boolean };

export function HomeLoanRecommendationMastersWorkspace() {
  const [data, setData] = useState<{
    activationPolicy?: string;
    weights?: MasterRow[];
    cibil?: MasterRow[];
    ltv?: MasterRow[];
    categories?: MasterRow[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async () => {
    const res = await authenticatedJsonFetch("/api/admin/home-loan-recommendation-masters");
    const body = await res.json();
    setData(body.data ?? body);
  };

  useEffect(() => {
    void reload();
  }, []);

  const post = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await authenticatedJsonFetch("/api/admin/home-loan-recommendation-masters", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Request failed.");
      setMessage("Saved as Draft / unapproved. Nothing was activated.");
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const List = ({ title, rows }: { title: string; rows?: MasterRow[] }) => (
    <Card className="space-y-2 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {(rows ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No versions yet.</p> : null}
      {(rows ?? []).map((row) => (
        <div key={row.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono text-xs">{row.id.slice(0, 10)}</span>
          <Badge variant="outline">{row.lifecycleStatus}</Badge>
          {row.labelledUnapproved ? <Badge>Unapproved demonstration draft</Badge> : null}
          {row.lifecycleStatus === "draft" ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void post({ intent: "transition", kind: title.includes("Weight") ? "weights" : title.includes("CIBIL") ? "cibil" : "ltv", id: row.id, action: "submit_review" })}>
              Submit for checker
            </Button>
          ) : null}
        </div>
      ))}
    </Card>
  );

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Home Loan recommendation masters</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Versioned, maker-checker controlled rules for lender category, product weightage, CIBIL-to-category
          gates, regulatory LTV and overrides. This build does not populate or activate live lender categories
          or programmes. Engine recommendations stay Assisted Offer until the Product Owner uploads verified
          programmes and activates approved versions.
        </p>
      </div>
      <p className="text-sm text-amber-200">{data?.activationPolicy}</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void post({ intent: "create_unapproved_drafts" })}>
          Create labelled unapproved drafts
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            void post({
              intent: "simulate",
              customer: {
                journeyKind: "home_loan",
                requiredAmountRupees: 50_00_000,
                propertyValueRupees: 80_00_000,
                employmentFamily: "salaried",
                monthlyIncomeRupees: 1_20_000,
                existingMonthlyEmiRupees: 15_000,
                cibilBand: "not_known",
              },
            })
          }
        >
          Simulate (no live programmes)
        </Button>
      </div>
      {message ? <p className="text-sm">{message}</p> : null}
      <List title="Product weightage rule sets" rows={data?.weights} />
      <List title="CIBIL-to-category rules" rows={data?.cibil} />
      <List title="Regulatory LTV rules" rows={data?.ltv} />
      <List title="Lender category assignments" rows={data?.categories} />
    </div>
  );
}
