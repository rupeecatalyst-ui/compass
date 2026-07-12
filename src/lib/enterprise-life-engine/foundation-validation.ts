/**
 * LIFE foundation validation — smoke checks for SPR-001.
 */

import { LIFE_ACTIVE_STATUS, LIFE_CONTACT_ROLES, LIFE_FRAMEWORK_VERSION } from "@/constants/enterprise-life-engine";
import {
  listLifeLenderExecutors,
  registerLifeLenderContact,
  registerLifeRecommendationHint,
} from "./contact-registry";
import { resetLifeComposition } from "./composition";
import { getLifeFrameworkVersion, getLifeRegistrySnapshot } from "./registry-snapshot";
import {
  resolveLifeLenderSelection,
  selectLifeLenderExecutors,
  validateLifeLenderContact,
} from "./validation-engine";

export function runLifeFoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetLifeComposition();

  const contact = registerLifeLenderContact({
    contactCode: "LIFE-LE-001",
    contactName: "Anita Sharma",
    lenderRef: "lender:hdfc",
    lenderName: "HDFC Bank",
    city: "Mumbai",
    productRefs: ["product:home-loan"],
    businessMappingRefs: ["mapping:metro"],
    roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR],
    lenderExecutor: true,
    activeStatus: LIFE_ACTIVE_STATUS.ACTIVE,
    reportingHierarchy: ["mgr-001"],
    reportingManagerRef: "mgr-001",
    reportingManagerName: "Manager",
    createdBy: "system",
  });

  registerLifeRecommendationHint({
    contactId: contact.id,
    relationshipType: "preferred",
    weight: 10,
    rationale: "Strong conversion history",
    enabled: true,
  });

  const selected = selectLifeLenderExecutors({
    productRef: "product:home-loan",
    city: "Mumbai",
    businessMappingRef: "mapping:metro",
  });

  const resolved = resolveLifeLenderSelection(contact.id);
  const executors = listLifeLenderExecutors();

  let rejectionChecks = 0;
  const invalid = validateLifeLenderContact({
    ...contact,
    contactName: "",
    city: "",
    productRefs: [],
  });
  if (!invalid.valid) rejectionChecks += 1;

  try {
    registerLifeLenderContact({
      contactCode: "LIFE-BAD",
      contactName: "",
      lenderRef: "",
      lenderName: "",
      city: "",
      productRefs: [],
      businessMappingRefs: [],
      roles: [LIFE_CONTACT_ROLES.CREDIT],
      lenderExecutor: false,
      activeStatus: LIFE_ACTIVE_STATUS.ACTIVE,
      reportingHierarchy: [],
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  const snap = getLifeRegistrySnapshot();
  const passed =
    getLifeFrameworkVersion() === LIFE_FRAMEWORK_VERSION &&
    selected.length >= 1 &&
    resolved?.contact.id === contact.id &&
    executors.length >= 1 &&
    snap.contacts.length === 1 &&
    snap.recommendationHints.length === 1 &&
    snap.auditReferences.length >= 1 &&
    rejectionChecks >= 2;

  return {
    passed,
    details: {
      frameworkVersion: getLifeFrameworkVersion(),
      selectedCount: selected.length,
      executors: executors.length,
      contacts: snap.contacts.length,
      auditReferences: snap.auditReferences.length,
      rejectionChecks,
    },
  };
}
