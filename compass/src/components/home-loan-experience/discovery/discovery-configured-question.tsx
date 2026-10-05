"use client";

import { useEffect, useMemo, useState } from "react";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { GovernedMonetaryQuestion } from "@/components/home-loan-experience/discovery/governed-monetary-question";
import {
  DiscoveryQuestionFrame,
  GOVERNED_CONTROL,
} from "@/components/home-loan-experience/discovery/discovery-question-frame";
import { discoveryCopy } from "@/config/home-loan-discovery";
import { isGovernedMonetaryField } from "@/lib/governed-monetary-answer";
import {
  resolveMonthlyIncomeBounds,
  resolveRequestedAmountBounds,
  type CompassJourneyConfigField,
} from "@/lib/journey-config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

function visible(field: CompassJourneyConfigField, answers: Record<string, string>): boolean {
  if (!field.visibleWhenField) return true;
  const current = answers[field.visibleWhenField] ?? "";
  return (field.visibleWhenValues ?? []).includes(current);
}

function required(field: CompassJourneyConfigField, answers: Record<string, string>): boolean {
  if (!visible(field, answers)) return false;
  if (field.notRequiredWhenFilled?.some((key) => (answers[key] ?? "").trim())) return false;
  if (field.requiredWhenField) {
    return (field.requiredWhenValues ?? []).includes(answers[field.requiredWhenField] ?? "");
  }
  return field.required;
}

type CityHit = { id: string; city: string; state: string; label: string };

