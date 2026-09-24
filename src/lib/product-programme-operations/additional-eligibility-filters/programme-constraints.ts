import {
  PROGRAMME_CONSTRUCTION_STATUSES,
  PROGRAMME_EMPLOYMENT_TYPES,
  PROGRAMME_LEGAL_CONSTITUTIONS,
  PROGRAMME_PROPERTY_CATEGORIES,
  PROGRAMME_RESIDENCY,
} from "@/constants/product-programme-operations/controlled-masters";
import { normalizeComparableToken, parseComparableNumber } from "./operators";
import type { AdditionalFilterPredicate } from "./types";

const GOVERNED_ENUM_UNIVERSES: Record<string, readonly string[]> = {
  constructionStatus: PROGRAMME_CONSTRUCTION_STATUSES.map((item) => item.id),
  propertyCategory: PROGRAMME_PROPERTY_CATEGORIES.map((item) => item.id),
  employment: PROGRAMME_EMPLOYMENT_TYPES.map((item) => item.id),
  residency: PROGRAMME_RESIDENCY.map((item) => item.id),
  constitution: PROGRAMME_LEGAL_CONSTITUTIONS.map((item) => item.id),
};

export function finiteEnumUniverse(fieldKey: string, existingAllowed?: string[] | null): string[] | null {
  if (existingAllowed?.length) return existingAllowed.map(normalizeComparableToken);
  const master = GOVERNED_ENUM_UNIVERSES[fieldKey];
  return master?.length ? master.map(normalizeComparableToken) : null;
}

export type GovernedConstraintKind = "enum" | "numeric";

export type GovernedEnumConstraint = {
  kind: "enum";
  fieldKey: string;
  fieldLabel: string;
  allowed: string[] | null;
};

export type GovernedNumericConstraint = {
  kind: "numeric";
  fieldKey: string;
  fieldLabel: string;
  min: number | null;
  max: number | null;
  minInclusive: boolean;
  maxInclusive: boolean;
};

export type GovernedFieldConstraint = GovernedEnumConstraint | GovernedNumericConstraint;

export type GovernedConstraintSnapshot = Record<string, GovernedFieldConstraint>;

export type ProgrammeConstraintSource = {
  constructionStatuses?: string[] | null;
  propertyCategories?: string[] | null;
  propertyTypes?: string[] | null;
  employmentTypes?: string[] | null;
  residencyEligibility?: string[] | null;
  legalConstitutions?: string[] | null;
  eligibleCities?: string[] | null;
  geographyCities?: string[] | null;
  eligibleStates?: string[] | null;
  geographyStates?: string[] | null;
  minAge?: number | null;
  maxAge?: number | null;
  minCibil?: number | null;
  maxCibil?: number | null;
  minIncomeExact?: string | number | null;
  maxIncomeExact?: string | number | null;
  minIncomeRupees?: string | number | null;
  maxIncomeRupees?: string | number | null;
  allowedConstructionStatuses?: string[] | null;
};

const ENUM_ALIASES: Record<string, string> = {
  constructionstatus: "constructionStatus",
  construction_status: "constructionStatus",
  "property.constructionstatus": "constructionStatus",
  propertytype: "constructionStatus",
  propertycategory: "propertyCategory",
  "property.propertycategory": "propertyCategory",
  employment: "employment",
  employmenttype: "employment",
  employmenttypecode: "employment",
  employmentfamily: "employment",
  city: "city",
  journeycity: "city",
  "borrower.journeycity": "city",
  state: "state",
  journeystate: "state",
  residency: "residency",
  constitution: "constitution",
};

const NUMERIC_ALIASES: Record<string, string> = {
  age: "age",
  ageyears: "age",
  dateofbirth: "age",
  "borrower.ageyears": "age",
  "borrower.dateofbirth": "age",
  cibil: "cibil",
  exactscore: "cibil",
  monthlyincome: "income",
  "incomeandobligations.monthlyincome": "income",
};

