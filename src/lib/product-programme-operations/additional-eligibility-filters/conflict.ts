import { asStringList, normalizeComparableToken, parseComparableNumber } from "./operators";
import { isEmptyAdditionalFilterSet } from "./parse";
import {
  constraintKeyForField,
  describeConstraint,
  describePredicate,
  finiteEnumUniverse,
  type GovernedConstraintSnapshot,
  type GovernedEnumConstraint,
  type GovernedFieldConstraint,
  type GovernedNumericConstraint,
} from "./programme-constraints";
import type {
  AdditionalEligibilityFilters,
  AdditionalFilterConflict,
  AdditionalFilterConflictReport,
  AdditionalFilterGroup,
  AdditionalFilterNode,
  AdditionalFilterPredicate,
} from "./types";

type EnumBound = { kind: "enum"; allowed: Set<string> | null };
type NumericBound = {
  kind: "numeric";
  min: number | null;
  max: number | null;
  minInclusive: boolean;
  maxInclusive: boolean;
};
type ExistenceBound = { kind: "existence"; vacant: boolean };
type FieldBound = EnumBound | NumericBound | ExistenceBound;
type AndSpace = Map<string, FieldBound>;

function cloneBound(bound: FieldBound): FieldBound {
  if (bound.kind === "enum") {
    return { kind: "enum", allowed: bound.allowed ? new Set(bound.allowed) : null };
  }
  return { ...bound };
}

function cloneSpace(space: AndSpace): AndSpace {
  return new Map([...space.entries()].map(([key, bound]) => [key, cloneBound(bound)]));
}

function enumEmpty(bound: EnumBound): boolean {
  return bound.allowed != null && bound.allowed.size === 0;
}

function numericEmpty(bound: NumericBound): boolean {
  if (bound.min == null || bound.max == null) return false;
  if (bound.min > bound.max) return true;
  if (bound.min === bound.max && (!bound.minInclusive || !bound.maxInclusive)) return true;
  return false;
}

function boundEmpty(bound: FieldBound): boolean {
  if (bound.kind === "enum") return enumEmpty(bound);
  if (bound.kind === "numeric") return numericEmpty(bound);
  return false;
}

function intersectEnum(left: EnumBound, right: EnumBound): EnumBound {
  if (left.allowed == null) return { kind: "enum", allowed: right.allowed ? new Set(right.allowed) : null };
  if (right.allowed == null) return { kind: "enum", allowed: new Set(left.allowed) };
  return { kind: "enum", allowed: new Set([...left.allowed].filter((item) => right.allowed!.has(item))) };
}

function intersectNumeric(left: NumericBound, right: NumericBound): NumericBound {
  let min = left.min;
  let minInclusive = left.minInclusive;
  if (right.min != null && (min == null || right.min > min || (right.min === min && !right.minInclusive))) {
    min = right.min;
    minInclusive = right.minInclusive;
  } else if (right.min != null && right.min === min) {
    minInclusive = minInclusive && right.minInclusive;
  }
  let max = left.max;
  let maxInclusive = left.maxInclusive;
  if (right.max != null && (max == null || right.max < max || (right.max === max && !right.maxInclusive))) {
    max = right.max;
    maxInclusive = right.maxInclusive;
  } else if (right.max != null && right.max === max) {
    maxInclusive = maxInclusive && right.maxInclusive;
  }
  return { kind: "numeric", min, max, minInclusive, maxInclusive };
}

function intersectBounds(left: FieldBound, right: FieldBound): FieldBound | null {
  if (left.kind !== right.kind) return null;
  if (left.kind === "enum") return intersectEnum(left, right as EnumBound);
  if (left.kind === "numeric") return intersectNumeric(left, right as NumericBound);
  if (left.kind === "existence" && right.kind === "existence") {
    return left.vacant === (right as ExistenceBound).vacant ? { ...left } : null;
  }
  return null;
}

function andSpaces(left: AndSpace[], right: AndSpace[]): AndSpace[] {
  const out: AndSpace[] = [];
  for (const a of left) {
    for (const b of right) {
      const merged = cloneSpace(a);
      let impossible = false;
      for (const [key, bound] of b) {
        const existing = merged.get(key);
        if (!existing) {
          merged.set(key, cloneBound(bound));
          continue;
        }
        const next = intersectBounds(existing, bound);
        if (!next || boundEmpty(next)) {
          impossible = true;
          break;
        }
        merged.set(key, next);
      }
      if (!impossible && ![...merged.values()].some(boundEmpty)) out.push(merged);
    }
  }
  return out;
}

function orSpaces(left: AndSpace[], right: AndSpace[]): AndSpace[] {
  return [...left, ...right];
}

function unconstrainedSpace(): AndSpace[] {
  return [new Map()];
}

function emptySpaces(): AndSpace[] {
  return [];
}

