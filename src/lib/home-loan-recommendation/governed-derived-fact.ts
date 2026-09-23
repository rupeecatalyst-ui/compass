/**
 * Descriptor for a calculated Home Loan fact owned by an existing calculator.
 * Recommendation Masters discovers these. This is not a recommendation criterion catalog.
 */

export type GovernedDerivedFactValueType = "number" | "percent" | "currency" | "integer";

export type GovernedDerivedFactDescriptor = {
  id: string;
  label: string;
  productCodes: readonly string[];
  valueType: GovernedDerivedFactValueType;
  customerFactRef: string | null;
  notes?: string;
};
