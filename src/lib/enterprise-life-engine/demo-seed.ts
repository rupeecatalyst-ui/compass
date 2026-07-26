/**
 * Shared LIFE demo seed — executor contacts linked to Published Enterprise Lenders.
 * Institution identity always resolves through Enterprise Lender Registry.
 */

import { LIFE_ACTIVE_STATUS, LIFE_CONTACT_ROLES } from "@/constants/enterprise-life-engine";
import { runDemoSeedIfEnabledWithResult } from "@/lib/demo-seed";
import { ensureLenderMasterBootstrapped } from "@/lib/enterprise-lender-registry/bootstrap-master";
import { findPublishedLenderByDisplayName } from "@/lib/enterprise-lender-registry/published-directory";
import {
  getLifeRegistrySnapshot,
} from "./registry-snapshot";
import {
  registerLifeLenderContact,
  registerLifeRecommendationHint,
} from "./contact-registry";

function publishedRef(displayName: string, fallbackSlug: string): { lenderRef: string; lenderName: string } {
  const hit = findPublishedLenderByDisplayName(displayName);
  if (hit) return { lenderRef: `lender:${hit.id}`, lenderName: hit.displayName };
  return { lenderRef: `lender:${fallbackSlug}`, lenderName: displayName };
}

export function seedLifeContactsIfEmpty(): number {
  return runDemoSeedIfEnabledWithResult(() => {
    if (typeof window !== "undefined") {
      ensureLenderMasterBootstrapped();
    }
    if (getLifeRegistrySnapshot().contacts.length > 0) {
      return getLifeRegistrySnapshot().contacts.length;
    }

    const hdfcId = publishedRef("HDFC Bank", "hdfc");
    const hdfc = registerLifeLenderContact({
    contactCode: "LIFE-HDFC-EXE-001",
    contactName: "Rahul Shah",
    mobile: "9876500001",
    email: "rahul.shah@hdfc.demo",
    lenderRef: hdfcId.lenderRef,
    lenderName: hdfcId.lenderName,
    branchRef: "branch:hdfc-andheri",
    branchName: "Andheri",
    city: "Mumbai",
    productRefs: ["product:home-loan", "product:lap"],
    businessMappingRefs: ["mapping:west", "mapping:metro"],
    roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR, LIFE_CONTACT_ROLES.RELATIONSHIP_MANAGER],
    lenderExecutor: true,
    activeStatus: LIFE_ACTIVE_STATUS.ACTIVE,
    reportingManagerRef: "employee:mgr-hdfc-01",
    reportingManagerName: "Anil Mehta",
    reportingHierarchy: ["Rahul Shah", "Anil Mehta", "West Zonal Head"],
    createdBy: "demo-seed",
  });
  registerLifeRecommendationHint({
    contactId: hdfc.id,
    relationshipType: "tat",
    weight: 20,
    rationale: "Best TAT",
    enabled: true,
  });

  const iciciId = publishedRef("ICICI Bank", "icici");
  const icici = registerLifeLenderContact({
    contactCode: "LIFE-ICICI-EXE-001",
    contactName: "Neha Gupta",
    mobile: "9876500002",
    email: "neha.gupta@icici.demo",
    lenderRef: iciciId.lenderRef,
    lenderName: iciciId.lenderName,
    branchRef: "branch:icici-andheri",
    branchName: "Andheri",
    city: "Mumbai",
    productRefs: ["product:home-loan", "product:lap"],
    businessMappingRefs: ["mapping:west", "mapping:metro"],
    roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR],
    lenderExecutor: true,
    activeStatus: LIFE_ACTIVE_STATUS.ACTIVE,
    reportingManagerRef: "employee:mgr-icici-01",
    reportingManagerName: "Sneha Kapoor",
    reportingHierarchy: ["Neha Gupta", "Sneha Kapoor", "Regional Credit Head"],
    createdBy: "demo-seed",
  });
  registerLifeRecommendationHint({
    contactId: icici.id,
    relationshipType: "approval",
    weight: 15,
    rationale: "Highest Approval Rate",
    enabled: true,
  });

  const axisId = publishedRef("Axis Bank", "axis");
  const axis = registerLifeLenderContact({
    contactCode: "LIFE-AXIS-EXE-001",
    contactName: "Amit Jain",
    mobile: "9876500004",
    email: "amit.jain@axis.demo",
    lenderRef: axisId.lenderRef,
    lenderName: axisId.lenderName,
    branchRef: "branch:axis-andheri",
    branchName: "Andheri",
    city: "Mumbai",
    productRefs: ["product:home-loan"],
    businessMappingRefs: ["mapping:west", "mapping:metro"],
    roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR, LIFE_CONTACT_ROLES.RELATIONSHIP_MANAGER],
    lenderExecutor: true,
    activeStatus: LIFE_ACTIVE_STATUS.ACTIVE,
    reportingManagerRef: "employee:mgr-axis-01",
    reportingManagerName: "Kavita Nair",
    reportingHierarchy: ["Amit Jain", "Kavita Nair"],
    createdBy: "demo-seed",
  });
  registerLifeRecommendationHint({
    contactId: axis.id,
    relationshipType: "relationship",
    weight: 12,
    rationale: "Existing Relationship",
    enabled: true,
  });

  // Pune coverage — matches many demo loan files
  registerLifeLenderContact({
    contactCode: "LIFE-HDFC-EXE-PUN-001",
    contactName: "Priya Sharma",
    mobile: "9876500011",
    email: "priya.sharma@hdfc.demo",
    lenderRef: hdfcId.lenderRef,
    lenderName: hdfcId.lenderName,
    branchRef: "branch:hdfc-pune",
    branchName: "Pune Camp",
    city: "Pune",
    productRefs: ["product:home-loan"],
    businessMappingRefs: ["mapping:west", "mapping:metro"],
    roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR, LIFE_CONTACT_ROLES.RELATIONSHIP_MANAGER],
    lenderExecutor: true,
    activeStatus: LIFE_ACTIVE_STATUS.ACTIVE,
    reportingManagerRef: "employee:mgr-hdfc-01",
    reportingManagerName: "Anil Mehta",
    reportingHierarchy: ["Priya Sharma", "Anil Mehta", "West Zonal Head"],
    createdBy: "demo-seed",
  });

  registerLifeLenderContact({
    contactCode: "LIFE-ICICI-EXE-PUN-001",
    contactName: "Rahul Verma",
    mobile: "9876500012",
    email: "rahul.verma@icici.demo",
    lenderRef: iciciId.lenderRef,
    lenderName: iciciId.lenderName,
    branchRef: "branch:icici-pune",
    branchName: "Baner",
    city: "Pune",
    productRefs: ["product:home-loan", "product:lap"],
    businessMappingRefs: ["mapping:west", "mapping:metro"],
    roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR],
    lenderExecutor: true,
    activeStatus: LIFE_ACTIVE_STATUS.ACTIVE,
    reportingManagerRef: "employee:mgr-icici-01",
    reportingManagerName: "Sneha Kapoor",
    reportingHierarchy: ["Rahul Verma", "Sneha Kapoor", "Regional Credit Head"],
    createdBy: "demo-seed",
  });

  // Credit contact without executor — must not appear in recommendations
  registerLifeLenderContact({
    contactCode: "LIFE-HDFC-CR-001",
    contactName: "Amit Credit Desk",
    mobile: "9876500099",
    email: "credit.desk@hdfc.demo",
    lenderRef: "lender:hdfc",
    lenderName: "HDFC Bank",
    branchRef: "branch:hdfc-andheri",
    branchName: "Andheri",
    city: "Mumbai",
    productRefs: ["product:home-loan"],
    businessMappingRefs: ["mapping:west", "mapping:metro"],
    roles: [LIFE_CONTACT_ROLES.CREDIT],
    lenderExecutor: false,
    activeStatus: LIFE_ACTIVE_STATUS.ACTIVE,
    reportingHierarchy: ["Amit Credit Desk", "Credit Manager"],
    createdBy: "demo-seed",
  });

    return getLifeRegistrySnapshot().contacts.length;
  }, getLifeRegistrySnapshot().contacts.length);
}
