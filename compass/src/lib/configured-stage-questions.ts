import type { CompassJourneyConfig, CompassJourneyConfigField } from "@/lib/journey-config";
import { isGovernedMonetaryField } from "@/lib/governed-monetary-answer";

/** Published stages rendered by the configured-question screen. */
const CONFIGURED_STAGE_IDS = new Set(["application", "recommendation", "questions"]);

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

function fieldsForConfiguredStage(
  stageId: string,
  config: CompassJourneyConfig | null | undefined,
): CompassJourneyConfigField[] {
  const all = [...(config?.fields ?? [])].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const staged = all.filter((item) => item.stageId === stageId);
  if (staged.length) return staged;
  const purpose = stageId === "application" ? "application" : "recommendation";
  return all.filter((item) => item.purpose === purpose);
}

export function configuredStageHasRemainingQuestion(
  stageId: string,
  config: CompassJourneyConfig | null | undefined,
  fieldAnswers: Record<string, string> | undefined,
): boolean {
  const bag = fieldAnswers ?? {};
  const monetary = (config?.journeyVersion ?? 0) >= 2;
  return fieldsForConfiguredStage(stageId, config).some((item) => {
    if (!visible(item, bag) || (bag[item.fieldId] ?? "").trim()) return false;
    return (
      required(item, bag) ||
      Boolean(item.visibleWhenField) ||
      (monetary && isGovernedMonetaryField(item.fieldId))
    );
  });
}

/** A published configured stage with nothing left to ask is not a customer action. */
export function shouldBypassEmptyConfiguredStage(
  stageId: string,
  config: CompassJourneyConfig | null | undefined,
  fieldAnswers: Record<string, string> | undefined,
): boolean {
  if (!CONFIGURED_STAGE_IDS.has(stageId)) return false;
  return !configuredStageHasRemainingQuestion(stageId, config, fieldAnswers);
}
