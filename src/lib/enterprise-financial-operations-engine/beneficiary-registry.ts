/**
 * EFOE beneficiary registry.
 */

import type { EfoeBeneficiary } from "@/types/enterprise-financial-operations-engine";
import { recordEfoeAudit } from "./audit-integration";
import { getEfoePorts } from "./composition";

export function registerEfoeBeneficiary(
  input: Omit<EfoeBeneficiary, "id" | "createdOn">,
): EfoeBeneficiary {
  const duplicate = getEfoePorts().beneficiaries.findByCode(input.beneficiaryCode);
  if (duplicate) throw new Error(`EFOE: beneficiary code "${input.beneficiaryCode}" already exists.`);

  const beneficiary: EfoeBeneficiary = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEfoePorts().beneficiaries.save(beneficiary);
  recordEfoeAudit({
    entityId: beneficiary.id,
    entityType: "beneficiary",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered beneficiary ${beneficiary.beneficiaryCode}`,
  });

  return beneficiary;
}

export function listEfoeBeneficiaries(): EfoeBeneficiary[] {
  return getEfoePorts().beneficiaries.list();
}
