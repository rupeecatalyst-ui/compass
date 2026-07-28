/**
 * CO-LEND-001 — Compare current vs proposed program payloads.
 */
import type { LenderProgramFieldDef } from "@/constants/lender-program-portal";
import type {
  LenderProgramPayload,
  ProgramFieldComparison,
} from "@/types/lender-program-portal";

function display(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function compareProgramPayloads(
  fields: LenderProgramFieldDef[],
  current: LenderProgramPayload | null | undefined,
  proposed: LenderProgramPayload | null | undefined,
): ProgramFieldComparison[] {
  const cur = current ?? {};
  const prop = proposed ?? {};
  return fields.map((f) => {
    const currentValue = display(cur[f.key]);
    const proposedValue = display(prop[f.key]);
    return {
      key: f.key,
      label: f.label,
      currentValue,
      proposedValue,
      changed: currentValue !== proposedValue,
    };
  });
}
