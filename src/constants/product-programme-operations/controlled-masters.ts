/**
 * CO-PRODUCT-PROGRAM-OPERATIONS-001 — Controlled masters for Product Programmes.
 * Reuses ECM / Product Master / EDIE identities. Does not invent a second SSOT.
 * NRI is residency, never legal constitution.
 */

export const PROGRAMME_EMPLOYMENT_TYPES = [
  { id: "salaried", label: "Salaried", family: "salaried" as const },
  {
    id: "self-employed-professional",
    label: "Self-employed Professional",
    family: "self_employed" as const,
  },
  {
    id: "self-employed-business",
    label: "Self-employed Non-professional/Business",
    family: "self_employed" as const,
  },
  { id: "not_applicable", label: "Not applicable", family: "not_applicable" as const },
] as const;

export type ProgrammeEmploymentTypeId = (typeof PROGRAMME_EMPLOYMENT_TYPES)[number]["id"];

export const PROGRAMME_LEGAL_CONSTITUTIONS = [
  { id: "individual", label: "Individual" },
  { id: "proprietorship", label: "Proprietorship" },
  { id: "partnership", label: "Partnership" },
  { id: "llp", label: "LLP" },
  { id: "opc", label: "OPC" },
  { id: "private_limited", label: "Private Limited Company" },
  { id: "public_limited", label: "Public Limited Company" },
  { id: "huf", label: "HUF" },
  { id: "trust", label: "Trust" },
  { id: "society", label: "Society" },
  { id: "other_approved", label: "Other approved type" },
] as const;

export type ProgrammeLegalConstitutionId = (typeof PROGRAMME_LEGAL_CONSTITUTIONS)[number]["id"];

export const PROGRAMME_RESIDENCY = [
  { id: "resident", label: "Resident Indian" },
  { id: "nri", label: "NRI" },
  { id: "pio", label: "PIO / OCI" },
  { id: "not_applicable", label: "Not applicable" },
] as const;

export type ProgrammeResidencyId = (typeof PROGRAMME_RESIDENCY)[number]["id"];

export const PROGRAMME_APPLICANT_TYPES = [
  { id: "primary_applicant", label: "Primary Applicant" },
  { id: "co_applicant", label: "Co-Applicant" },
  { id: "guarantor", label: "Guarantor" },
  { id: "company", label: "Company" },
] as const;

export const PROGRAMME_TRANSACTION_TYPES = [
  { id: "fresh", label: "Fresh" },
  { id: "balance_transfer", label: "Balance Transfer" },
  { id: "top_up", label: "Top-up" },
  { id: "bt_top_up", label: "Balance Transfer + Top-up" },
] as const;

export const PROGRAMME_PROPERTY_TYPES = [
  { id: "ready", label: "Ready possession" },
  { id: "under_construction", label: "Under construction" },
  { id: "resale", label: "Resale" },
  { id: "plot", label: "Plot" },
  { id: "not_applicable", label: "Not applicable" },
] as const;

export const PROGRAMME_RATE_TYPES = [
  { id: "floating", label: "Floating" },
  { id: "fixed", label: "Fixed" },
  { id: "hybrid", label: "Hybrid" },
] as const;

export const PROGRAMME_BENCHMARKS = [
  { id: "repo", label: "RBI Repo" },
  { id: "mclr", label: "MCLR" },
  { id: "eblr", label: "EBLR" },
  { id: "base_rate", label: "Base Rate" },
  { id: "not_applicable", label: "Not applicable" },
] as const;

export const PROGRAMME_INCOME_ASSESSMENT_METHODS = [
  { id: "salary", label: "Salary" },
  { id: "itr", label: "ITR" },
  { id: "gst", label: "GST" },
  { id: "banking", label: "Banking" },
  { id: "turnover", label: "Turnover" },
  { id: "not_applicable", label: "Not applicable" },
] as const;

export const PROGRAMME_PUBLICATION_STATES = [
  "draft",
  "pending_approval",
  "published",
  "superseded",
  "archived",
] as const;

export type ProgrammePublicationState = (typeof PROGRAMME_PUBLICATION_STATES)[number];

export const PROGRAMME_COMPLETENESS_STATES = ["incomplete", "complete"] as const;

export type ProgrammeCompletenessState = (typeof PROGRAMME_COMPLETENESS_STATES)[number];

export const DURABLE_POLICY_STATUSES = [
  "draft",
  "pending_approval",
  "published",
  "superseded",
  "retired",
] as const;

export type DurablePolicyStatus = (typeof DURABLE_POLICY_STATUSES)[number];

export const PROGRAMME_EMPLOYMENT_ID_SET = new Set(
  PROGRAMME_EMPLOYMENT_TYPES.map((item) => item.id),
);
export const PROGRAMME_CONSTITUTION_ID_SET = new Set(
  PROGRAMME_LEGAL_CONSTITUTIONS.map((item) => item.id),
);
export const PROGRAMME_RESIDENCY_ID_SET = new Set(PROGRAMME_RESIDENCY.map((item) => item.id));
