/**
 * CO-LENDER-HIERARCHY-REMEDIATION-001
 * Assign / create lender employees into ECM for Hierarchy actions.
 * Never writes localStorage hierarchy.
 */

import {
  getEcmBankerProfile,
  getEcmContactAssignedRoles,
  setBankerReportingManager,
} from "@/lib/enterprise-contact-master";
import {
  persistRegisterEcmContact,
  persistUpdateEcmContact,
} from "@/lib/enterprise-persistence/ecm-persist";
import { findOperationalEcmContactById } from "@/lib/enterprise-registry";
import type { EcmContact } from "@/types/enterprise-contact-master";

export async function createLenderEmployeeForInstitution(input: {
  name: string;
  mobile: string;
  email?: string;
  designationId?: string;
  institutionId: string;
  institutionLabel: string;
  reportingManager: EcmContact | null;
  actorId: string;
}): Promise<EcmContact> {
  const name = input.name.trim();
  const mobile = input.mobile.trim();
  if (!name) throw new Error("Employee name is required.");
  if (!mobile) throw new Error("Mobile number is required.");
  if (!input.institutionId.trim()) throw new Error("Institution is required.");

  const created = await persistRegisterEcmContact({
    name,
    mobilePrimary: mobile,
    officialEmail: input.email?.trim() || undefined,
    roles: ["lender_employee"],
    primaryRole: "lender_employee",
    status: "active",
    createdBy: input.actorId,
    ownerId: input.actorId,
    roleProfiles: {
      lender_employee: {
        institution: input.institutionId.trim(),
        institutionLabel: input.institutionLabel.trim(),
        lenderName: input.institutionLabel.trim(),
        designation: input.designationId?.trim() || "",
        officialMobile: mobile,
        officialEmail: input.email?.trim() || "",
      },
    },
  });

  if (input.reportingManager) {
    return setBankerReportingManager({
      bankerContactId: created.id,
      manager: input.reportingManager,
      actorId: input.actorId,
    });
  }
  return created;
}

/**
 * Link an existing ECM contact as a lender employee at this institution.
 * Does not delete or recreate contacts — updates employment mapping only.
 */
export async function assignExistingContactToInstitution(input: {
  contactId: string;
  institutionId: string;
  institutionLabel: string;
  reportingManager: EcmContact | null;
  actorId: string;
}): Promise<EcmContact> {
  const existing = findOperationalEcmContactById(input.contactId);
  if (!existing) throw new Error(`Contact not found: ${input.contactId}`);

  const roles = new Set(getEcmContactAssignedRoles(existing));
  roles.add("lender_employee");
  const profile = { ...getEcmBankerProfile(existing) };
  profile.institution = input.institutionId.trim();
  profile.institutionLabel = input.institutionLabel.trim();
  profile.lenderName = input.institutionLabel.trim();

  const updated = await persistUpdateEcmContact(
    input.contactId,
    {
      roles: [...roles],
      primaryRole:
        existing.primaryRole === "customer" ? "lender_employee" : existing.primaryRole,
      roleProfiles: {
        ...existing.roleProfiles,
        lender_employee: profile,
      },
      enabled: existing.enabled !== false,
    },
    input.actorId,
  );

  if (input.reportingManager) {
    return setBankerReportingManager({
      bankerContactId: updated.id,
      manager: input.reportingManager,
      actorId: input.actorId,
    });
  }
  return updated;
}
