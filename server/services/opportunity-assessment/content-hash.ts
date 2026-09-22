import { createHash } from "node:crypto";
import type { OpportunityAssessmentFactsV1, OpportunityAssessmentSourceFingerprint } from "@/types/opportunity-assessment";
import type { AssessmentRevisionKind } from "./types";

function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

export function hashOpportunityAssessmentCommand(input: unknown): string {
  return createHash("sha256").update(canonicalJson(input)).digest("hex");
}

export function hashOpportunityAssessmentRevisionContent(input: {
  kind: AssessmentRevisionKind;
  facts: OpportunityAssessmentFactsV1;
  sourceFingerprint: OpportunityAssessmentSourceFingerprint;
  readinessStatus: string;
  factsSchemaVersion: string;
  mapperVersion: string;
  normalizedInputVersion: string | null;
  normalizedInput: unknown | null;
}): string {
  return createHash("sha256")
    .update(
      canonicalJson({
        kind: input.kind,
        facts: input.facts,
        sourceFingerprint: input.sourceFingerprint,
        readinessStatus: input.readinessStatus,
        factsSchemaVersion: input.factsSchemaVersion,
        mapperVersion: input.mapperVersion,
        normalizedInputVersion: input.normalizedInputVersion,
        normalizedInput: input.normalizedInput,
      }),
    )
    .digest("hex");
}
