/**
 * ECM foundation validation — smoke checks for SPR-001.
 */

import { ECM_CONTACT_ROLES, ECM_FRAMEWORK_VERSION } from "@/constants/enterprise-contact-master";
import { resetEcmComposition } from "./composition";
import {
  listEcmContacts,
  promptEcmMissingEmail,
  registerEcmContact,
  updateEcmContactEmails,
} from "./contact-registry";
import { getEcmFrameworkVersion, getEcmRegistrySnapshot } from "./registry-snapshot";
import { validateEcmContact } from "./validation-engine";

export function runEcmFoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetEcmComposition();

  const contact = registerEcmContact({
    name: "Ravi Kumar",
    mobilePrimary: "9876543210",
    primaryRole: ECM_CONTACT_ROLES.CUSTOMER,
    createdBy: "system",
  });

  const missingEmail = promptEcmMissingEmail(contact.id);
  const updated = updateEcmContactEmails(
    contact.id,
    { officialEmail: "ravi@example.com" },
    "system",
  );
  const afterEmail = promptEcmMissingEmail(contact.id);

  let rejectionChecks = 0;
  const invalid = validateEcmContact({ name: "", mobilePrimary: "", primaryRole: ECM_CONTACT_ROLES.CUSTOMER });
  if (!invalid.valid) rejectionChecks += 1;

  try {
    registerEcmContact({
      name: "",
      mobilePrimary: "111",
      primaryRole: ECM_CONTACT_ROLES.EMPLOYEE,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  const snap = getEcmRegistrySnapshot();
  const passed =
    getEcmFrameworkVersion() === ECM_FRAMEWORK_VERSION &&
    missingEmail.warning === true &&
    afterEmail.warning === false &&
    Boolean(updated.officialEmail) &&
    listEcmContacts().length === 1 &&
    snap.contacts.length === 1 &&
    snap.auditReferences.length >= 2 &&
    rejectionChecks >= 2;

  return {
    passed,
    details: {
      frameworkVersion: getEcmFrameworkVersion(),
      contactId: contact.id,
      missingEmailWarning: missingEmail.warning,
      contacts: snap.contacts.length,
      auditReferences: snap.auditReferences.length,
      rejectionChecks,
    },
  };
}
