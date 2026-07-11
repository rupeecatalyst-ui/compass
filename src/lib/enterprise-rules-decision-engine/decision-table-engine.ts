/**
 * ERDE decision table engine.
 */

import { ERDE_RULE_LIFECYCLE_STATUS } from "@/constants/enterprise-rules-decision-engine";
import type { ErdeDecisionTable, ErdeRuleContext } from "@/types/enterprise-rules-decision-engine";
import { getErdePorts } from "./composition";
import { validateErdeDecisionTable } from "./validation-engine";

function rowMatches(
  table: ErdeDecisionTable,
  row: ErdeDecisionTable["rows"][number],
  context: ErdeRuleContext,
): boolean {
  const inputColumns = table.columns.filter((c) => c.input);

  return inputColumns.every((col) => {
    const expected = row.inputs[col.columnCode];
    if (expected === "*") return true;

    const actual = context.variables[col.columnCode] ?? context.parameters[col.columnCode];
    return String(actual) === expected;
  });
}

export function evaluateErdeDecisionTable(input: {
  tableId: string;
  context: ErdeRuleContext;
}): { matched: boolean; outputs: Record<string, string>; rowCode?: string } {
  const table = getErdePorts().decisionTables.findById(input.tableId);
  if (!table?.enabled) {
    throw new Error(`ERDE: decision table "${input.tableId}" not found or disabled.`);
  }
  if (table.lifecycleStatus !== ERDE_RULE_LIFECYCLE_STATUS.PUBLISHED) {
    throw new Error(`ERDE: decision table "${table.tableCode}" is not published.`);
  }

  const validation = validateErdeDecisionTable(table);
  if (!validation.valid) {
    throw new Error("ERDE: decision table validation failed.");
  }

  const sortedRows = [...table.rows]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const row of sortedRows) {
    if (rowMatches(table, row, input.context)) {
      return { matched: true, outputs: row.outputs, rowCode: row.rowCode };
    }
  }

  return { matched: false, outputs: {} };
}

export function publishErdeDecisionTable(tableId: string): ErdeDecisionTable | undefined {
  const table = getErdePorts().decisionTables.findById(tableId);
  if (!table) return undefined;

  const validation = validateErdeDecisionTable(table);
  if (!validation.valid) {
    throw new Error(validation.issues.map((i) => i.message).join("; "));
  }

  const updated: ErdeDecisionTable = {
    ...table,
    lifecycleStatus: ERDE_RULE_LIFECYCLE_STATUS.PUBLISHED,
  };

  getErdePorts().decisionTables.save(updated);
  return updated;
}
