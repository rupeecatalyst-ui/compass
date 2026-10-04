import type { FieldControlDefinition, FieldControlLifecycleStatus } from "@/types/field-control-master";

const PUBLISHED: ReadonlySet<FieldControlLifecycleStatus> = new Set([
  "approved",
  "active",
  "superseded",
  "inactive",
]);

export function isPublishedFieldDefinition(definition: FieldControlDefinition): boolean {
  return PUBLISHED.has(definition.lifecycleStatus);
}

export function assertDistinctMakerChecker(makerUserId: string, checkerUserId: string): void {
  const maker = makerUserId.trim();
  const checker = checkerUserId.trim();
  if (!maker || !checker || maker === checker) {
    throw new Error("FIELD_CONTROL_MASTER: maker and checker must be different people.");
  }
}

/**
 * Option-key removal would make a previously stored choice unreadable.
 * Adding a key is allowed on the next version. Removal is not.
 */
export function assertOptionKeysNotRemoved(previousKeys: readonly string[], nextKeys: readonly string[]): void {
  const next = new Set(nextKeys);
  for (const key of previousKeys) {
    if (!next.has(key)) {
      throw new Error(`FIELD_CONTROL_MASTER: option key "${key}" cannot be removed from a published definition.`);
    }
  }
}

export function assertTypeAndOwnerUnchanged(
  previous: Pick<FieldControlDefinition, "fieldType" | "owningDomain">,
  next: Pick<FieldControlDefinition, "fieldType" | "owningDomain">,
): void {
  if (previous.fieldType !== next.fieldType) {
    throw new Error("FIELD_CONTROL_MASTER: field type is immutable after the identity is published.");
  }
  if (previous.owningDomain !== next.owningDomain) {
    throw new Error("FIELD_CONTROL_MASTER: owning domain is immutable after the identity is published.");
  }
}

/**
 * Returns the next version. Does not mutate the current definition.
 * Type and owning domain cannot change. Published rows are not edited in place.
 */
export function nextFieldDefinitionVersion(
  current: FieldControlDefinition,
  patch: Partial<
    Pick<
      FieldControlDefinition,
      | "friendlyLabel"
      | "description"
      | "helpText"
      | "lifecycleStatus"
      | "validationSummary"
      | "presentationSummary"
      | "currencyUnits"
      | "aliases"
      | "selectOptionKeys"
    >
  >,
): FieldControlDefinition {
  if (isPublishedFieldDefinition(current)) {
    throw new Error(
      "FIELD_CONTROL_MASTER: a published definition version is immutable. Create the next version from a draft copy.",
    );
  }
  assertTypeAndOwnerUnchanged(current, current);
  assertOptionKeysNotRemoved(current.selectOptionKeys, patch.selectOptionKeys ?? current.selectOptionKeys);
  return {
    ...current,
    friendlyLabel: patch.friendlyLabel ?? current.friendlyLabel,
    description: patch.description ?? current.description,
    helpText: patch.helpText ?? current.helpText,
    lifecycleStatus: patch.lifecycleStatus ?? current.lifecycleStatus,
    validationSummary: patch.validationSummary ?? current.validationSummary,
    presentationSummary: patch.presentationSummary ?? current.presentationSummary,
    currencyUnits: patch.currencyUnits ?? current.currencyUnits,
    aliases: patch.aliases ? [...patch.aliases] : [...current.aliases],
    selectOptionKeys: patch.selectOptionKeys ? [...patch.selectOptionKeys] : [...current.selectOptionKeys],
    versionNumber: current.versionNumber + 1,
    controlsRuntime: false,
    customerFacingActivation: false,
  };
}

/**
 * Deactivation stops future governed use of the definition.
 * The previous version object is left unchanged so historical interpretation remains.
 */
export function deactivateFieldDefinition(current: FieldControlDefinition): {
  previous: FieldControlDefinition;
  next: FieldControlDefinition;
} {
  const previous: FieldControlDefinition = {
    ...current,
    aliases: [...current.aliases],
    selectOptionKeys: [...current.selectOptionKeys],
    currencyUnits: [...current.currencyUnits],
    productApplicability: [...current.productApplicability],
    customerCategoryApplicability: [...current.customerCategoryApplicability],
    authorisedConsumers: [...current.authorisedConsumers],
  };
  const next = nextFieldDefinitionVersion(
    current.lifecycleStatus === "draft" || current.lifecycleStatus === "checker_review"
      ? current
      : { ...current, lifecycleStatus: "draft" },
    { lifecycleStatus: "inactive" },
  );
  return { previous, next };
}
