"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import type { CompassJourneyConfigField } from "@/lib/journey-config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export function DiscoveryConfiguredQuestions({
  purpose,
  stageId,
}: {
  purpose?: "recommendation" | "application";
  stageId?: string;
}) {
  const { journeyConfig, answers, setFieldAnswer, goNext, nudgeCompass } = useDiscovery();
  const [draft, setDraft] = useState("");
  const bag = answers.fieldAnswers ?? {};

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
      return required(item, bag) || Boolean(item.visibleWhenField);
    }) ?? null;

  if (!field) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">These details are saved.</p>
        <Button size="lg" className="mt-8 h-12 px-10" onClick={goNext}>
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const withinBounds = (value: string) => {
    if (field.min == null && field.max == null) return true;
    const numeric = Number(value.replace(/,/g, ""));
    if (!Number.isFinite(numeric)) return false;
    if (field.min != null && numeric < field.min) return false;
    if (field.max != null && numeric > field.max) return false;
    return true;
  };

  const save = (value: string) => {
    if (!withinBounds(value)) return;
    const nextBag = { ...bag, [field.fieldId]: value };
    for (const item of fields) {
      if (item.visibleWhenField !== field.fieldId) continue;
      if ((item.visibleWhenValues ?? []).includes(value)) continue;
      nextBag[item.fieldId] = "";
      setFieldAnswer(item.fieldId, "");
    }
    setFieldAnswer(field.fieldId, value);
    setDraft("");
    nudgeCompass();
    const remaining = fields.some((item) => {
      if (!visible(item, nextBag) || (nextBag[item.fieldId] ?? "").trim()) return false;
      return required(item, nextBag) || Boolean(item.visibleWhenField);
    });
    if (!remaining) goNext();
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{field.label}</h2>
        {field.helpText ? <p className="mt-2 text-sm text-muted-foreground">{field.helpText}</p> : null}
        {field.min != null || field.max != null ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Enter a value{field.min != null ? ` from ${field.min}` : ""}{field.max != null ? ` up to ${field.max}` : ""}.
          </p>
        ) : null}
      </div>
      <div className="mx-auto w-full max-w-md space-y-4">
        {field.options?.length ? (
          <div className="grid gap-3">
            {field.options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => save(option.value)}
                className={cn(
                  "rounded-2xl border p-4 text-left text-sm font-medium",
                  "border-white/[0.08] bg-white/[0.02] hover:border-primary/30",
                  bag[field.fieldId] === option.value && "border-primary/35 bg-primary/[0.08]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <>
            <input
              value={draft}
              inputMode={field.fieldType === "number" || field.fieldType === "currency" ? "decimal" : "text"}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={field.label}
              className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm outline-none focus:border-primary/35"
            />
            <div className="flex justify-center">
              <Button size="lg" className="h-12 px-10" disabled={!draft.trim() || !withinBounds(draft.trim())} onClick={() => save(draft.trim())}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
