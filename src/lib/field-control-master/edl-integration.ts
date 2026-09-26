/**
 * Builds an Enterprise Decision Ledger input for a future field-definition publication.
 * Foundation V1 does not record the entry and does not call the ledger writer.
 */

import { EDL_CHANGE_CATEGORIES } from "@/constants/enterprise-decision-ledger";
import type { CreateEdlEntryInput } from "@/types/enterprise-decision-ledger";
import type { FieldControlDefinition } from "@/types/field-control-master";
import { assertDistinctMakerChecker } from "./guards";

export function buildFieldDefinitionLedgerInput(input: {
  definition: FieldControlDefinition;
  makerUserId: string;
  checkerUserId: string;
  businessJustification: string;
  effectiveFrom: string;
  changeType?: CreateEdlEntryInput["changeType"];
  previousValue?: unknown;
}): CreateEdlEntryInput {
  assertDistinctMakerChecker(input.makerUserId, input.checkerUserId);
  return {
    requestedBy: input.makerUserId.trim(),
    approvedBy: input.checkerUserId.trim(),
    previousValue: input.previousValue ?? null,
    newValue: {
      fieldId: input.definition.fieldId,
      versionNumber: input.definition.versionNumber,
      fieldType: input.definition.fieldType,
      owningDomain: input.definition.owningDomain,
      lifecycleStatus: input.definition.lifecycleStatus,
    },
    businessJustification: input.businessJustification,
    effectiveFrom: input.effectiveFrom,
    effectiveUntil: null,
    versionNumber: String(input.definition.versionNumber),
    impactScope: "transaction_future_only",
    changeType: input.changeType ?? "versioned",
    changeCategory: EDL_CHANGE_CATEGORIES.FIELD_DEFINITION,
    relatedEngine: "field_control_master",
    relatedEntityType: "field_definition",
    relatedEntityId: input.definition.fieldId,
    relatedEntityLabel: input.definition.friendlyLabel,
    notImpactedNote:
      "Historical values stay in their current domain records. This foundation entry does not change runtime capture.",
  };
}
