/**
 * Home Loan calculated facts, discovered from existing calculator modules.
 * Adding a derived output belongs in the calculator that produces it — not in Recommendation Masters.
 */

import type { GovernedDerivedFactDescriptor } from "./governed-derived-fact";
import { FOIR_GOVERNED_DERIVED_FACTS } from "./foir";
import { LTV_GOVERNED_DERIVED_FACTS } from "./rbi-ltv";
import { TENURE_GOVERNED_DERIVED_FACTS } from "./tenure";
import { BT_GOVERNED_DERIVED_FACTS } from "./bt-journey";

const HL = ["HOME_LOAN", "HOME_LOAN_BT"] as const;

/** Canonical derived output of programmeRoi in the Home Loan recommendation engine. */
const ENGINE_GOVERNED_DERIVED_FACTS: readonly GovernedDerivedFactDescriptor[] = [
  {
    id: "derived:applicableRoiPercent",
    label: "Applicable ROI",
    productCodes: HL,
    valueType: "percent",
    customerFactRef: "derived:applicableRoiPercent",
  },
];

export function listHomeLoanGovernedDerivedFacts(): readonly GovernedDerivedFactDescriptor[] {
  return [
    ...FOIR_GOVERNED_DERIVED_FACTS,
    ...LTV_GOVERNED_DERIVED_FACTS,
    ...TENURE_GOVERNED_DERIVED_FACTS,
    ...BT_GOVERNED_DERIVED_FACTS,
    ...ENGINE_GOVERNED_DERIVED_FACTS,
  ];
}
