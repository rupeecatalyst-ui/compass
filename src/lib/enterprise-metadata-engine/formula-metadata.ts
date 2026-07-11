/**
 * EME formula operator metadata — foundation only.
 */

import type { EmeFormulaOperator } from "@/types/enterprise-metadata-engine";
import { getEmePorts } from "./composition";

export function listEmeFormulaOperators(): EmeFormulaOperator[] {
  return getEmePorts()
    .formulaOperators.list()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getEmeFormulaOperator(operatorCode: string): EmeFormulaOperator | undefined {
  return getEmePorts().formulaOperators.findByCode(operatorCode);
}

export function listEmeFormulaOperatorsByCategory(
  category: EmeFormulaOperator["category"],
): EmeFormulaOperator[] {
  return listEmeFormulaOperators().filter((o) => o.category === category && o.enabled);
}
