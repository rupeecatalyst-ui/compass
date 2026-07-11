/**
 * EC360 household registry.
 */

import type { Ec360Household } from "@/types/enterprise-customer-360-engine";
import { recordEc360Audit } from "./audit-integration";
import { getEc360Ports } from "./composition";
import { validateEc360Household } from "./validation-engine";

export function registerEc360Household(
  input: Omit<Ec360Household, "id" | "createdOn" | "modifiedOn" | "modifiedBy">,
): Ec360Household {
  const now = new Date().toISOString();
  const household: Ec360Household = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: now,
    modifiedOn: now,
    modifiedBy: input.createdBy,
  };

  const validation = validateEc360Household(household);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEc360Ports().households.save(household);
  recordEc360Audit({
    entityId: household.id,
    entityType: "household",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered household ${household.householdCode}`,
  });

  return household;
}

export function addEc360CustomerToHousehold(input: {
  customerId: string;
  householdId: string;
  modifiedBy: string;
}): void {
  const customer = getEc360Ports().customers.findById(input.customerId);
  if (!customer) throw new Error(`EC360: customer "${input.customerId}" not found.`);

  const household = getEc360Ports().households.findById(input.householdId);
  if (!household) throw new Error(`EC360: household "${input.householdId}" not found.`);

  const updated = {
    ...customer,
    householdId: input.householdId,
    modifiedBy: input.modifiedBy,
    modifiedOn: new Date().toISOString(),
  };

  const validation = validateEc360Household(household);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEc360Ports().customers.save(updated);

  if (!household.headCustomerId) {
    getEc360Ports().households.save({
      ...household,
      headCustomerId: input.customerId,
      modifiedBy: input.modifiedBy,
      modifiedOn: new Date().toISOString(),
    });
  }
}

export function listEc360Households(): Ec360Household[] {
  return getEc360Ports().households.list();
}

export function listEc360HouseholdMembers(householdId: string) {
  return getEc360Ports().customers.listByHousehold(householdId);
}