type CompileOutcome = { ok: true; spaces: AndSpace[] } | { ok: false; reason: "CONFIGURATION_INVALID"; predicate: AdditionalFilterPredicate };

function unsupported(predicate: AdditionalFilterPredicate): CompileOutcome {
  return { ok: false, reason: "CONFIGURATION_INVALID", predicate };
}

function predicateToSpace(
  predicate: AdditionalFilterPredicate,
  existing: GovernedConstraintSnapshot,
): CompileOutcome {
  const key = constraintKeyForField(predicate.fieldId) ?? predicate.fieldId;
  const operator = predicate.operator;
  const existingConstraint = existing?.[key];

  if (operator === "CONTAINS" || operator === "NOT_CONTAINS") {
    return unsupported(predicate);
  }

  if (operator === "IS_EMPTY" || operator === "IS_NOT_EMPTY") {
    if (existingConstraint && constraintActive(existingConstraint)) return unsupported(predicate);
    const space: AndSpace = new Map([[key, { kind: "existence", vacant: operator === "IS_EMPTY" }]]);
    return { ok: true, spaces: [space] };
  }

  const list = asStringList(predicate.value) ?? (predicate.value == null ? [] : [String(predicate.value)]);
  const tokens = list.map(normalizeComparableToken).filter(Boolean);
  const numeric = parseComparableNumber(predicate.value);

  if (operator === "NOT_EQUALS" || operator === "NOT_IN") {
    const existingAllowed = existingConstraint?.kind === "enum" ? existingConstraint.allowed : null;
    const universe = finiteEnumUniverse(key, existingAllowed);
    if (!universe) return unsupported(predicate);
    const excluded = new Set(tokens);
    const allowed = new Set(universe.filter((item) => !excluded.has(item)));
    const space: AndSpace = new Map([[key, { kind: "enum", allowed }]]);
    return { ok: true, spaces: boundEmpty(space.get(key)!) ? emptySpaces() : [space] };
  }

  const enumOps = new Set(["EQUALS", "IN"]);
  if (enumOps.has(operator) && numeric == null) {
    const space: AndSpace = new Map([[key, { kind: "enum", allowed: new Set(tokens) }]]);
    return { ok: true, spaces: boundEmpty(space.get(key)!) ? emptySpaces() : [space] };
  }

  if (numeric == null && operator !== "EQUALS") {
    return { ok: true, spaces: emptySpaces() };
  }
  const bound: NumericBound = {
    kind: "numeric",
    min: null,
    max: null,
    minInclusive: true,
    maxInclusive: true,
  };
  if (operator === "EQUALS" && numeric != null) {
    bound.min = numeric;
    bound.max = numeric;
  } else if (operator === "GREATER_THAN") {
    bound.min = numeric;
    bound.minInclusive = false;
  } else if (operator === "GREATER_THAN_OR_EQUAL") {
    bound.min = numeric;
    bound.minInclusive = true;
  } else if (operator === "LESS_THAN") {
    bound.max = numeric;
    bound.maxInclusive = false;
  } else if (operator === "LESS_THAN_OR_EQUAL") {
    bound.max = numeric;
    bound.maxInclusive = true;
  } else {
    return unsupported(predicate);
  }
  const space: AndSpace = new Map([[key, bound]]);
  return { ok: true, spaces: boundEmpty(bound) ? emptySpaces() : [space] };
}

function nodeToSpaces(node: AdditionalFilterNode, existing: GovernedConstraintSnapshot): CompileOutcome {
  if (node.kind === "predicate") return predicateToSpace(node, existing);
  if (!node.children.length) return { ok: true, spaces: unconstrainedSpace() };
  const compiled: AndSpace[][] = [];
  for (const child of node.children) {
    const next = nodeToSpaces(child, existing);
    if (!next.ok) return next;
    compiled.push(next.spaces);
  }
  const spaces = node.combinator === "AND"
    ? compiled.reduce((acc, next) => andSpaces(acc, next), unconstrainedSpace())
    : compiled.reduce((acc, next) => orSpaces(acc, next), emptySpaces());
  return { ok: true, spaces };
}

function constraintToBound(constraint: GovernedFieldConstraint): FieldBound {
  if (constraint.kind === "enum") {
    return { kind: "enum", allowed: constraint.allowed ? new Set(constraint.allowed.map(normalizeComparableToken)) : null };
  }
  return {
    kind: "numeric",
    min: constraint.min,
    max: constraint.max,
    minInclusive: constraint.minInclusive,
    maxInclusive: constraint.maxInclusive,
  };
}

function constraintActive(constraint: GovernedFieldConstraint): boolean {
  if (constraint.kind === "enum") return Boolean(constraint.allowed?.length);
  return constraint.min != null || constraint.max != null;
}

