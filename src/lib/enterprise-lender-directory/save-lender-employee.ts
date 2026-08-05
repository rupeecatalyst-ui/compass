/**
 * CO-ARCH-ELD-EMP — Persist Lender Employee employment + contact updates to ECM SSOT.
 * Institution transfer updates current employment mapping only — never mutates Deal/Opportunity history.
 */

import {
  getEcmBankerProfile,
  getEcmContactAssignedRoles,
  recordEcmAudit,
  serializeBankerProductsHandled,
  setBankerReportingManager,
  parseBankerProductsHandled,
} from "@/lib/enterprise-contact-master";
import { normalizeEnterpriseRegionId } from "@/constants/enterprise-region-master";
import { persistUpdateEcmContact } from "@/lib/enterprise-persistence/ecm-persist";
import {
  findOperationalEcmContactById,
} from "@/lib/enterprise-registry";
import type { EcmContact, EcmContactStatus } from "@/types/enterprise-contact-master";
import type { EldLenderEmployeeStatus } from "@/types/enterprise-lender-directory-ops";

export type EldLenderEmployeeSaveInput = {
  contactId: string;
  actorId: string;
  institutionId: string;
  institutionLabel: string;
  branchId: string;
  cityId: string;
  regionId: string;
  designationId: string;
  /** Product Master codes */
  productCodes: string[];
  mobile: string;
  officialEmail: string;
  status: EldLenderEmployeeStatus;
  reportingManager: EcmContact | null;
  /** When true, clear reporting manager even if null */
  reportingManagerTouched: boolean;
};

function norm(v?: string | null): string {
  return (v ?? "").trim();
}

function displayOrEmpty(v?: string | null): string {
  return norm(v) || "(empty)";
}

function mapStatusToEcm(status: EldLenderEmployeeStatus): {
  status?: EcmContactStatus;
  enabled: boolean;
} {
  if (status === "inactive") return { enabled: false };
  if (status === "provisional") return { status: "provisional", enabled: true };
  return { status: "active", enabled: true };
}

function auditField(
  contactId: string,
  actorId: string,
  field: string,
  previousValue: string,
  newValue: string,
): void {
  if (previousValue === newValue) return;
  recordEcmAudit({
    entityId: contactId,
    entityType: "contact",
    action: "modified",
    actorId,
    field,
    previousValue,
    newValue,
  });
}

/**
 * Save employment + contact fields for a lender employee.
 * Does not touch historical Deal / Opportunity ownership.
 */
