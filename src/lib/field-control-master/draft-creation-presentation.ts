/**
 * Copy and locked outcome for registering an existing source as a draft.
 * This module does not create rows and does not read the inspection registry.
 */
import { ownershipReviewLabel } from "./governance-presentation";
import type { DraftSourceAllowlistEntry } from "./draft-source-allowlist";

export const DRAFT_CREATE_PATH = "/api/admin/field-control-definitions/drafts";

export const CREATE_FIELD_ACTION_LABEL = "Create field";

export const CREATE_FIELD_DIALOG_TITLE = "Create Field Definition";

export const CREATE_FIELD_SAFETY_COPY = "Creating a field definition does not change application behaviour.";

export const REGISTER_EXISTING_FIELD_LABEL = "Register Existing Field";

export const DESIGN_NEW_FIELD_LABEL = "Design New Field";

export const DESIGN_NEW_FIELD_NOTE =
  "Designing a new logical or application field is a later capability. It is not available in this version and does not register a binding.";

export const EXISTING_APPLICATION_FIELD_LABEL = "Existing application field";

export const EXISTING_DERIVED_CALCULATOR_LABEL = "Existing derived calculator";

export const SAVE_DRAFT_LABEL = "Save as draft";

export const DRAFT_SAVED_MESSAGE =
  "Draft saved. This definition does not change application behaviour. Refresh the page to see it in the registry.";

export const DRAFT_EMPTY_ALLOWLIST_MESSAGE = "No eligible source is open for draft registration.";

export const LOCKED_DRAFT_OUTCOME = [
  ["Lifecycle", "Draft"],
  ["Version", "Version 1"],
  ["Runtime control", "OFF"],
  ["Customer-facing activation", "OFF"],
  ["Applicability", "Not declared"],
  ["Ownership review", "Owner requires product decision"],
  ["Checker", "Not assigned"],
  ["Effective dates", "Not assigned"],
] as const;

export function draftOwnershipReviewLabel(): string {
  return ownershipReviewLabel("owner_requires_product_decision");
}

export function draftSourceBindingLabel(entry: DraftSourceAllowlistEntry): string {
  if (entry.sourceBinding.kind === "column") {
    return `${entry.sourceBinding.model}.${entry.sourceBinding.field}`;
  }
  return entry.sourceBinding.calculatorId;
}