function leafKey(fieldId: string): string {
  return normalizeComparableToken(fieldId.split(":").pop()?.split(".").pop() ?? fieldId);
}

function pathKey(fieldId: string): string {
  return normalizeComparableToken(fieldId.replace(/^assessment:|^idc:|^derived:|^ppo:/, ""));
}

export function constraintKeyForField(fieldId: string): string | null {
  const path = pathKey(fieldId);
  const leaf = leafKey(fieldId);
  return ENUM_ALIASES[path] ?? ENUM_ALIASES[leaf] ?? NUMERIC_ALIASES[path] ?? NUMERIC_ALIASES[leaf] ?? null;
}

function nonempty(values: string[] | null | undefined): string[] | null {
  const cleaned = (values ?? []).map((item) => normalizeComparableToken(item)).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

export function snapshotGovernedConstraints(source: ProgrammeConstraintSource): GovernedConstraintSnapshot {
  const snapshot: GovernedConstraintSnapshot = {};
  const construction = nonempty(source.constructionStatuses) ?? nonempty(source.allowedConstructionStatuses);
  snapshot.constructionStatus = {
    kind: "enum",
    fieldKey: "constructionStatus",
    fieldLabel: "Construction Status",
    allowed: construction,
  };
  snapshot.propertyCategory = {
    kind: "enum",
    fieldKey: "propertyCategory",
    fieldLabel: "Property Category",
    allowed: nonempty(source.propertyCategories),
  };
  snapshot.employment = {
    kind: "enum",
    fieldKey: "employment",
    fieldLabel: "Employment Type",
    allowed: nonempty(source.employmentTypes),
  };
  snapshot.city = {
    kind: "enum",
    fieldKey: "city",
    fieldLabel: "City",
    allowed: nonempty(source.eligibleCities) ?? nonempty(source.geographyCities),
  };
  snapshot.state = {
    kind: "enum",
    fieldKey: "state",
    fieldLabel: "State",
    allowed: nonempty(source.eligibleStates) ?? nonempty(source.geographyStates),
  };
  snapshot.residency = {
    kind: "enum",
    fieldKey: "residency",
    fieldLabel: "Residency",
    allowed: nonempty(source.residencyEligibility),
  };
  snapshot.constitution = {
    kind: "enum",
    fieldKey: "constitution",
    fieldLabel: "Constitution",
    allowed: nonempty(source.legalConstitutions),
  };
  snapshot.age = {
    kind: "numeric",
    fieldKey: "age",
    fieldLabel: "Age",
    min: source.minAge ?? null,
    max: source.maxAge ?? null,
    minInclusive: true,
    maxInclusive: true,
  };
  snapshot.cibil = {
    kind: "numeric",
    fieldKey: "cibil",
    fieldLabel: "CIBIL",
    min: source.minCibil ?? null,
    max: source.maxCibil ?? null,
    minInclusive: true,
    maxInclusive: true,
  };
  snapshot.income = {
    kind: "numeric",
    fieldKey: "income",
    fieldLabel: "Income",
    min: parseComparableNumber(source.minIncomeExact ?? source.minIncomeRupees),
    max: parseComparableNumber(source.maxIncomeExact ?? source.maxIncomeRupees),
    minInclusive: true,
    maxInclusive: true,
  };
  return snapshot;
}

export function describePredicate(predicate: AdditionalFilterPredicate): string {
  if (predicate.operator === "IS_EMPTY" || predicate.operator === "IS_NOT_EMPTY") {
    return predicate.operator;
  }
  const value = Array.isArray(predicate.value)
    ? predicate.value.map(String).join(", ")
    : String(predicate.value ?? "");
  return `${predicate.operator} ${value}`;
}

export function describeConstraint(constraint: GovernedFieldConstraint): string {
  if (constraint.kind === "enum") {
    return constraint.allowed?.length ? constraint.allowed.join(", ") : "unconstrained";
  }
  const min = constraint.min == null ? "unbounded" : String(constraint.min);
  const max = constraint.max == null ? "unbounded" : String(constraint.max);
  return `${min}–${max}`;
}