export function DiscoveryConfiguredQuestions({
  purpose,
  stageId,
}: {
  purpose?: "recommendation" | "application";
  stageId?: string;
}) {
  const { journeyConfig, answers, setFieldAnswer, goNext, nudgeCompass } = useDiscovery();
  const [draft, setDraft] = useState("");
  const [cities, setCities] = useState<CityHit[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const bag = answers.fieldAnswers ?? {};
  const monetaryControl = (journeyConfig?.journeyVersion ?? 0) >= 2;

  const fields = useMemo(() => {
    const all = [...(journeyConfig?.fields ?? [])].sort(
      (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
    );
    if (stageId) {
      const staged = all.filter((item) => item.stageId === stageId);
      if (staged.length) return staged;
    }
    return all.filter((item) => item.purpose === purpose);
  }, [journeyConfig?.fields, purpose, stageId]);

  const field =
    fields.find((item) => {
      if (!visible(item, bag) || (bag[item.fieldId] ?? "").trim()) return false;
      if (skipped.includes(item.fieldId)) return false;
      return (
        required(item, bag) ||
        Boolean(item.visibleWhenField) ||
        (monetaryControl && isGovernedMonetaryField(item.fieldId))
      );
    }) ?? null;

  useEffect(() => {
    setSkipped([]);
  }, [purpose, stageId]);

  useEffect(() => {
    setDraft("");
    setCities([]);
  }, [field?.fieldId]);

  useEffect(() => {
    if (!field || field.fieldType !== "city") return;
    const query = draft.trim();
    if (query.length < 2) {
      setCities([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void fetch(`/api/journey/cities?q=${encodeURIComponent(query)}`)
        .then((response) => (response.ok ? response.json() : { cities: [] }))
        .then((body: { cities?: CityHit[] }) => setCities(Array.isArray(body.cities) ? body.cities : []))
        .catch(() => setCities([]));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [draft, field]);

  if (!field) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">These details are saved.</p>
        <Button size="lg" className="mt-8 h-12 w-full max-w-md" onClick={goNext}>
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const withinBounds = (value: string) => {
    if (field.min == null && field.max == null) return true;
    const numeric = Number(value.replace(/,/g, ""));
    if (!Number.isInteger(numeric)) return false;
    if (field.min != null && numeric < field.min) return false;
    if (field.max != null && numeric > field.max) return false;
    return true;
  };

  const save = (value: string, displayLabel?: string) => {
    if (!withinBounds(value)) return;
    const nextBag = { ...bag, [field.fieldId]: value };
    for (const item of fields) {
      if (item.visibleWhenField !== field.fieldId) continue;
      if ((item.visibleWhenValues ?? []).includes(value)) continue;
      nextBag[item.fieldId] = "";
      setFieldAnswer(item.fieldId, "");
    }
    setFieldAnswer(field.fieldId, value, displayLabel);
    setDraft("");
    setCities([]);
    nudgeCompass();
    const remaining = fields.some((item) => {
      if (!visible(item, nextBag) || (nextBag[item.fieldId] ?? "").trim()) return false;
      return required(item, nextBag) || Boolean(item.visibleWhenField);
    });
    if (!remaining) goNext();
  };

  const rangeMessage =
    field.min != null || field.max != null
      ? `Enter a whole number${field.min != null ? ` from ${field.min}` : ""}${field.max != null ? ` up to ${field.max}` : ""}.`
      : null;
  const draftInvalid = Boolean(draft.trim()) && !withinBounds(draft.trim());
  const currency = field.fieldType === "currency";
  const numeric = currency || field.fieldType === "number";

  if (monetaryControl && isGovernedMonetaryField(field.fieldId)) {
    const bounds =
      field.fieldId === "requestedAmountLabel"
        ? resolveRequestedAmountBounds(journeyConfig, {
            min: discoveryCopy.loanAmount.min,
            max: discoveryCopy.loanAmount.max,
          })
        : field.fieldId === "monthlyIncomeLabel"
          ? resolveMonthlyIncomeBounds(journeyConfig, bag.employmentTypeCode, {
              min: discoveryCopy.monthlyIncome.min,
              max: discoveryCopy.monthlyIncome.max,
            })
          : {
              min: field.min ?? (field.fieldId === "propertyValueLabel"
                ? discoveryCopy.propertyValue.min
                : discoveryCopy.annualTurnover.min),
              max: field.max ?? (field.fieldId === "propertyValueLabel"
                ? discoveryCopy.propertyValue.max
                : discoveryCopy.annualTurnover.max),
            };
    const requiredNow = required(field, bag);
    return (
      <GovernedMonetaryQuestion
        key={field.fieldId}
        fieldId={field.fieldId}
        label={field.label}
        helpText={field.helpText}
        min={bounds.min}
        max={bounds.max}
        required={requiredNow}
        onCommit={(exact) => {
          const nextBag = { ...bag, [field.fieldId]: exact };
          for (const item of fields) {
            if (item.visibleWhenField !== field.fieldId) continue;
            if ((item.visibleWhenValues ?? []).includes(exact)) continue;
            nextBag[item.fieldId] = "";
            setFieldAnswer(item.fieldId, "");
          }
          setFieldAnswer(field.fieldId, exact);
          nudgeCompass();
          const remaining = fields.some((item) => {
            if (!visible(item, nextBag) || (nextBag[item.fieldId] ?? "").trim()) return false;
            return (
              required(item, nextBag) ||
              Boolean(item.visibleWhenField) ||
              (monetaryControl && isGovernedMonetaryField(item.fieldId))
            );
          });
          if (!remaining) goNext();
        }}
        onSkip={() => {
          const nextSkipped = [...skipped, field.fieldId];
          setSkipped(nextSkipped);
          const remaining = fields.some((item) => {
            if (!visible(item, bag) || (bag[item.fieldId] ?? "").trim()) return false;
            if (nextSkipped.includes(item.fieldId)) return false;
            return (
              required(item, bag) ||
              Boolean(item.visibleWhenField) ||
              (monetaryControl && isGovernedMonetaryField(item.fieldId))
            );
          });
          if (!remaining) goNext();
        }}
      />
    );
  }

  return (
    <DiscoveryQuestionFrame
      label={field.label}
      helpText={field.helpText}
      message={draftInvalid ? rangeMessage : rangeMessage && !field.options?.length && field.fieldType !== "city" ? rangeMessage : null}
      action={
        field.options?.length || field.fieldType === "city"
          ? null
          : {
              label: "Continue",
              disabled: !draft.trim() || !withinBounds(draft.trim()),
              onClick: () => save(draft.trim()),
            }
      }
    >
      {field.options?.length ? (
        <div className="grid gap-3">
          {field.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => save(option.value, option.label)}
              className={cn(
                "w-full rounded-2xl border p-4 text-left text-sm font-medium",
                "border-white/[0.08] bg-white/[0.02] hover:border-primary/30",
                bag[field.fieldId] === option.value && "border-primary/35 bg-primary/[0.08]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : field.fieldType === "city" ? (
        <div className="space-y-3">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search city"
            className={cn(GOVERNED_CONTROL, "px-4")}
            aria-label={field.label}
          />
          {cities.length ? (
            <div className="grid gap-3">
              {cities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => save(city.id, city.label)}
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-left text-sm font-medium hover:border-primary/30"
                >
                  {city.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <label className={cn(GOVERNED_CONTROL, "flex items-center px-4")}>
          {currency ? <span className="mr-2 text-muted-foreground">₹</span> : null}
          <input
            value={draft}
            inputMode={numeric ? "decimal" : "text"}
            onChange={(event) => setDraft(event.target.value)}
            aria-label={field.label}
            className="h-full w-full bg-transparent tabular-nums outline-none"
          />
        </label>
      )}
    </DiscoveryQuestionFrame>
  );
}
