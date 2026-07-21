/**
 * CO-SPRINT-094 — Contact Registry listing helpers.
 */

import { getEcmRoleLabel } from "@/constants/enterprise-contact-master";
import { getEcmCompany, listCompanyLinks, listContactCompanyLinks } from "@/lib/enterprise-company-master";
import { listEoleOpportunitiesByCustomer } from "@/lib/enterprise-opportunity-lifecycle-engine";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type { EcmCompany } from "@/types/enterprise-company-master";
import type {
  ContactRegistryFilters,
  ContactRegistryRow,
  ContactRegistrySortField,
} from "@/types/enterprise-contact-registry";

function formatDate(value?: string): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function profileValue(contact: EcmContact, key: string): string {
  const profiles = contact.roleProfiles ?? {};
  for (const role of contact.roles) {
    const bag = profiles[role];
    if (bag?.[key]?.trim()) return bag[key]!.trim();
  }
  return "—";
}

function companyNameFor(contactId: string): string {
  const links = listContactCompanyLinks(contactId);
  for (const link of links) {
    const company = getEcmCompany(link.companyId);
    if (company?.companyName) return company.companyName;
  }
  return "—";
}

function activeOpportunityCount(contact: EcmContact): number {
  try {
    const byId = listEoleOpportunitiesByCustomer(contact.id);
    const byRef = listEoleOpportunitiesByCustomer(`ecm:contact:${contact.id}`);
    const seen = new Set([...byId, ...byRef].map((o) => o.id));
    return seen.size;
  } catch {
    return 0;
  }
}

export function toContactRegistryRow(contact: EcmContact): ContactRegistryRow {
  const email = contact.officialEmail || contact.personalEmail || "—";
  return {
    id: contact.id,
    entityKind: "contact",
    contactId: contact.id.slice(0, 8).toUpperCase(),
    name: contact.name,
    contactType: getEcmRoleLabel(contact.primaryRole ?? contact.roles[0] ?? "customer"),
    contactTypeRole: contact.primaryRole ?? contact.roles[0] ?? "customer",
    mobile: contact.mobilePrimary,
    email,
    city: contact.city?.trim() || "—",
    state: contact.state?.trim() || "—",
    assignedRm: contact.ownerName?.trim() || "—",
    activeOpportunities: activeOpportunityCount(contact),
    contactScore: contact.contactScore,
    strategicContact: Boolean(contact.strategicContact),
    lastInteraction: formatDate(contact.lastActiveOn),
    lastInteractionAt: contact.lastActiveOn || "",
    dateCreated: formatDate(contact.createdOn),
    dateCreatedAt: contact.createdOn || "",
    status: contact.status,
    companyName: companyNameFor(contact.id),
    source: profileValue(contact, "source"),
    panStatus: contact.pan?.trim() ? "Captured" : "Pending",
    aadhaarStatus: contact.aadhaar?.trim() ? "Captured" : "Pending",
    lastModified: formatDate(contact.modifiedOn),
    lastModifiedAt: contact.modifiedOn || "",
    tags: contact.roles.map((r) => getEcmRoleLabel(r)).join(", "),
    loanRequirement: profileValue(contact, "loanRequirement"),
    productInterest: profileValue(contact, "productInterest"),
    customerStage: profileValue(contact, "customerStage"),
    contact,
  };
}

