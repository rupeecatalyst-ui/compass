/**
 * EME formula operator metadata — foundation only, no evaluation.
 */

import type { EmeFormulaOperator } from "@/types/enterprise-metadata-engine";

export const EME_FORMULA_OPERATOR_CODES = {
  ADD: "add",
  SUBTRACT: "subtract",
  MULTIPLY: "multiply",
  DIVIDE: "divide",
  MODULO: "modulo",
  GROUP_OPEN: "group_open",
  GROUP_CLOSE: "group_close",
  EQUALS: "equals",
  NOT_EQUALS: "not_equals",
  GREATER_THAN: "greater_than",
  LESS_THAN: "less_than",
  GREATER_OR_EQUAL: "greater_or_equal",
  LESS_OR_EQUAL: "less_or_equal",
  AND: "and",
  OR: "or",
  NOT: "not",
} as const;

export const EME_DEFAULT_FORMULA_OPERATORS: EmeFormulaOperator[] = [
  { id: "eme-op-add", operatorCode: EME_FORMULA_OPERATOR_CODES.ADD, symbol: "+", label: "Add", description: "Arithmetic addition.", category: "arithmetic", operandCount: 2, enabled: true, sortOrder: 1 },
  { id: "eme-op-sub", operatorCode: EME_FORMULA_OPERATOR_CODES.SUBTRACT, symbol: "-", label: "Subtract", description: "Arithmetic subtraction.", category: "arithmetic", operandCount: 2, enabled: true, sortOrder: 2 },
  { id: "eme-op-mul", operatorCode: EME_FORMULA_OPERATOR_CODES.MULTIPLY, symbol: "*", label: "Multiply", description: "Arithmetic multiplication.", category: "arithmetic", operandCount: 2, enabled: true, sortOrder: 3 },
  { id: "eme-op-div", operatorCode: EME_FORMULA_OPERATOR_CODES.DIVIDE, symbol: "/", label: "Divide", description: "Arithmetic division.", category: "arithmetic", operandCount: 2, enabled: true, sortOrder: 4 },
  { id: "eme-op-mod", operatorCode: EME_FORMULA_OPERATOR_CODES.MODULO, symbol: "%", label: "Modulo", description: "Arithmetic modulo.", category: "arithmetic", operandCount: 2, enabled: true, sortOrder: 5 },
  { id: "eme-op-open", operatorCode: EME_FORMULA_OPERATOR_CODES.GROUP_OPEN, symbol: "(", label: "Open Group", description: "Grouping open parenthesis.", category: "grouping", operandCount: 0, enabled: true, sortOrder: 6 },
  { id: "eme-op-close", operatorCode: EME_FORMULA_OPERATOR_CODES.GROUP_CLOSE, symbol: ")", label: "Close Group", description: "Grouping close parenthesis.", category: "grouping", operandCount: 0, enabled: true, sortOrder: 7 },
  { id: "eme-op-eq", operatorCode: EME_FORMULA_OPERATOR_CODES.EQUALS, symbol: "==", label: "Equals", description: "Comparison equals.", category: "comparison", operandCount: 2, enabled: true, sortOrder: 8 },
  { id: "eme-op-neq", operatorCode: EME_FORMULA_OPERATOR_CODES.NOT_EQUALS, symbol: "!=", label: "Not Equals", description: "Comparison not equals.", category: "comparison", operandCount: 2, enabled: true, sortOrder: 9 },
  { id: "eme-op-gt", operatorCode: EME_FORMULA_OPERATOR_CODES.GREATER_THAN, symbol: ">", label: "Greater Than", description: "Comparison greater than.", category: "comparison", operandCount: 2, enabled: true, sortOrder: 10 },
  { id: "eme-op-lt", operatorCode: EME_FORMULA_OPERATOR_CODES.LESS_THAN, symbol: "<", label: "Less Than", description: "Comparison less than.", category: "comparison", operandCount: 2, enabled: true, sortOrder: 11 },
  { id: "eme-op-gte", operatorCode: EME_FORMULA_OPERATOR_CODES.GREATER_OR_EQUAL, symbol: ">=", label: "Greater Or Equal", description: "Comparison greater or equal.", category: "comparison", operandCount: 2, enabled: true, sortOrder: 12 },
  { id: "eme-op-lte", operatorCode: EME_FORMULA_OPERATOR_CODES.LESS_OR_EQUAL, symbol: "<=", label: "Less Or Equal", description: "Comparison less or equal.", category: "comparison", operandCount: 2, enabled: true, sortOrder: 13 },
  { id: "eme-op-and", operatorCode: EME_FORMULA_OPERATOR_CODES.AND, symbol: "&&", label: "And", description: "Logical and.", category: "logical", operandCount: 2, enabled: true, sortOrder: 14 },
  { id: "eme-op-or", operatorCode: EME_FORMULA_OPERATOR_CODES.OR, symbol: "||", label: "Or", description: "Logical or.", category: "logical", operandCount: 2, enabled: true, sortOrder: 15 },
  { id: "eme-op-not", operatorCode: EME_FORMULA_OPERATOR_CODES.NOT, symbol: "!", label: "Not", description: "Logical not.", category: "logical", operandCount: 1, enabled: true, sortOrder: 16 },
];
