"use client";

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
import {
  ADDITIONAL_FILTER_MAX_DEPTH,
  emptyAdditionalEligibilityFilters,
  listAdditionalEligibilityFilterFields,
  measureFilterDepth,
  operatorNeedsList,
  operatorNeedsValue,
  operatorsForValueType,
  snapshotGovernedConstraints,
  validateAdditionalFilterConflicts,
  type AdditionalEligibilityFilters,
  type AdditionalFilterGroup,
  type AdditionalFilterNode,
  type AdditionalFilterOperator,
  type AdditionalFilterPredicate,
  type FilterFieldOption,
  type ProgrammeConstraintSource,
} from "@/lib/product-programme-operations/additional-eligibility-filters";

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyPredicate(fieldId = ""): AdditionalFilterPredicate {
  return { kind: "predicate", id: newId("pred"), fieldId, operator: "EQUALS", value: "" };
}

function emptyGroup(): AdditionalFilterGroup {
  return { kind: "group", id: newId("group"), combinator: "AND", children: [] };
}

function replaceNode(node: AdditionalFilterNode, id: string, next: AdditionalFilterNode): AdditionalFilterNode {
  if (node.id === id) return next;
  if (node.kind !== "group") return node;
  return { ...node, children: node.children.map((child) => replaceNode(child, id, next)) };
}

function removeNode(node: AdditionalFilterNode, id: string): AdditionalFilterNode | null {
  if (node.id === id) return null;
  if (node.kind !== "group") return node;
  return { ...node, children: node.children.map((child) => removeNode(child, id)).filter((child): child is AdditionalFilterNode => child != null) };
}

function addChild(node: AdditionalFilterNode, groupId: string, child: AdditionalFilterNode): AdditionalFilterNode {
  if (node.kind === "group" && node.id === groupId) return { ...node, children: [...node.children, child] };
  if (node.kind !== "group") return node;
  return { ...node, children: node.children.map((item) => addChild(item, groupId, child)) };
}

