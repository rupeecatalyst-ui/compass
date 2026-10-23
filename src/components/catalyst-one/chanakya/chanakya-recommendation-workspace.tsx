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
  chanakyaContextIdentityFromOpportunity,
  formatChanakyaOpportunityContextLine,
} from "@/lib/chanakya/opportunity-context-line";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import {
  CHANAKYA_FACT_INPUTS,
  chanakyaSubmitValue,
} from "@/lib/opportunity-assessment/chanakya-fact-inputs";
import { selectStandardRecommendationPresentation } from "@/lib/opportunity-assessment/standard-presentation";
import type { CompassRecommendationHistoryVersion } from "@/lib/compass-customer-gateway/recommendation-history";
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
  const [contextLine, setContextLine] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recalculateOpen, setRecalculateOpen] = useState(false);

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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void enterpriseOpportunityApiClient.getOpportunity(opportunityId)
      .then((opportunity) => {
        if (cancelled) return;
        setContextLine(
          formatChanakyaOpportunityContextLine(chanakyaContextIdentityFromOpportunity(opportunity)),
        );
      })
      .catch(() => {
        if (!cancelled) setContextLine(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, opportunityId]);

  if (!open) return null;

  const compass = model?.compassHistory ?? null;
  const compassOrigin = compass?.compassOrigin === true;
  const formKeys = compassOrigin && recalculateOpen && compass
    ? [...compass.prefill.map((item) => item.key), ...compass.missingFactKeys]
    : model?.missingFactKeys ?? [];
  const missingKeys = [...new Set(formKeys)];
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
    const payload: Record<string, string | number | boolean> = {};
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
    if (compassOrigin) payload.recalculate = true;
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
      setRecalculateOpen(false);
    } catch {
      setError("The details could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const openRecalculate = () => {
    const next: Record<string, string> = {};
    for (const item of compass?.prefill ?? []) {
      next[item.key] = item.value;
      if (item.key === "property.propertyCity") {
        next[`${item.key}:city`] = item.value;
        if (item.state) next[`${item.key}:state`] = item.state;
      }
    }
    setValues(next);
    setError(null);
    setRecalculateOpen(true);
  };
  const showFactForm = (compassOrigin && recalculateOpen) || (!compassOrigin && model?.panel === "information_required");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-label="CHANAKYA Recommendation">
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-teal-700" />
            <h2 className="text-sm font-semibold">CHANAKYA Recommendation</h2>
          </div>
          {contextLine ? (
            <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{contextLine}</p>
          ) : null}
        </div>
        <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
          Close
        </Button>
      </header>
      <div className="grid min-h-0 flex-1 md:grid-cols-2">
        <section className="min-h-0 overflow-y-auto border-b p-4 md:border-b-0 md:border-r">
          <h3 className="text-sm font-semibold">Information</h3>
          {busy && !model ? <p className="mt-3 text-sm text-muted-foreground">Reading saved Opportunity facts…</p> : null}
          {informationComplete && !compassOrigin ? (
            <p className="mt-3 text-sm text-foreground">Information complete</p>
          ) : null}
          {compassOrigin && compass ? (
            <div className="mt-3 space-y-4">
              {compass.versions.map((version) => (
                <div key={`${version.kind}-${version.versionNumber}`} className="space-y-1">
                  <p className="text-sm font-semibold">{version.title}</p>
                  {version.recordedAt ? (
                    <p className="text-xs text-muted-foreground">{version.recordedAt}</p>
                  ) : null}
                  {version.actorUserId ? (
                    <p className="text-xs text-muted-foreground">Employee {version.actorUserId}</p>
                  ) : null}
                  {version.journeyVersion != null ? (
                    <p className="text-xs text-muted-foreground">Journey version {version.journeyVersion}</p>
                  ) : null}
                  {version.recommendationBinding ? (
                    <p className="text-xs text-muted-foreground">Programme binding {version.recommendationBinding}</p>
                  ) : null}
                  {version.assessment.map((line) => (
                    <p key={`${version.versionNumber}-${line.label}`} className="text-sm text-foreground">
                      {line.label}: {line.value}
                    </p>
                  ))}
                  {version.note ? <p className="text-sm text-foreground">{version.note}</p> : null}
                </div>
              ))}
              {!recalculateOpen ? (
                <Button type="button" disabled={busy} onClick={openRecalculate}>
                  Recalculate
                </Button>
              ) : null}
            </div>
          ) : null}
          {showFactForm ? (
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
                {compassOrigin ? "Recalculate" : "Submit & Get Recommendation"}
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
          {!busy && compassOrigin && compass ? (
            <div className="mt-3 space-y-4">
              {compass.versions.map((version) => (
                <HistoryVersion key={`${version.kind}-${version.versionNumber}`} version={version} />
              ))}
            </div>
          ) : null}
          {!busy && !compassOrigin && model?.panel === "information_required" ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Recommendation will appear after the required information is submitted.
            </p>
          ) : null}
          {!busy && !compassOrigin && model?.workspaceState === "NO_ELIGIBLE_PROGRAMMES" ? (
            <p className="mt-3 text-sm text-foreground">{model.guidance}</p>
          ) : null}
          {!busy && !compassOrigin && hasCards ? (
            <div className="mt-3 space-y-3">
              <RecommendationGroup label="Recommended" rows={presentation.recommended} />
              <RecommendationGroup label="Additional options" rows={presentation.additional} />
            </div>
          ) : null}
          {!busy && !compassOrigin && model?.workspaceState === "UNSUPPORTED_CANONICAL_FACT" ? (
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
          ) : !busy && !compassOrigin && model?.panel === "blocked" ? (
            <p className="mt-3 text-sm text-muted-foreground">{model.guidance}</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function HistoryVersion({ version }: { version: CompassRecommendationHistoryVersion }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{version.title}</p>
      {version.note ? <p className="text-sm text-foreground">{version.note}</p> : null}
      {version.selectedLenders.flatMap((lender, index) => (
        version.cards.some((card) => card.customerPreference === index + 1)
          ? []
          : [(
            <StoredLender
              key={`${version.versionNumber}-preference-${lender.lenderRef || lender.lenderName}`}
              name={lender.lenderName}
              programmeVersion={lender.programmeVersion}
              preferenceLabel={`Preference ${index + 1}`}
              lines={[
                ["ROI", lender.interestRateLabel],
                ["EMI", lender.estimatedEmiLabel],
                ["Tenure", lender.tenureLabel],
                ["Eligible offer", lender.tentativeOfferLabel],
                ["Processing", lender.processingTimeLabel],
              ]}
              selected
            />
          )]
      ))}
      {version.cards.map((card) => (
        <StoredLender
          key={`${version.versionNumber}-${card.rank}-${card.lenderRef || card.displayName}`}
          name={card.displayName}
          rank={card.rank}
          programmeVersion={card.programmeVersion}
          score={card.matchScore}
          explanation={card.explanation}
          preferenceLabel={card.customerPreference ? `Preference ${card.customerPreference}` : null}
          lines={[
            ["ROI", card.interestRateLabel],
            ["EMI", card.estimatedEmiLabel],
            ["Tenure", card.tenureLabel],
            ["Eligible offer", card.tentativeOfferLabel],
            ["Requested", card.requestedAmountLabel],
            ["Processing", card.processingTimeLabel],
          ]}
          selected={card.customerSelected}
          showAbsentCommercials={version.kind === "compass_original"}
        />
      ))}
    </div>
  );
}

function StoredLender({
  name,
  rank,
  programmeVersion,
  score,
  explanation,
  lines,
  selected,
  preferenceLabel = null,
  showAbsentCommercials = false,
}: {
  name: string;
  rank?: number;
  programmeVersion: number | null;
  score?: number | null;
  explanation?: string | null;
  lines: Array<[string, string | null]>;
  selected: boolean;
  preferenceLabel?: string | null;
  showAbsentCommercials?: boolean;
}) {
  const visible = lines.flatMap(([label, value]) => {
    if (value) return [[label, value] as const];
    if (showAbsentCommercials) return [[label, "Not available"] as const];
    return [];
  });
  return (
    <div className={selected ? "rounded-md border border-emerald-700 bg-emerald-50 p-3" : "rounded-md border p-3"}>
      <div className="flex items-start justify-between gap-2">
        <p className={selected ? "text-sm font-semibold text-emerald-950" : "text-sm font-semibold"}>
          {rank != null ? `${rank}. ` : ""}
          {name}
        </p>
        {selected ? (
          <span className="shrink-0 rounded-md bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white">
            {preferenceLabel ?? "Customer Selected Lender"}
          </span>
        ) : null}
      </div>
      {programmeVersion != null ? (
        <p className={selected ? "mt-1 text-xs text-emerald-950" : "mt-1 text-xs text-muted-foreground"}>
          Programme version {programmeVersion}
        </p>
      ) : null}
      {score != null ? (
        <p className={selected ? "text-xs text-emerald-950" : "text-xs text-muted-foreground"}>Score {score}</p>
      ) : null}
      {explanation ? (
        <p className={selected ? "mt-1 text-sm text-emerald-950" : "mt-1 text-sm text-foreground"}>{explanation}</p>
      ) : null}
      {visible.length > 0 ? (
        <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
          {visible.map(([label, value]) => (
            <div key={label}>
              <dt className={selected ? "text-emerald-950" : "text-muted-foreground"}>{label}</dt>
              <dd className={selected ? "font-medium text-emerald-950" : "font-medium"}>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