export function toCompanyRegistryRow(company: EcmCompany): ContactRegistryRow {
  const linkCount = listCompanyLinks(company.id).length;
  return {
    id: company.id,
    entityKind: "company",
    contactId: company.id.slice(0, 8).toUpperCase(),
    name: company.companyName,
    contactType: "Company",
    contactTypeRole: "customer",
    mobile: "—",
    email: "—",
    city: "—",
    state: "—",
    assignedRm: company.ownerName?.trim() || "—",
    activeOpportunities: 0,
    contactScore: company.companyScore,
    strategicContact: false,
    lastInteraction: "—",
    lastInteractionAt: "",
    dateCreated: formatDate(company.createdOn),
    dateCreatedAt: company.createdOn || "",
    status: company.status,
    companyName: company.companyName,
    source: "—",
    panStatus: company.pan?.trim() ? "Captured" : "Pending",
    aadhaarStatus: "—",
    lastModified: formatDate(company.modifiedOn),
    lastModifiedAt: company.modifiedOn || "",
    tags: linkCount > 0 ? `${linkCount} linked contact${linkCount === 1 ? "" : "s"}` : "No relationships",
    loanRequirement: "—",
    productInterest: company.industry ? company.industry : "—",
    customerStage: "—",
    company,
  };
}

export function buildContactRegistryRows(contacts: EcmContact[]): ContactRegistryRow[] {
  return contacts.map(toContactRegistryRow);
}

/** Unified Directory Registry — individuals + legal entities, sorted by modifiedOn desc. */
export function buildDirectoryRegistryRows(
  contacts: EcmContact[],
  companies: EcmCompany[],
): ContactRegistryRow[] {
  const rows = [
    ...contacts.map(toContactRegistryRow),
    ...companies.map(toCompanyRegistryRow),
  ];
  return rows.sort((a, b) => b.lastModifiedAt.localeCompare(a.lastModifiedAt));
}

