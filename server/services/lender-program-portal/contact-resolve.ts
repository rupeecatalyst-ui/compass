/**
 * CO-LEND-001B — Resolve or create Lender Representative Contact (no duplicates).
 * Matching priority: Official Email → Official Mobile.
 */
import { computeEcmContactScore } from "@/lib/enterprise-contact-master/contact-score";
import { normalizePersonName } from "@/lib/enterprise-contact-master/name-normalize";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type { LenderProgramVerifier } from "@/types/lender-program-portal";
import { ecmContactRepository } from "@server/repositories/ecm/contact.repository";

export const LENDER_REPRESENTATIVE_CONTACT_TYPE = "Lender Representative";

export async function resolveOrCreateLenderRepresentativeContact(input: {
  organizationId: string;
  lenderId: string;
  lenderName: string;
  verifier: LenderProgramVerifier;
}): Promise<{ contact: EcmContact; created: boolean }> {
  const email = input.verifier.officialEmail.trim();
  const mobile = input.verifier.officialMobile.trim();
  const name = normalizePersonName(input.verifier.employeeName.trim());

  if (!name || !email || !mobile) {
    throw Object.assign(
      new Error("Full Name, Official Email and Official Mobile are required."),
      { statusCode: 400, code: "VERIFIER_REQUIRED" },
    );
  }

  let contact =
    (await ecmContactRepository.findByOfficialEmail(input.organizationId, email)) ||
    (await ecmContactRepository.findByMobile(input.organizationId, mobile));

  if (contact) {
    const roles = new Set(contact.roles?.length ? contact.roles : [contact.primaryRole]);
    roles.add("lender_employee");
    const profile = {
      ...(contact.roleProfiles?.lender_employee ?? {}),
      institution: input.lenderId,
      designation: input.verifier.designation || contact.roleProfiles?.lender_employee?.designation || "",
      branch: input.verifier.branch || contact.roleProfiles?.lender_employee?.branch || "",
      region: input.verifier.region || contact.roleProfiles?.lender_employee?.region || "",
      officialEmail: email,
      officialMobile: mobile,
      portalContactType: LENDER_REPRESENTATIVE_CONTACT_TYPE,
      employeeId: input.verifier.employeeId || contact.roleProfiles?.lender_employee?.employeeId || "",
    };
    const updated = await ecmContactRepository.update(contact.id, {
      officialEmail: contact.officialEmail || email,
      name: contact.name || name,
      roles: [...roles],
      primaryRole: contact.primaryRole === "customer" ? "lender_employee" : contact.primaryRole,
      additionalRoles: [...roles].slice(1),
      roleProfiles: {
        ...(contact.roleProfiles ?? {}),
        lender_employee: profile,
      },
      modifiedBy: "lender-program-portal",
    });
    return { contact: updated ?? contact, created: false };
  }

  const roles = ["lender_employee" as const];
  const roleProfiles = {
    lender_employee: {
      institution: input.lenderId,
      designation: input.verifier.designation || "",
      branch: input.verifier.branch || "",
      region: input.verifier.region || "",
      officialEmail: email,
      officialMobile: mobile,
      portalContactType: LENDER_REPRESENTATIVE_CONTACT_TYPE,
      employeeId: input.verifier.employeeId || "",
      lenderName: input.lenderName,
    },
  };
  const score = computeEcmContactScore({
    personalEmail: undefined,
    officialEmail: email,
    mobileSecondary: undefined,
    roles,
    primaryRole: "lender_employee",
    additionalRoles: [],
    status: "provisional",
  });

  const created = await ecmContactRepository.create({
    organizationId: input.organizationId,
    name,
    mobilePrimary: mobile,
    officialEmail: email,
    roles,
    primaryRole: "lender_employee",
    additionalRoles: [],
    roleProfiles,
    status: "provisional",
    contactScore: score,
    strategicContact: false,
    createdBy: "lender-program-portal",
    modifiedBy: "lender-program-portal",
  });

  return { contact: created, created: true };
}
