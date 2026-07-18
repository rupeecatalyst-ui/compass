/**
 * EDIE Certified Document Catalog — reusable document definitions.
 */

import type { EdieCatalogDocument, EdieDocumentModuleId } from "@/types/edie-certified-rules";

export const EDIE_MODULE_LABELS: Record<EdieDocumentModuleId, string> = {
  customer_kyc: "Customer KYC",
  address_proof: "Address Proof",
  business_constitution: "Business Constitution",
  financial: "Financial Documents",
  banking: "Banking",
  property: "Property Documents",
  existing_loan: "Existing Loan",
};

export const EDIE_CATALOG: Record<string, EdieCatalogDocument> = {
  // A. Customer KYC
  "doc:pan": {
    typeRef: "doc:pan",
    label: "PAN Card",
    moduleId: "customer_kyc",
    defaultSeverity: "mandatory",
    weight: 15,
  },
  "doc:aadhaar": {
    typeRef: "doc:aadhaar",
    label: "Aadhaar Card",
    moduleId: "customer_kyc",
    defaultSeverity: "mandatory",
    weight: 12,
  },
  "doc:passport": {
    typeRef: "doc:passport",
    label: "Passport",
    moduleId: "customer_kyc",
    defaultSeverity: "required",
    optional: true,
    weight: 4,
  },
  "doc:driving-licence": {
    typeRef: "doc:driving-licence",
    label: "Driving Licence",
    moduleId: "customer_kyc",
    defaultSeverity: "required",
    optional: true,
    weight: 3,
  },
  "doc:voter-id": {
    typeRef: "doc:voter-id",
    label: "Voter ID",
    moduleId: "customer_kyc",
    defaultSeverity: "required",
    optional: true,
    weight: 3,
  },
  "doc:photograph": {
    typeRef: "doc:photograph",
    label: "Photograph",
    moduleId: "customer_kyc",
    defaultSeverity: "required",
    optional: true,
    weight: 2,
  },
  "doc:signature": {
    typeRef: "doc:signature",
    label: "Signature",
    moduleId: "customer_kyc",
    defaultSeverity: "required",
    optional: true,
    weight: 2,
  },

  // B. Address Proof (choice — one of)
  "doc:address-electricity": {
    typeRef: "doc:address-electricity",
    label: "Electricity Bill",
    moduleId: "address_proof",
    defaultSeverity: "mandatory",
    weight: 10,
  },
  "doc:address-gas": {
    typeRef: "doc:address-gas",
    label: "Gas Bill",
    moduleId: "address_proof",
    defaultSeverity: "mandatory",
    weight: 10,
  },
  "doc:address-telephone": {
    typeRef: "doc:address-telephone",
    label: "Telephone Bill",
    moduleId: "address_proof",
    defaultSeverity: "mandatory",
    weight: 10,
  },
  "doc:address-rent": {
    typeRef: "doc:address-rent",
    label: "Rent Agreement",
    moduleId: "address_proof",
    defaultSeverity: "mandatory",
    weight: 10,
  },
  "doc:address-property-tax": {
    typeRef: "doc:address-property-tax",
    label: "Property Tax Receipt",
    moduleId: "address_proof",
    defaultSeverity: "mandatory",
    weight: 10,
  },
  "doc:address-passport": {
    typeRef: "doc:address-passport",
    label: "Passport (Address)",
    moduleId: "address_proof",
    defaultSeverity: "mandatory",
    weight: 10,
  },

  // C. Business Constitution
  "doc:shop-act": {
    typeRef: "doc:shop-act",
    label: "Shop & Establishment / Trade Licence",
    moduleId: "business_constitution",
    defaultSeverity: "mandatory",
    weight: 8,
  },
  "doc:partnership-deed": {
    typeRef: "doc:partnership-deed",
    label: "Partnership Deed",
    moduleId: "business_constitution",
    defaultSeverity: "mandatory",
    weight: 10,
  },
  "doc:llp-agreement": {
    typeRef: "doc:llp-agreement",
    label: "LLP Agreement",
    moduleId: "business_constitution",
    defaultSeverity: "mandatory",
    weight: 10,
  },
  "doc:moa": {
    typeRef: "doc:moa",
    label: "MOA / AOA",
    moduleId: "business_constitution",
    defaultSeverity: "mandatory",
    weight: 10,
  },
  "doc:board-resolution": {
    typeRef: "doc:board-resolution",
    label: "Board Resolution",
    moduleId: "business_constitution",
    defaultSeverity: "mandatory",
    weight: 8,
  },
  "doc:coi": {
    typeRef: "doc:coi",
    label: "Certificate of Incorporation",
    moduleId: "business_constitution",
    defaultSeverity: "mandatory",
    weight: 10,
  },

  // D. Financial
  "doc:salary-slip": {
    typeRef: "doc:salary-slip",
    label: "Salary Slips (last 3 months)",
    moduleId: "financial",
    defaultSeverity: "mandatory",
    weight: 18,
  },
  "doc:form-16": {
    typeRef: "doc:form-16",
    label: "Form 16",
    moduleId: "financial",
    defaultSeverity: "required",
    optional: true,
    weight: 6,
  },
  "doc:financial-folder": {
    typeRef: "doc:financial-folder",
    label: "Financial Documents Folder",
    moduleId: "financial",
    defaultSeverity: "mandatory",
    weight: 20,
  },

  // E. Banking
  "doc:bank-statement": {
    typeRef: "doc:bank-statement",
    label: "Primary Bank Statement",
    moduleId: "banking",
    defaultSeverity: "mandatory",
    weight: 14,
  },
  "doc:other-bank-statement": {
    typeRef: "doc:other-bank-statement",
    label: "Other Bank Statement",
    moduleId: "banking",
    defaultSeverity: "required",
    optional: true,
    weight: 6,
  },

  // F. Property (folder — after soft approval)
  "doc:property-folder": {
    typeRef: "doc:property-folder",
    label: "Property Documents Folder",
    moduleId: "property",
    defaultSeverity: "mandatory",
    weight: 20,
  },

  // G. Existing Loan / BT
  "doc:bt-sanction-letter": {
    typeRef: "doc:bt-sanction-letter",
    label: "Existing Loan Sanction Letter",
    moduleId: "existing_loan",
    defaultSeverity: "mandatory",
    weight: 16,
  },
  "doc:bt-loan-statement": {
    typeRef: "doc:bt-loan-statement",
    label: "Loan Statement",
    moduleId: "existing_loan",
    defaultSeverity: "mandatory",
    weight: 12,
  },
  "doc:bt-foreclosure": {
    typeRef: "doc:bt-foreclosure",
    label: "Foreclosure Letter",
    moduleId: "existing_loan",
    defaultSeverity: "mandatory",
    weight: 12,
  },
  "doc:bt-rtr": {
    typeRef: "doc:bt-rtr",
    label: "Repayment Track Record",
    moduleId: "existing_loan",
    defaultSeverity: "mandatory",
    weight: 10,
  },
};

export const EDIE_ADDRESS_PROOF_CHOICES = [
  "doc:address-electricity",
  "doc:address-gas",
  "doc:address-telephone",
  "doc:address-rent",
  "doc:address-property-tax",
  "doc:address-passport",
] as const;

export const EDIE_ADDRESS_PROOF_GROUP = "address_proof_one_of";