function FieldRow({
  node,
  fields,
  depth,
  onChange,
  onRemove,
  onAddFilter,
  onAddGroup,
}: {
  node: AdditionalFilterNode;
  fields: FilterFieldOption[];
  depth: number;
  onChange: (next: AdditionalFilterNode) => void;
  onRemove: () => void;
  onAddFilter: () => void;
  onAddGroup: () => void;
}) {
  if (node.kind === "group") {
    return (
      <div className="space-y-3 rounded-lg border border-border p-3" data-filter-group={node.id}>
        <div className="flex flex-wrap items-center gap-2">
          <Label>Match</Label>
          <Select
            value={node.combinator}
            onValueChange={(value) => onChange({ ...node, combinator: value as AdditionalFilterGroup["combinator"] })}
          >
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">ALL / AND</SelectItem>
              <SelectItem value="OR">ANY / OR</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={onAddFilter}>+ Add Filter</Button>
          <Button type="button" variant="outline" size="sm" onClick={onAddGroup} disabled={depth >= ADDITIONAL_FILTER_MAX_DEPTH}>
            + Add Group
          </Button>
          {depth > 1 ? (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>Remove group</Button>
          ) : null}
        </div>
        <div className="space-y-3 pl-3">
          {node.children.map((child) => (
            <FieldRow
              key={child.id}
              node={child}
              fields={fields}
              depth={depth + 1}
              onChange={(next) => onChange(replaceNode(node, child.id, next))}
              onRemove={() => {
                const removed = removeNode(node, child.id);
                if (removed) onChange(removed);
              }}
              onAddFilter={() => child.kind === "group" && onChange(addChild(node, child.id, emptyPredicate()))}
              onAddGroup={() => child.kind === "group" && onChange(addChild(node, child.id, emptyGroup()))}
            />
          ))}
        </div>
      </div>
    );
  }

  const field = fields.find((item) => item.id === node.fieldId);
  const operators = field ? operatorsForValueType(field.valueType) : operatorsForValueType("string");
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,2fr)_auto]" data-filter-predicate={node.id}>
      <Select
        value={node.fieldId || undefined}
        onValueChange={(fieldId) => onChange({ ...node, fieldId, value: field?.enumOptions?.[0]?.id ?? node.value })}
      >
        <SelectTrigger><SelectValue placeholder="Canonical field" /></SelectTrigger>
        <SelectContent>
          {fields.map((item) => (
            <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={node.operator}
        onValueChange={(operator) => onChange({ ...node, operator: operator as AdditionalFilterOperator })}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {operators.map((operator) => (
            <SelectItem key={operator} value={operator}>{operator.replaceAll("_", " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {operatorNeedsValue(node.operator) ? (
        field?.enumOptions?.length && !operatorNeedsList(node.operator) ? (
          <Select value={String(node.value ?? "")} onValueChange={(value) => onChange({ ...node, value })}>
            <SelectTrigger><SelectValue placeholder="Value" /></SelectTrigger>
            <SelectContent>
              {field.enumOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field?.valueType === "boolean" ? (
          <Select value={String(node.value ?? "")} onValueChange={(value) => onChange({ ...node, value: value === "true" })}>
            <SelectTrigger><SelectValue placeholder="Value" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={field?.valueType === "date" ? "date" : field?.valueType === "string" || operatorNeedsList(node.operator) ? "text" : "number"}
            value={Array.isArray(node.value) ? node.value.join(",") : String(node.value ?? "")}
            placeholder={operatorNeedsList(node.operator) ? "comma-separated values" : "Value"}
            onChange={(event) => {
              const raw = event.target.value;
              onChange({
                ...node,
                value: operatorNeedsList(node.operator)
                  ? raw.split(",").map((item) => item.trim()).filter(Boolean)
                  : field?.valueType === "number" || field?.valueType === "integer" || field?.valueType === "percent" || field?.valueType === "currency"
                    ? (raw === "" ? "" : Number(raw))
                    : raw,
              });
            }}
          />
        )
      ) : <div />}
      <Button type="button" variant="ghost" size="sm" onClick={onRemove}>Remove</Button>
    </div>
  );
}

export function AdditionalEligibilityFilterBuilder({
  productCode,
  employmentFamily,
  value,
  onChange,
  existingConstraints,
}: {
  productCode: string | null | undefined;
  employmentFamily?: "salaried" | "self_employed" | "unknown" | null;
  value: AdditionalEligibilityFilters | null | undefined;
  onChange: (next: AdditionalEligibilityFilters) => void;
  existingConstraints: ProgrammeConstraintSource;
}) {
  const filters = value ?? emptyAdditionalEligibilityFilters();
  const fields = productCode
    ? listAdditionalEligibilityFilterFields({ productCode, employmentFamily })
    : [];
  const live = validateAdditionalFilterConflicts({
    filters,
    existing: snapshotGovernedConstraints(existingConstraints),
  });

  return (
    <div className="space-y-3" data-section="additional-eligibility-filters">
      <div>
        <h4 className="font-medium">Additional Eligibility Filters</h4>
        <p className="text-sm text-muted-foreground">
          Refine this programme only. Filters cannot contradict or broaden governed programme or policy rules.
          Field choices are limited to the current product / module journey.
        </p>
      </div>
      {!productCode ? (
        <p className="text-sm text-muted-foreground">Select a product to choose module-applicable fields.</p>
      ) : (
        <FieldRow
          node={filters.root}
          fields={fields}
          depth={measureFilterDepth(filters.root)}
          onChange={(root) => onChange({ version: 1, root: root as AdditionalFilterGroup })}
          onRemove={() => onChange(emptyAdditionalEligibilityFilters())}
          onAddFilter={() => onChange({
            version: 1,
            root: { ...filters.root, children: [...filters.root.children, emptyPredicate()] },
          })}
          onAddGroup={() => onChange({
            version: 1,
            root: { ...filters.root, children: [...filters.root.children, emptyGroup()] },
          })}
        />
      )}
      {!live.ok ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" role="alert">
          <p className="font-medium">ADDITIONAL_FILTER_CONFLICT</p>
          {live.conflicts.map((conflict) => (
            <p key={`${conflict.fieldId}-${conflict.attemptedAdditionalRule}`}>
              Field: {conflict.fieldLabel}. Existing governed rule: {conflict.existingGovernedRule}. Attempted additional rule: {conflict.attemptedAdditionalRule}.
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
