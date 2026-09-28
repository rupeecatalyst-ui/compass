"use client";

import type { DealCustomFieldView } from "@/lib/field-control-master/deal-workspace-custom-fields";

const controlClass =
  "h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70";

export function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: DealCustomFieldView;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const disabled = !field.editable;
  if (field.fieldType === "long_text") {
    return (
      <textarea
        className="min-h-20 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground disabled:opacity-70"
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  if (field.fieldType === "number" || field.fieldType === "currency" || field.fieldType === "percentage") {
    return (
      <input
        className={controlClass}
        type="number"
        disabled={disabled}
        value={typeof value === "number" ? String(value) : ""}
        onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
      />
    );
  }
  if (field.fieldType === "date") {
    return (
      <input
        className={controlClass}
        type="date"
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  if (field.fieldType === "yes_no") {
    return (
      <select
        className={controlClass}
        disabled={disabled}
        value={typeof value === "boolean" ? String(value) : ""}
        onChange={(event) => onChange(event.target.value === "" ? "" : event.target.value === "true")}
      >
        <option value="">Not set</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (field.fieldType === "single_select") {
    const selected = typeof value === "string" ? value : "";
    return (
      <select
        className={controlClass}
        disabled={disabled}
        value={selected}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Not set</option>
        {field.options.map((option) => (
          <option key={option.key} value={option.key} disabled={!option.selectable && option.key !== selected}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.fieldType === "multi_select") {
    const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    return (
      <div className="space-y-1">
        {field.options.map((option) => {
          const checked = selected.includes(option.key);
          return (
            <label key={option.key} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                disabled={disabled || (!option.selectable && !checked)}
                checked={checked}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selected, option.key]
                    : selected.filter((key) => key !== option.key);
                  onChange(next);
                }}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    );
  }
  return (
    <input
      className={controlClass}
      type="text"
      disabled={disabled}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