export function filterContactRegistryRows(
  rows: ContactRegistryRow[],
  filters: ContactRegistryFilters,
): ContactRegistryRow[] {
  const q = filters.search.trim().toLowerCase();
  const scoreMin = filters.scoreMin ? Number(filters.scoreMin) : null;
  const scoreMax = filters.scoreMax ? Number(filters.scoreMax) : null;
  const colName = filters.columnName.trim().toLowerCase();
  const colMobile = filters.columnMobile.trim().toLowerCase();
  const createdFrom = filters.dateCreatedFrom ? new Date(filters.dateCreatedFrom).getTime() : null;
  const createdTo = filters.dateCreatedTo ? new Date(filters.dateCreatedTo).getTime() : null;
  const interactFrom = filters.lastInteractionFrom
    ? new Date(filters.lastInteractionFrom).getTime()
    : null;
  const interactTo = filters.lastInteractionTo
    ? new Date(filters.lastInteractionTo).getTime()
    : null;

  return rows.filter((row) => {
    if (filters.entityFilter === "individuals" && row.entityKind !== "contact") return false;
    if (filters.entityFilter === "companies" && row.entityKind !== "company") return false;

    if (q) {
      const hay = [
        row.name,
        row.mobile,
        row.email,
        row.city,
        row.state,
        row.assignedRm,
        row.companyName,
        row.contactType,
        row.entityKind === "contact" ? row.contact?.id : row.company?.id,
        row.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (
      filters.contactType !== "all" &&
      row.entityKind === "company"
    ) {
      return false;
    }
    if (
      filters.contactType !== "all" &&
      row.entityKind === "contact" &&
      row.contactTypeRole !== filters.contactType
    ) {
      return false;
    }
    if (filters.city !== "all" && row.city !== filters.city) return false;
    if (filters.state !== "all" && row.state !== filters.state) return false;
    if (filters.assignedRm !== "all" && row.assignedRm !== filters.assignedRm) return false;
    if (filters.status !== "all" && row.status !== filters.status) return false;
    if (filters.strategic === "yes" && !row.strategicContact) return false;
    if (filters.strategic === "no" && row.strategicContact) return false;
    if (row.entityKind === "company") {
      if (filters.strategic !== "all") return false;
      if (filters.status !== "all" && row.status !== filters.status) return false;
      if (colMobile) return false;
      if (scoreMin != null && !Number.isNaN(scoreMin) && row.contactScore < scoreMin) return false;
      if (scoreMax != null && !Number.isNaN(scoreMax) && row.contactScore > scoreMax) return false;
      if (colName && !row.name.toLowerCase().includes(colName)) return false;
      if (createdFrom != null && !Number.isNaN(createdFrom)) {
        const t = new Date(row.dateCreatedAt).getTime();
        if (Number.isNaN(t) || t < createdFrom) return false;
      }
      if (createdTo != null && !Number.isNaN(createdTo)) {
        const t = new Date(row.dateCreatedAt).getTime();
        if (Number.isNaN(t) || t > createdTo + 86400000 - 1) return false;
      }
      return true;
    }
    if (scoreMin != null && !Number.isNaN(scoreMin) && row.contactScore < scoreMin) return false;
    if (scoreMax != null && !Number.isNaN(scoreMax) && row.contactScore > scoreMax) return false;
    if (colName && !row.name.toLowerCase().includes(colName)) return false;
    if (colMobile && !row.mobile.toLowerCase().includes(colMobile)) return false;

    if (createdFrom != null && !Number.isNaN(createdFrom)) {
      const t = new Date(row.dateCreatedAt).getTime();
      if (Number.isNaN(t) || t < createdFrom) return false;
    }
    if (createdTo != null && !Number.isNaN(createdTo)) {
      const t = new Date(row.dateCreatedAt).getTime();
      if (Number.isNaN(t) || t > createdTo + 86400000 - 1) return false;
    }
    if (interactFrom != null && !Number.isNaN(interactFrom)) {
      const t = new Date(row.lastInteractionAt).getTime();
      if (Number.isNaN(t) || t < interactFrom) return false;
    }
    if (interactTo != null && !Number.isNaN(interactTo)) {
      const t = new Date(row.lastInteractionAt).getTime();
      if (Number.isNaN(t) || t > interactTo + 86400000 - 1) return false;
    }
    return true;
  });
}

export function sortContactRegistryRows(
  rows: ContactRegistryRow[],
  field: ContactRegistrySortField,
  direction: "asc" | "desc",
): ContactRegistryRow[] {
  const dir = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (typeof av === "boolean" && typeof bv === "boolean") {
      return ((av ? 1 : 0) - (bv ? 1 : 0)) * dir;
    }
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

export function uniqueContactCities(rows: ContactRegistryRow[]): string[] {
  return [...new Set(rows.map((r) => r.city).filter((c) => c && c !== "—"))].sort();
}

export function uniqueContactStates(rows: ContactRegistryRow[]): string[] {
  return [...new Set(rows.map((r) => r.state).filter((s) => s && s !== "—"))].sort();
}

export function uniqueAssignedRms(rows: ContactRegistryRow[]): string[] {
  return [...new Set(rows.map((r) => r.assignedRm).filter((r) => r && r !== "—"))].sort();
}

export function exportContactRegistryCsv(rows: ContactRegistryRow[]): string {
  const headers = [
    "Contact ID",
    "Contact Name",
    "Contact Type",
    "Mobile Number",
    "City",
    "Assigned RM",
    "Active Opportunities",
    "Contact Score",
    "Strategic Contact",
    "Last Interaction",
    "Date Created",
    "Status",
    "Email",
    "Company Name",
    "Source",
    "PAN Status",
    "Aadhaar Status",
    "Last Modified",
    "Tags",
    "Loan Requirement",
    "Product Interest",
    "Customer Stage",
  ];
  const lines = rows.map((r) =>
    [
      r.entityKind === "contact" ? r.contact?.id ?? r.id : r.company?.id ?? r.id,
      r.name,
      r.contactType,
      r.mobile,
      r.city,
      r.assignedRm,
      r.activeOpportunities,
      r.contactScore,
      r.strategicContact ? "Yes" : "No",
      r.lastInteraction,
      r.dateCreated,
      r.status,
      r.email,
      r.companyName,
      r.source,
      r.panStatus,
      r.aadhaarStatus,
      r.lastModified,
      r.tags,
      r.loanRequirement,
      r.productInterest,
      r.customerStage,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}
