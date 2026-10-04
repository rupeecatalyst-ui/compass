/**
 * Discover governed product fields from canonical sources.
 * Recommendation Masters must not register a field merely to make it appear.
 */

import { ASSESSMENT_PRODUCT_CODES, type OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import { emptyOpportunityAssessmentFacts } from "@/lib/opportunity-assessment/empty-facts";
import { getEnterpriseIdcCatalog } from "@/constants/enterprise-initial-data-collection/catalog";
import { listDiscoverableProgrammeConstraintKeys } from "@/lib/product-programme-operations/request-schema";
import { listHomeLoanGovernedDerivedFacts } from "@/lib/home-loan-recommendation/governed-derived-facts";
import { RECOMMENDATION_EVALUATOR_TYPES } from "./evaluator-types";
import type { ProjectedRecommendationField, RecommendationFieldKind } from "./types";

const pending = RECOMMENDATION_EVALUATOR_TYPES.PENDING_CONTRACT;

function isAssessmentFactLeaf(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "state" in value &&
      "value" in value,
  );
}

function humanizeKey(key: string): string {
  const leaf = key.includes(".") ? (key.split(".").pop() ?? key) : key;
  const spaced = leaf
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function valueTypeFromPath(path: string): ProjectedRecommendationField["valueType"] {
  const leaf = path.split(".").pop() ?? path;
  if (/Percent|Roi|Foir|Ltv|Dbr|Spread/i.test(leaf)) return "percent";
  if (
    /Amount|Income|Value|Emi|Principal|Turnover|Profit|Obligations|Fee/i.test(leaf) &&
    !/Methods|Types/i.test(leaf)
  ) {
    return "currency";
  }
  if (/Months|Count|Score|Age|Days|Vintage/i.test(leaf)) return "integer";
  if (/Date|Dob|At$/i.test(leaf) || leaf === "dateOfBirth") return "date";
  return "string";
}

function productCodesForAssessmentPath(path: string): readonly string[] {
  if (path.startsWith("balanceTransfer.")) return ["HOME_LOAN_BT"];
  return [...ASSESSMENT_PRODUCT_CODES];
}

function walkAssessmentFactLeaves(
  node: unknown,
  prefix: string,
  out: string[],
): void {
  if (isAssessmentFactLeaf(node)) {
    if (prefix) out.push(prefix);
    return;
  }
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
    if (key === "schemaVersion") continue;
    walkAssessmentFactLeaves(child, prefix ? `${prefix}.${key}` : key, out);
  }
}

function projectedField(input: Omit<ProjectedRecommendationField, "aliases"> & { aliases?: readonly string[] }): ProjectedRecommendationField {
  return { ...input, aliases: input.aliases ?? [] };
}

export function discoverAssessmentFields(
  facts: OpportunityAssessmentFactsV1 = emptyOpportunityAssessmentFacts(),
): ProjectedRecommendationField[] {
  const paths: string[] = [];
  walkAssessmentFactLeaves(facts, "", paths);
  return paths.map((path) =>
    projectedField({
      id: `assessment:${path}`,
      label: humanizeKey(path),
      productCodes: productCodesForAssessmentPath(path),
      sourceKind: "raw",
      fieldKind: "assessment_fact",
      valueType: valueTypeFromPath(path),
      customerFactRef: path,
      programmeFactRef: null,
      evaluatorType: pending,
      selectable: true,
      scoreability: "inputs_wired_scoring_contract_pending",
    }),
  );
}

export function discoverIdcFields(): ProjectedRecommendationField[] {
  const catalog = getEnterpriseIdcCatalog();
  const rows: ProjectedRecommendationField[] = [];
  const seen = new Set<string>();

  const productCodesFor = (families: readonly string[] | undefined): readonly string[] => {
    if (!families?.length) return [...ASSESSMENT_PRODUCT_CODES];
    const codes = new Set<string>();
    for (const family of families) {
      codes.add(family);
      if (family === "HOME_LOAN") codes.add("HOME_LOAN_BT");
    }
    return [...codes];
  };

  const ingest = (
    key: string,
    label: string,
    families: readonly string[] | undefined,
    control: string,
    inputMode?: string,
  ) => {
    const id = `idc:${key}`;
    if (seen.has(id)) return;
    seen.add(id);
    const numeric = control === "number" || inputMode === "decimal" || inputMode === "numeric";
    rows.push(
      projectedField({
        id,
        label,
        productCodes: productCodesFor(families),
        sourceKind: "raw",
        fieldKind: "assessment_fact",
        valueType: numeric ? valueTypeFromPath(key) : "string",
        customerFactRef: `idc:${key}`,
        programmeFactRef: null,
        evaluatorType: pending,
        selectable: true,
        scoreability: "inputs_wired_scoring_contract_pending",
      }),
    );
  };

  for (const field of catalog.customerCapture.fields) {
    ingest(field.key, field.label, field.visibleWhenProductFamilies, field.control, field.inputMode);
  }
  for (const section of catalog.detailSections) {
    if ((section.visibility ?? "visible") === "hidden") continue;
    for (const field of section.fields) {
      ingest(
        field.key,
        field.label,
        field.visibleWhenProductFamilies?.length
          ? field.visibleWhenProductFamilies
          : section.visibleWhenProductFamilies,
        field.control,
        field.inputMode,
      );
    }
  }
  return rows;
}

export function discoverProgrammeConstraintFields(): ProjectedRecommendationField[] {
  return listDiscoverableProgrammeConstraintKeys().map((key) =>
    projectedField({
      id: `ppo:${key}`,
      label: humanizeKey(key),
      productCodes: [...ASSESSMENT_PRODUCT_CODES],
      sourceKind: "raw",
      fieldKind: "programme_fact" as RecommendationFieldKind,
      valueType: valueTypeFromPath(key),
      customerFactRef: null,
      programmeFactRef: `ppo:${key}`,
      evaluatorType: pending,
      selectable: true,
      scoreability: "inputs_wired_scoring_contract_pending",
    }),
  );
}

export function discoverDerivedCalculatorFields(): ProjectedRecommendationField[] {
  return listHomeLoanGovernedDerivedFacts().map((fact) =>
    projectedField({
      id: fact.id,
      label: fact.label,
      productCodes: fact.productCodes,
      sourceKind: "derived",
      fieldKind: "derived_fact",
      valueType: fact.valueType,
      customerFactRef: fact.customerFactRef,
      programmeFactRef: null,
      evaluatorType: pending,
      selectable: true,
      scoreability: "inputs_wired_scoring_contract_pending",
      notes: fact.notes,
    }),
  );
}

export function discoverCanonicalRecommendationFields(input?: {
  assessmentFacts?: OpportunityAssessmentFactsV1;
}): ProjectedRecommendationField[] {
  const byId = new Map<string, ProjectedRecommendationField>();
  const ingest = (rows: ProjectedRecommendationField[]) => {
    for (const row of rows) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
  };
  ingest(discoverAssessmentFields(input?.assessmentFacts));
  ingest(discoverIdcFields());
  ingest(discoverProgrammeConstraintFields());
  ingest(discoverDerivedCalculatorFields());
  return [...byId.values()];
}
