import {
  ADDITIONAL_FILTER_COMBINATORS,
  ADDITIONAL_FILTER_MAX_DEPTH,
  ADDITIONAL_FILTER_MAX_NODES,
  ADDITIONAL_FILTER_OPERATORS,
  type AdditionalEligibilityFilters,
  type AdditionalFilterGroup,
  type AdditionalFilterNode,
  type AdditionalFilterOperator,
  type AdditionalFilterPredicate,
} from "./types";
import { operatorNeedsList, operatorNeedsValue } from "./operators";

let idSeq = 0;
function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

export function emptyAdditionalEligibilityFilters(): AdditionalEligibilityFilters {
  return {
    version: 1,
    root: { kind: "group", id: nextId("group"), combinator: "AND", children: [] },
  };
}

export function isEmptyAdditionalFilterSet(value: AdditionalEligibilityFilters | null | undefined): boolean {
  return !value || countFilterNodes(value.root) === 1;
}

export function countFilterNodes(node: AdditionalFilterNode): number {
  if (node.kind === "predicate") return 1;
  return 1 + node.children.reduce((sum, child) => sum + countFilterNodes(child), 0);
}

export function measureFilterDepth(node: AdditionalFilterNode): number {
  if (node.kind === "predicate") return 1;
  if (!node.children.length) return 1;
  return 1 + Math.max(...node.children.map(measureFilterDepth));
}

function asOperator(value: unknown): AdditionalFilterOperator | null {
  return typeof value === "string" && ADDITIONAL_FILTER_OPERATORS.includes(value as AdditionalFilterOperator)
    ? (value as AdditionalFilterOperator)
    : null;
}

function parsePredicate(raw: Record<string, unknown>): AdditionalFilterPredicate | null {
  const fieldId = typeof raw.fieldId === "string" ? raw.fieldId.trim() : "";
  const operator = asOperator(raw.operator);
  if (!fieldId || !operator) return null;
  const predicate: AdditionalFilterPredicate = {
    kind: "predicate",
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : nextId("pred"),
    fieldId,
    operator,
  };
  if (operatorNeedsValue(operator)) {
    predicate.value = raw.value;
    if (operatorNeedsList(operator) && raw.value == null) return null;
    if (!operatorNeedsList(operator) && (raw.value === undefined || raw.value === "")) return null;
  }
  return predicate;
}

function parseNode(raw: unknown, depth: number, tally: { nodes: number }): AdditionalFilterNode | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (depth > ADDITIONAL_FILTER_MAX_DEPTH) return null;
  const row = raw as Record<string, unknown>;
  if (row.kind === "predicate") {
    tally.nodes += 1;
    if (tally.nodes > ADDITIONAL_FILTER_MAX_NODES) return null;
    return parsePredicate(row);
  }
  if (row.kind !== "group") return null;
  const combinator = ADDITIONAL_FILTER_COMBINATORS.includes(row.combinator as never)
    ? (row.combinator as AdditionalFilterGroup["combinator"])
    : null;
  if (!combinator) return null;
  tally.nodes += 1;
  if (tally.nodes > ADDITIONAL_FILTER_MAX_NODES) return null;
  const childrenRaw = Array.isArray(row.children) ? row.children : [];
  const children: AdditionalFilterNode[] = [];
  for (const child of childrenRaw) {
    if (child && typeof child === "object" && !Array.isArray(child)) {
      const rowChild = child as Record<string, unknown>;
      if (rowChild.kind === "predicate" && !String(rowChild.fieldId ?? "").trim()) continue;
    }
    const parsed = parseNode(child, depth + 1, tally);
    if (!parsed) return null;
    children.push(parsed);
  }
  return {
    kind: "group",
    id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : nextId("group"),
    combinator,
    children,
  };
}

export function parseAdditionalEligibilityFilters(value: unknown): AdditionalEligibilityFilters | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("CONFIGURATION_INVALID");
  }
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length === 0) return null;
  // Dedicated column only. Do not unwrap policyAssessmentJson or any other envelope.
  if (row.root == null && row.kind !== "group") {
    throw new Error("CONFIGURATION_INVALID");
  }
  const rootRaw = row.root ?? row;
  const tally = { nodes: 0 };
  const root = parseNode(rootRaw, 1, tally);
  if (!root || root.kind !== "group") throw new Error("CONFIGURATION_INVALID");
  if (row.version != null && row.version !== 1) throw new Error("CONFIGURATION_INVALID");
  return { version: 1, root };
}

export function parseAdditionalEligibilityFiltersOrEmpty(value: unknown): AdditionalEligibilityFilters {
  return parseAdditionalEligibilityFilters(value) ?? emptyAdditionalEligibilityFilters();
}
