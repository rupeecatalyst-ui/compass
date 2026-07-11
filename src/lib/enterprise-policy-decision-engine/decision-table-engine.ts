/**
 * EPDE decision table engine.
 */

import { EPDE_POLICY_LIFECYCLE_STATUS } from "@/constants/enterprise-policy-decision-engine";
import type { EpdePolicyContext } from "@/types/enterprise-policy-decision-engine";
import { getEpdePorts } from "./composition";
import { validateEpdeDecisionTable } from "./validation-engine";

export function evaluateEpdeDecisionTable(input: {
  tableId: string;
  context: EpdePolicyContext;
}): { matched: boolean; outputs: Record<string, string>; rowCode?: string } {
  const table = getEpdePorts().decisionTables.findById(input.tableId);
  if (!table?.enabled) throw new Error(`EPDE: decision table "${input.tableId}" not found.`);
  if (table.lifecycleStatus !== EPDE_POLICY_LIFECYCLE_STATUS.PUBLISHED) {
    throw new Error(`EPDE: decision table "${table.tableCode}" is not published.`);
  }

  const validation = validateEpdeDecisionTable(table);
  if (!validation.valid) throw new Error("EPDE: decision table validation failed.");

  const inputCols = table.columns.filter((c) => c.input);
  const rows = [...table.rows].filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);

  for (const row of rows) {
    const match = inputCols.every((col) => {
      const expected = row.inputs[col.columnCode];
      if (expected === "*") return true;
      const actual = input.context.variables[col.columnCode] ?? input.context.parameters[col.columnCode];
      return String(actual) === expected;
    });
    if (match) return { matched: true, outputs: row.outputs, rowCode: row.rowCode };
  }

  return { matched: false, outputs: {} };
}