export async function saveEldLenderEmployeeEmployment(
  input: EldLenderEmployeeSaveInput,
): Promise<EcmContact> {
  const existing =
    findOperationalEcmContactById(input.contactId) ??
    null;
  if (!existing) {
    throw new Error(`Lender employee contact not found: ${input.contactId}`);
  }
  if (!getEcmContactAssignedRoles(existing).includes("lender_employee")) {
    throw new Error("Contact is not a Lender Contact (lender_employee).");
  }

  const profile = { ...getEcmBankerProfile(existing) };
  const prevInstitution = norm(profile.institution);
  const prevInstitutionLabel = norm(profile.institutionLabel) || norm(profile.lenderName);
  const prevBranch = norm(profile.branch);
  const prevCity = norm(profile.city);
  const prevRegion = norm(profile.region);
  const prevDesignation = norm(profile.designation);
  const prevProducts = serializeBankerProductsHandled(
    parseBankerProductsHandled(profile.productsHandled),
  );
  const prevMobile = norm(profile.officialMobile) || norm(existing.mobilePrimary);
  const prevEmail =
    norm(profile.officialEmail) ||
    norm(existing.officialEmail) ||
    norm(existing.personalEmail);
  const prevManagerId = norm(profile.reportingManagerContactId);
  const prevManagerName = norm(profile.reportingManagerName);
  const prevEnabled = existing.enabled !== false;
  const prevStatusLabel =
    existing.status === "archived" || !prevEnabled
      ? "inactive"
      : existing.status === "provisional"
        ? "provisional"
        : "active";

  const nextInstitution = norm(input.institutionId);
  const nextInstitutionLabel = norm(input.institutionLabel);
  const nextBranch = norm(input.branchId);
  const nextCity = norm(input.cityId);
  const nextRegion =
    normalizeEnterpriseRegionId(input.regionId) || norm(input.regionId);
  const nextDesignation = norm(input.designationId);
  const nextProducts = serializeBankerProductsHandled(input.productCodes);
  const nextMobile = norm(input.mobile);
  const nextEmail = norm(input.officialEmail);
  const statusMap = mapStatusToEcm(input.status);

  if (!nextInstitution) {
    throw new Error("Institution (Lender) is required.");
  }
  if (!nextMobile) {
    throw new Error("Mobile Number is required.");
  }

  profile.institution = nextInstitution;
  if (nextInstitutionLabel) {
    profile.institutionLabel = nextInstitutionLabel;
    profile.lenderName = nextInstitutionLabel;
  }
  profile.branch = nextBranch;
  profile.city = nextCity;
  profile.region = nextRegion;
  profile.designation = nextDesignation;
  profile.productsHandled = nextProducts;
  profile.officialMobile = nextMobile;
  profile.officialEmail = nextEmail;

  const patch: Record<string, unknown> = {
    mobilePrimary: nextMobile,
    officialEmail: nextEmail || undefined,
    city: nextCity || existing.city,
    enabled: statusMap.enabled,
    roleProfiles: {
      ...existing.roleProfiles,
      lender_employee: profile,
    },
  };
  if (statusMap.status) {
    patch.status = statusMap.status;
  }

  const updated = await persistUpdateEcmContact(
    input.contactId,
    patch,
    input.actorId,
  );

  // Reporting manager — relationship SSOT (independent of institution transfer).
  let afterManager = updated;
  if (input.reportingManagerTouched) {
    afterManager = await setBankerReportingManager({
      bankerContactId: input.contactId,
      manager: input.reportingManager,
      actorId: input.actorId,
    });
  }

  // Field-level Enterprise Audit Log (Changed By / On / Previous / New).
  auditField(
    input.contactId,
    input.actorId,
    "Institution",
    displayOrEmpty(prevInstitutionLabel || prevInstitution),
    displayOrEmpty(nextInstitutionLabel || nextInstitution),
  );
  auditField(
    input.contactId,
    input.actorId,
    "Branch",
    displayOrEmpty(prevBranch),
    displayOrEmpty(nextBranch),
  );
  auditField(
    input.contactId,
    input.actorId,
    "City",
    displayOrEmpty(prevCity),
    displayOrEmpty(nextCity),
  );
  auditField(
    input.contactId,
    input.actorId,
    "Region",
    displayOrEmpty(prevRegion),
    displayOrEmpty(nextRegion),
  );
  auditField(
    input.contactId,
    input.actorId,
    "Designation",
    displayOrEmpty(prevDesignation),
    displayOrEmpty(nextDesignation),
  );
  auditField(
    input.contactId,
    input.actorId,
    "Products Handled",
    displayOrEmpty(prevProducts),
    displayOrEmpty(nextProducts),
  );
  auditField(
    input.contactId,
    input.actorId,
    "Mobile Number",
    displayOrEmpty(prevMobile),
    displayOrEmpty(nextMobile),
  );
  auditField(
    input.contactId,
    input.actorId,
    "Official Email",
    displayOrEmpty(prevEmail),
    displayOrEmpty(nextEmail),
  );
  auditField(
    input.contactId,
    input.actorId,
    "Employee Status",
    prevStatusLabel,
    input.status,
  );
  if (input.reportingManagerTouched) {
    const nextManagerId = input.reportingManager?.id ?? "";
    const nextManagerName = input.reportingManager?.name ?? "";
    auditField(
      input.contactId,
      input.actorId,
      "Reporting Manager",
      displayOrEmpty(prevManagerName || prevManagerId),
      displayOrEmpty(nextManagerName || nextManagerId),
    );
  }

  return afterManager;
}
