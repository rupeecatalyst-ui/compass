/**
 * CO-MDM-001 — Enterprise Master Data Management constants.
 */

import type { ReferenceMasterDomainCode } from "@/constants/enterprise-master-data";
import { ROUTES } from "@/constants/routes";

/** Business-friendly labels for Reference Master domains. */
export const MDM_DOMAIN_LABELS: Partial<Record<ReferenceMasterDomainCode, string>> &
  Record<string, string> = {
  country: "Country",
  state: "State",
  city: "City",
  industry: "Industry",
  nature_of_business: "Nature of Business",
  constitution: "Constitution",
  employment_type: "Employment Type",
  occupation: "Occupation",
  loan_purpose: "Loan Purpose",
  property_type: "Property Type",
  occupancy: "Occupancy",
  department: "Department",
  designation: "Contact Designation",
  channel_type: "Channel Type",
  partner_category: "Channel Partner Category",
  resident_status: "Resident Status",
  risk_appetite: "Risk Appetite",
  investment_horizon: "Investment Horizon",
  specialization: "Specialization",
  business_source: "Business Source",
  customer_segment: "Customer Segment",
  relationship_type: "Relationship Type",
};

export type EnterpriseMdmModuleId =
  | "product_categories"
  | "product_groups"
  | "product_master"
  | "product_programs"
  | "lender_master"
  | "lender_branches"
  | "product_lender_matrix"
  | "business_source"
  | "customer_segment"
  | "occupation"
  | "industry"
  | "property_type"
  | "document_type"
  | "relationship_type"
  | "designation"
  | "partner_category"
  | "loan_purpose"
  | "lookup_masters";

export type EnterpriseMdmModule = {
  id: EnterpriseMdmModuleId;
  title: string;
  description: string;
  href: string;
  hierarchy?: string;
  status: "operational" | "partial";
};

/** Admin Console catalogue — every enterprise master in one place. */
export const ENTERPRISE_MDM_MODULES: EnterpriseMdmModule[] = [
  {
    id: "product_categories",
    title: "Product Categories",
    description: "Top of the Product hierarchy (e.g. Loan Products).",
    href: ROUTES.ADMIN_PRODUCT_CATEGORIES,
    hierarchy: "Category → Group → Product → Program",
    status: "operational",
  },
  {
    id: "product_groups",
    title: "Product Groups",
    description: "Groups within a Category (e.g. Secured Loans).",
    href: ROUTES.ADMIN_PRODUCT_CATEGORIES,
    hierarchy: "Category → Group → Product → Program",
    status: "operational",
  },
  {
    id: "product_master",
    title: "Product Master",
    description: "Enterprise products consumed by Opportunity and Deal.",
    href: ROUTES.ADMIN_PRODUCT_MASTER,
    hierarchy: "Category → Group → Product → Program",
    status: "operational",
  },
  {
    id: "product_programs",
    title: "Product Programs",
    description: "Lender-specific programs under a Product.",
    href: ROUTES.ADMIN_PRODUCT_PROGRAMS,
    hierarchy: "Product + Lender → Program",
    status: "operational",
  },
  {
    id: "lender_master",
    title: "Lender Master",
    description: "Banks, NBFCs, HFCs and related institutions.",
    href: ROUTES.ADMIN_LENDER_REGISTRY,
    status: "operational",
  },
  {
    id: "lender_branches",
    title: "Lender Branches",
    description: "Branch coverage labels maintained on each Lender (structured branch master later).",
    href: ROUTES.ADMIN_LENDER_REGISTRY,
    status: "partial",
  },
  {
    id: "product_lender_matrix",
    title: "Product–Lender Matrix",
    description: "Which Lenders support which Products.",
    href: ROUTES.ADMIN_PRODUCT_LENDER_MATRIX,
    status: "operational",
  },
  {
    id: "business_source",
    title: "Business Source Master",
    description: "Opportunity source vocabulary (Direct, Channel Partner, …).",
    href: `${ROUTES.ADMIN_REFERENCE_MASTERS}?domain=business_source`,
    status: "operational",
  },
  {
    id: "customer_segment",
    title: "Customer Segment Master",
    description: "Segments for Product eligibility (Business, MSME, Company, …).",
    href: `${ROUTES.ADMIN_REFERENCE_MASTERS}?domain=customer_segment`,
    status: "operational",
  },
  {
    id: "occupation",
    title: "Occupation Master",
    description: "Occupation lookup for Contacts and Credit.",
    href: `${ROUTES.ADMIN_REFERENCE_MASTERS}?domain=occupation`,
    status: "operational",
  },
  {
    id: "industry",
    title: "Industry Master",
    description: "Industry classification.",
    href: `${ROUTES.ADMIN_REFERENCE_MASTERS}?domain=industry`,
    status: "operational",
  },
  {
    id: "property_type",
    title: "Property Type Master",
    description: "Property types for secured lending.",
    href: `${ROUTES.ADMIN_REFERENCE_MASTERS}?domain=property_type`,
    status: "operational",
  },
  {
    id: "document_type",
    title: "Document Type Master",
    description: "Enterprise document types for Document Center.",
    href: ROUTES.ADMIN_DOCUMENT_TYPES,
    status: "operational",
  },
  {
    id: "relationship_type",
    title: "Relationship Type Master",
    description: "Contact and party relationship types.",
    href: `${ROUTES.ADMIN_REFERENCE_MASTERS}?domain=relationship_type`,
    status: "operational",
  },
  {
    id: "designation",
    title: "Contact Designation Master",
    description: "Designations for company representatives.",
    href: `${ROUTES.ADMIN_REFERENCE_MASTERS}?domain=designation`,
    status: "operational",
  },
  {
    id: "partner_category",
    title: "Channel Partner Category Master",
    description: "Partner category vocabulary.",
    href: `${ROUTES.ADMIN_REFERENCE_MASTERS}?domain=partner_category`,
    status: "operational",
  },
  {
    id: "loan_purpose",
    title: "Loan Purpose Master",
    description: "Loan purpose lookup.",
    href: `${ROUTES.ADMIN_REFERENCE_MASTERS}?domain=loan_purpose`,
    status: "operational",
  },
  {
    id: "lookup_masters",
    title: "All Lookup Masters",
    description: "Unified Reference Master desk for every lookup domain.",
    href: ROUTES.ADMIN_REFERENCE_MASTERS,
    status: "operational",
  },
];

/** Super Admin + Admin write; Managers read-only by default. */
export function canWriteEnterpriseMdm(role: string | null | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canReadEnterpriseMdm(role: string | null | undefined): boolean {
  return Boolean(role);
}