function sameFieldPredicates(node: AdditionalFilterNode, acc: AdditionalFilterPredicate[] = []): AdditionalFilterPredicate[] {
  if (node.kind === "predicate") {
    acc.push(node);
    return acc;
  }
  for (const child of node.children) sameFieldPredicates(child, acc);
  return acc;
}

function firstConflictingPredicate(
  filters: AdditionalEligibilityFilters,
  key: string,
): AdditionalFilterPredicate | null {
  return sameFieldPredicates(filters.root).find((predicate) => (constraintKeyForField(predicate.fieldId) ?? predicate.fieldId) === key) ?? null;
}

function intersectSpaceWithExisting(space: AndSpace, existing: GovernedConstraintSnapshot): AndSpace | null {
  const next = cloneSpace(space);
  for (const [key, constraint] of Object.entries(existing)) {
    if (!constraintActive(constraint)) continue;
    const governed = constraintToBound(constraint);
    const current = next.get(key);
    if (!current) {
      next.set(key, governed);
      continue;
    }
    const merged = intersectBounds(current, governed);
    if (!merged || boundEmpty(merged)) return null;
    next.set(key, merged);
  }
  return [...next.values()].some(boundEmpty) ? null : next;
}

export function validateAdditionalFilterConflicts(input: {
  filters: AdditionalEligibilityFilters | null | undefined;
  existing: GovernedConstraintSnapshot;
}): AdditionalFilterConflictReport {
  if (isEmptyAdditionalFilterSet(input.filters ?? null)) return { ok: true };
  const filters = input.filters!;
  const compiled = nodeToSpaces(filters.root, input.existing);
  if (!compiled.ok) {
    return {
      ok: false,
      code: "CONFIGURATION_INVALID",
      conflicts: [{
        code: "ADDITIONAL_FILTER_CONFLICT",
        fieldId: compiled.predicate.fieldId,
        fieldLabel: constraintKeyForField(compiled.predicate.fieldId) ?? compiled.predicate.fieldId,
        existingGovernedRule: "unsupported conflict proof",
        attemptedAdditionalRule: describePredicate(compiled.predicate),
      }],
      detail: "CONFIGURATION_INVALID",
    };
  }
  const spaces = compiled.spaces;
  if (!spaces.length) {
    const predicates = sameFieldPredicates(filters.root);
    const first = predicates[0];
    const key = first ? constraintKeyForField(first.fieldId) ?? first.fieldId : "filters";
    return {
      ok: false,
      code: "ADDITIONAL_FILTER_CONFLICT",
      conflicts: [{
        code: "ADDITIONAL_FILTER_CONFLICT",
        fieldId: first?.fieldId ?? key,
        fieldLabel: key,
        existingGovernedRule: "additional filters",
        attemptedAdditionalRule: first ? describePredicate(first) : "impossible AND intersection",
      }],
      detail: "ADDITIONAL_FILTER_CONFLICT",
    };
  }

  const surviving = spaces
    .map((space) => intersectSpaceWithExisting(space, input.existing))
    .filter((space): space is AndSpace => space != null);
  if (surviving.length) return { ok: true };

  const conflicts: AdditionalFilterConflict[] = [];
  for (const [key, constraint] of Object.entries(input.existing)) {
    if (!constraintActive(constraint)) continue;
    const predicate = firstConflictingPredicate(filters, key);
    if (!predicate) continue;
    const attempted = predicateToSpace(predicate, input.existing);
    if (!attempted.ok) continue;
    const sample = attempted.spaces[0]?.get(key);
    if (!sample) continue;
    const merged = intersectBounds(sample, constraintToBound(constraint));
    if (!merged || boundEmpty(merged)) {
      conflicts.push({
        code: "ADDITIONAL_FILTER_CONFLICT",
        fieldId: predicate.fieldId,
        fieldLabel: constraint.fieldLabel,
        existingGovernedRule: describeConstraint(constraint),
        attemptedAdditionalRule: describePredicate(predicate),
      });
    }
  }
  if (!conflicts.length) {
    const first = sameFieldPredicates(filters.root)[0];
    conflicts.push({
      code: "ADDITIONAL_FILTER_CONFLICT",
      fieldId: first?.fieldId ?? "filters",
      fieldLabel: first ? constraintKeyForField(first.fieldId) ?? first.fieldId : "filters",
      existingGovernedRule: "governed programme / additional filters",
      attemptedAdditionalRule: first ? describePredicate(first) : "impossible intersection",
    });
  }
  return { ok: false, code: "ADDITIONAL_FILTER_CONFLICT", conflicts, detail: "ADDITIONAL_FILTER_CONFLICT" };
}

export function walkFilterGroups(node: AdditionalFilterNode, visit: (group: AdditionalFilterGroup) => void): void {
  if (node.kind === "group") {
    visit(node);
    for (const child of node.children) walkFilterGroups(child, visit);
  }
}

export type { GovernedEnumConstraint, GovernedNumericConstraint };
