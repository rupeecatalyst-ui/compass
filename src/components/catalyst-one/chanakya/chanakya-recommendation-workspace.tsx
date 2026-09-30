"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { RecommendationGroup } from "@/components/catalyst-one/credit-bench/chanakya-opportunity-recommendation-panel";
import { CitySelect } from "@/components/catalyst-one/shared/city-select";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  CHANAKYA_FACT_INPUTS,
  chanakyaSubmitValue,
} from "@/lib/opportunity-assessment/chanakya-fact-inputs";
import { selectStandardRecommendationPresentation } from "@/lib/opportunity-assessment/standard-presentation";
import type { ChanakyaRecommendationWorkspaceDto } from "@/types/chanakya-recommendation-workspace";

type Envelope = {
  success?: boolean;
  data?: ChanakyaRecommendationWorkspaceDto;
  error?: { message?: string; code?: string };
};

export function ChanakyaRecommendationWorkspace({
  opportunityId,
  open,
  onClose,
}: {
  opportunityId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [model, setModel] = useState<ChanakyaRecommendationWorkspaceDto | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await authenticatedJsonFetch(
        `/api/enterprise-opportunities/${encodeURIComponent(opportunityId)}/chanakya-recommendation`,
      );
      const body = (await response.json()) as Envelope;
      if (!response.ok || !body.success || !body.data) {
        setError(body.error?.message || "Recommendation could not be opened.");
        setModel(null);
        return;
      }
      setModel(body.data);
    } catch {
      setError("Recommendation could not be opened.");
      setModel(null);
    } finally {
      setBusy(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  if (!open) return null;

  const missingKeys = model?.missingFactKeys ?? [];
  const inputs = missingKeys.reduce<Array<{ key: string; input: (typeof CHANAKYA_FACT_INPUTS)[string] }>>(
    (rows, key) => {
      const input = CHANAKYA_FACT_INPUTS[key];
      if (!input) return rows;
      if (input.control === "city" && rows.some((row) => row.input.control === "city")) return rows;
      rows.push({ key, input });
      return rows;
    },
    [],
  );
  const informationComplete =
    model?.workspaceState === "INFORMATION_COMPLETE" || model?.workspaceState === "NO_ELIGIBLE_PROGRAMMES";
  const presentation = selectStandardRecommendationPresentation(
    model?.result?.recommendations ?? [],
    model?.result?.presentation,
  );
  const hasCards = presentation.recommended.length + presentation.additional.length > 0;

  const submit = async () => {
    const payload: Record<string, string | number> = {};
    for (const row of inputs) {
      if (row.input.control === "city") {
        const city = values[`${row.key}:city`] ?? "";
        const state = values[`${row.key}:state`] ?? "";
        if (!city || !state) {
          setError("Select a property city.");
          return;
        }
        payload.cityLabel = city;
        payload.stateLabel = state;
        continue;
      }
      const parsed = chanakyaSubmitValue(row.input.control, values[row.key] ?? "");
      if (parsed == null) {
        setError(`Enter ${row.input.label}.`);
        return;
      }
      payload[row.input.patchKey] = parsed;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await authenticatedJsonFetch(
        `/api/enterprise-opportunities/${encodeURIComponent(opportunityId)}/chanakya-recommendation`,
        { method: "POST", body: JSON.stringify(payload) },
      );
      const body = (await response.json()) as Envelope;
      if (!response.ok || !body.success || !body.data) {
        setError(body.error?.message || "The details could not be saved.");
        return;
      }
      setModel(body.data);
      setValues({});
    } catch {
      setError("The details could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-label="CHANAKYA Recommendation">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-700" />
          <h2 className="text-sm font-semibold">CHANAKYA Recommendation</h2>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
          Close
        </Button>
      </header>
      <div className="grid min-h-0 flex-1 md:grid-cols-2">
        <section className="min-h-0 overflow-y-auto border-b p-4 md:border-b-0 md:border-r">
          <h3 className="text-sm font-semibold">Information</h3>
          {busy && !model ? <p className="mt-3 text-sm text-muted-foreground">Reading saved Opportunity facts…</p> : null}
          {informationComplete ? (
            <p className="mt-3 text-sm text-foreground">Information complete</p>
          ) : null}
          {model?.panel === "information_required" ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm font-medium">
                {inputs.length} detail{inputs.length === 1 ? "" : "s"} required
              </p>
              {inputs.map((row) => (
                <div key={row.key} className="space-y-1">
                  <Label htmlFor={`chanakya-${row.key}`}>{row.input.label}</Label>
                  {row.input.control === "city" ? (
                    <CitySelect
                      city={values[`${row.key}:city`]}
                      state={values[`${row.key}:state`]}
                      onSelect={(entry) =>
                        setValues((prev) => ({
                          ...prev,
                          [`${row.key}:city`]: entry.city,
                          [`${row.key}:state`]: entry.state,
                        }))
                      }
                    />
                  ) : row.input.control === "select" ? (
                    <Select
                      value={values[row.key] ?? ""}
                      onValueChange={(value) => setValues((prev) => ({ ...prev, [row.key]: value }))}
                    >
                      <SelectTrigger id={`chanakya-${row.key}`}>
                        <SelectValue placeholder={`Select ${row.input.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(row.input.options ?? []).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`chanakya-${row.key}`}
                      inputMode={
                        row.input.control === "date"
                          ? undefined
                          : row.input.control === "age" || row.input.control === "count" || row.input.control === "months"
                            ? "numeric"
                            : "decimal"
                      }
                      type={row.input.control === "date" ? "date" : "text"}
                      value={values[row.key] ?? ""}
                      placeholder={row.input.control === "money" || row.input.control === "money_or_zero" ? "₹" : ""}
                      onChange={(event) => setValues((prev) => ({ ...prev, [row.key]: event.target.value }))}
                    />
                  )}
                </div>
              ))}
              <Button type="button" disabled={busy || inputs.length === 0} onClick={() => void submit()}>
                Submit & Get Recommendation
              </Button>
            </div>
          ) : null}
          {model?.panel === "unsupported" ? (
            <p className="mt-3 text-sm text-foreground">{model.guidance}</p>
          ) : null}
          {model?.workspaceState === "UNSUPPORTED_CANONICAL_FACT" ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-foreground">{model.guidance}</p>
              {model.blockers.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                  {model.blockers.map((item) => (
                    <li key={item.factKey}>{item.displayLabel}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : model?.panel === "blocked" ? (
            <p className="mt-3 text-sm text-foreground">{model.guidance}</p>
          ) : null}
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </section>
        <section className="min-h-0 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold">CHANAKYA Recommendation</h3>
          {busy ? (
            <ChanakyaLoadingExperience
              module="credit"
              statusLabel="Preparing the lender recommendation..."
              density="inline"
              useEbiSignals={false}
            />
          ) : null}
          {!busy && model?.panel === "information_required" ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Recommendation will appear after the required information is submitted.
            </p>
          ) : null}
          {!busy && model?.workspaceState === "NO_ELIGIBLE_PROGRAMMES" ? (
            <p className="mt-3 text-sm text-foreground">{model.guidance}</p>
          ) : null}
          {!busy && hasCards ? (
            <div className="mt-3 space-y-3">
              <RecommendationGroup label="Recommended" rows={presentation.recommended} />
              <RecommendationGroup label="Additional options" rows={presentation.additional} />
            </div>
          ) : null}
          {!busy && model?.workspaceState === "UNSUPPORTED_CANONICAL_FACT" ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-foreground">{model.guidance}</p>
              {model.blockers.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                  {model.blockers.map((item) => (
                    <li key={item.factKey}>{item.displayLabel}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : !busy && model?.panel === "blocked" ? (
            <p className="mt-3 text-sm text-muted-foreground">{model.guidance}</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
