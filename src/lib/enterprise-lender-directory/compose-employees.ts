/**
 * CO-ARCH-ELD-EMP — Compose Lender Employee directory from ECM + ELR + Product Master.
 * Additive · read-only projection · never invents commercial / performance scores.
 */

import { getEcmMasterLabel } from "@/constants/enterprise-contact-master";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  getEnterpriseRegionLabel,
  normalizeEnterpriseRegionId,
} from "@/constants/enterprise-region-master";
import { lenderSalesDesignationLabel } from "@/constants/lender-sales-contact";
import {
  resolveCanonicalProductCode,
} from "@/constants/enterprise-product-master";
import { isStageAtOrBeyond, STAGE_LABELS } from "@/constants/loan-stage-master";
import {
  buildEcmBankerReportingChain,
  getEcmBankerProfile,
  getEcmContactAssignedRoles,
  getEcmPorts,
  listEcmContacts,
  parseBankerProductsHandled,
  queryEcmContacts,
} from "@/lib/enterprise-contact-master";
import { resolveDealStageProjection } from "@/lib/enterprise-deal/deal-stage-projection";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { ecmApiClient } from "@/lib/enterprise-persistence/ecm-api-client";
import {
  getFallbackProductMasterOptions,
  resolveProductOptionLabel,
  type ProductMasterOption,
} from "@/lib/enterprise-product-master/options";
import type { PipelineStage } from "@/types/catalyst-one";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";
import type {
  EldLenderEmployeeFilters,
  EldLenderEmployeeHierarchyNode,
  EldLenderEmployeePipelineItem,
  EldLenderEmployeeRow,
  EldLenderEmployeeSortMode,
  EldLenderEmployeeStatus,
} from "@/types/enterprise-lender-directory-ops";

function formatInr(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount) || amount <= 0) return "Not Specified";
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function mapEmployeeStatus(contact: EcmContact): {
  status: EldLenderEmployeeStatus;
  statusLabel: string;
} {
  if (contact.status === "archived" || contact.enabled === false) {
    return { status: "inactive", statusLabel: "Inactive" };
  }
  if (contact.status === "provisional") {
    return { status: "provisional", statusLabel: "Provisional" };
  }
  return { status: "active", statusLabel: "Active" };
}

function designationLabel(raw?: string): string {
  const id = (raw ?? "").trim();
  if (!id) return "Not Specified";
  return lenderSalesDesignationLabel(id) || getEcmMasterLabel("designation", id) || id;
}

function masterLabel(domain: "city" | "branch" | "region", id?: string): string {
  const raw = (id ?? "").trim();
  if (!raw) return "Not Specified";
  if (domain === "region") {
    return getEnterpriseRegionLabel(raw) || getEcmMasterLabel("region", raw) || "Not Specified";
  }
  return getEcmMasterLabel(domain, raw) || raw;
}

function productLabels(
  codes: string[],
  options: ProductMasterOption[],
): { codes: string[]; label: string } {
  const resolved = [
    ...new Set(
      codes
        .map((c) => resolveCanonicalProductCode(c) || c.trim())
        .filter(Boolean),
    ),
  ];
  if (resolved.length === 0) return { codes: [], label: "Not Specified" };
  const labels = resolved.map(
    (code) => resolveProductOptionLabel(code, options) || code,
  );
  return { codes: resolved, label: labels.join(", ") };
}

/** Extract lender sales contact id from Deal snapshot (CO-LR-013). */
export function extractDealSalesContactId(
  deal: EnterpriseDealApiRecord,
): string | undefined {
  const snap =
    deal.snapshot && typeof deal.snapshot === "object"
      ? (deal.snapshot as Record<string, unknown>)
      : null;
  if (!snap) return undefined;
  const lenders = Array.isArray(snap.lenders) ? snap.lenders : [];
  for (const raw of lenders) {
    if (!raw || typeof raw !== "object") continue;
    const id = String(
      (raw as { lenderSalesContactId?: unknown }).lenderSalesContactId ?? "",
    ).trim();
    if (id) return id;
  }
  const top = String(
    (snap as { lenderSalesContactId?: unknown }).lenderSalesContactId ?? "",
  ).trim();
  return top || undefined;
}

function buildPipelineItem(deal: EnterpriseDealApiRecord): EldLenderEmployeePipelineItem {
  const stage = resolveDealStageProjection(deal);
  const stageLabel =
    stage && STAGE_LABELS[stage as PipelineStage]
      ? STAGE_LABELS[stage as PipelineStage]
      : deal.grossStage?.trim() || "Not Specified";
  return {
    dealId: deal.id,
    dealNumber: deal.dealNumber || deal.id,
    opportunityId: deal.opportunityId,
    opportunityNumber: deal.opportunityNumber,
    customerName:
      deal.primaryContactName?.trim() ||
      deal.companyName?.trim() ||
      deal.primaryCounterpartyName?.trim() ||
      "Not Specified",
    productLabel: deal.productLabel?.trim() || "Not Specified",
    stageLabel,
    amountLabel: formatInr(deal.requestedAmount ?? deal.approvedAmount ?? null),
    lenderId: deal.lenderId,
  };
}

export type EldEmployeeDealMetrics = {
  activeOpportunities: number;
  activeDeals: number;
  totalSanctions: number;
  totalDisbursements: number;
  approvalRatioLabel: string;
  pipeline: EldLenderEmployeePipelineItem[];
};

export function buildEmployeeDealMetrics(
  contactId: string,
  deals: EnterpriseDealApiRecord[],
): EldEmployeeDealMetrics {
  const mine = deals.filter(
    (d) =>
      !d.isDeleted &&
      !d.archived &&
      extractDealSalesContactId(d) === contactId,
  );
  const active = mine.filter((d) => {
    const stage = resolveDealStageProjection(d);
    return stage !== "won" && d.lifecycleStatus !== "closed";
  });
  const oppIds = new Set(
    active.map((d) => d.opportunityId?.trim()).filter(Boolean) as string[],
  );
  let sanctions = 0;
  let disbursements = 0;
  for (const d of mine) {
    const stage = resolveDealStageProjection(d) as PipelineStage | "";
    if (!stage) continue;
    if (isStageAtOrBeyond(stage, "final_approved")) sanctions += 1;
    if (stage === "won") disbursements += 1;
  }

  return {
    activeOpportunities: oppIds.size,
    activeDeals: active.length,
    totalSanctions: sanctions,
    totalDisbursements: disbursements,
    /** Approval ratio requires certified reject+approve SSOT — never invent. */
    approvalRatioLabel: "Not Specified",
    pipeline: active.map(buildPipelineItem),
  };
}

function buildHierarchy(contactId: string): EldLenderEmployeeHierarchyNode[] {
  const chain = buildEcmBankerReportingChain(contactId, { maxDepth: 12 });
  // Chain is employee → manager → … ; reverse for National Head → … → RM display
  const byId = new Map(listEcmContacts().map((c) => [c.id, c]));
  const nodes = chain.map((node) => {
    const contact = byId.get(node.contactId);
    const profile = contact ? getEcmBankerProfile(contact) : {};
    const mobile =
      profile.officialMobile?.trim() ||
      contact?.mobilePrimary?.trim() ||
      "Not Specified";
    return {
      contactId: node.contactId,
      name: node.name,
      designationLabel: node.designation || "Not Specified",
      mobile,
    };
  });
  return [...nodes].reverse();
}

export function composeEldLenderEmployeeRows(input: {
  contacts: EcmContact[];
  lenders: EnterpriseLenderRecord[];
  deals?: EnterpriseDealApiRecord[];
  productOptions?: ProductMasterOption[];
}): EldLenderEmployeeRow[] {
  const options = input.productOptions?.length
    ? input.productOptions
    : getFallbackProductMasterOptions();
  const lenderById = new Map(input.lenders.map((l) => [l.id, l]));
  const lenderByKey = new Map<string, EnterpriseLenderRecord>();
  for (const l of input.lenders) {
    for (const key of [l.id, l.code, l.label, l.shortName, l.displayName]) {
      const k = String(key ?? "")
        .trim()
        .toLowerCase();
      if (k) lenderByKey.set(k, l);
    }
  }
  const deals = input.deals ?? [];

  return input.contacts
    .filter((c) => getEcmContactAssignedRoles(c).includes("lender_employee"))
    .map((contact) => {
      const profile = getEcmBankerProfile(contact);
      const institutionKey = (profile.institution ?? "").trim();
      const lender =
        (institutionKey ? lenderById.get(institutionKey) : undefined) ||
        (institutionKey
          ? lenderByKey.get(institutionKey.toLowerCase())
          : undefined);
      const institutionName =
        lender?.label?.trim() ||
        profile.institutionLabel?.trim() ||
        profile.lenderName?.trim() ||
        (institutionKey || "Not Specified");
      const institutionId = lender?.id || institutionKey;
      const products = productLabels(
        parseBankerProductsHandled(profile.productsHandled),
        options,
      );
      const { status, statusLabel } = mapEmployeeStatus(contact);
      const metrics = buildEmployeeDealMetrics(contact.id, deals);
      const designationId = (profile.designation ?? "").trim();
      const cityId = (profile.city ?? contact.city ?? "").trim();
      const branchId = (profile.branch ?? "").trim();
      // CO-MASTER-REGION-001 — project legacy lender-scoped ids to Enterprise Region Master
      const regionId =
        normalizeEnterpriseRegionId(profile.region) ||
        (profile.region ?? "").trim();
      const mobile =
        profile.officialMobile?.trim() ||
        contact.mobilePrimary?.trim() ||
        "";
      const email =
        profile.officialEmail?.trim() ||
        contact.officialEmail?.trim() ||
        contact.personalEmail?.trim() ||
        "";
      const hierarchy = buildHierarchy(contact.id);
      const managerFromChain = hierarchy.length > 1 ? hierarchy[hierarchy.length - 2] : undefined;
      const reportingManagerName =
        profile.reportingManagerName?.trim() ||
        managerFromChain?.name ||
        "Not Specified";
      const reportingManagerContactId =
        profile.reportingManagerContactId?.trim() ||
        managerFromChain?.contactId;

      const searchBlob = [
        contact.name,
        mobile,
        email,
        institutionName,
        designationLabel(designationId),
        products.label,
        masterLabel("city", cityId),
        masterLabel("branch", branchId),
        masterLabel("region", regionId),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return {
        contactId: contact.id,
        employeeName: contact.name,
        institutionId,
        institutionName,
        branchId,
        branchLabel: masterLabel("branch", branchId),
        cityId,
        cityLabel: masterLabel("city", cityId),
        regionId,
        regionLabel: masterLabel("region", regionId),
        designationId,
        designationLabel: designationLabel(designationId),
        productCodes: products.codes,
        productsHandledLabel: products.label,
        mobile: mobile || "Not Specified",
        email: email || "Not Specified",
        reportingManagerContactId,
        reportingManagerName,
        performanceScore: null,
        performanceScoreLabel: "Not Specified",
        activeOpportunities: metrics.activeOpportunities,
        activeDeals: metrics.activeDeals,
        totalSanctions: metrics.totalSanctions,
        totalDisbursements: metrics.totalDisbursements,
        averageTatDays: null,
        averageTatLabel: "Not Specified",
        approvalRatioLabel: metrics.approvalRatioLabel,
        status,
        statusLabel,
        searchBlob,
        pipeline: metrics.pipeline,
        hierarchy,
      } satisfies EldLenderEmployeeRow;
    })
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export function filterEldLenderEmployeeRows(
  rows: EldLenderEmployeeRow[],
  filters: EldLenderEmployeeFilters,
): EldLenderEmployeeRow[] {
  const q = filters.search.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  return rows.filter((row) => {
    if (filters.lenderId !== "all" && row.institutionId !== filters.lenderId) {
      return false;
    }
    if (filters.product !== "all" && !row.productCodes.includes(filters.product)) {
      const want = filters.product.toLowerCase();
      if (!row.productsHandledLabel.toLowerCase().includes(want)) return false;
    }
    if (
      filters.designation !== "all" &&
      row.designationId !== filters.designation &&
      row.designationLabel !== filters.designation
    ) {
      return false;
    }
    if (
      filters.city !== "all" &&
      row.cityId !== filters.city &&
      row.cityLabel !== filters.city
    ) {
      return false;
    }
    if (filters.region !== "all") {
      const want =
        normalizeEnterpriseRegionId(filters.region) || filters.region;
      const have =
        normalizeEnterpriseRegionId(row.regionId) ||
        row.regionId ||
        row.regionLabel;
      if (have !== want && row.regionLabel !== filters.region) {
        return false;
      }
    }
    if (filters.status !== "all" && row.status !== filters.status) return false;
    if (filters.performance === "not_specified" && row.performanceScore != null) {
      return false;
    }
    if (
      filters.performance === "has_activity" &&
      row.activeOpportunities + row.activeDeals <= 0
    ) {
      return false;
    }
    if (!q) return true;
    if (row.searchBlob.includes(q)) return true;
    if (qDigits.length >= 3 && row.mobile.replace(/\D/g, "").includes(qDigits)) {
      return true;
    }
    return false;
  });
}

export function sortEldLenderEmployeeRows(
  rows: EldLenderEmployeeRow[],
  mode: EldLenderEmployeeSortMode,
  dir: "asc" | "desc" = "asc",
): EldLenderEmployeeRow[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av =
      mode === "employeeName"
        ? a.employeeName
        : mode === "institutionName"
          ? a.institutionName
          : mode === "designationLabel"
            ? a.designationLabel
            : mode === "cityLabel"
              ? a.cityLabel
              : mode === "performanceScore"
                ? a.performanceScore ?? -1
                : mode === "activeOpportunities"
                  ? a.activeOpportunities
                  : mode === "activeDeals"
                    ? a.activeDeals
                    : a.status;
    const bv =
      mode === "employeeName"
        ? b.employeeName
        : mode === "institutionName"
          ? b.institutionName
          : mode === "designationLabel"
            ? b.designationLabel
            : mode === "cityLabel"
              ? b.cityLabel
              : mode === "performanceScore"
                ? b.performanceScore ?? -1
                : mode === "activeOpportunities"
                  ? b.activeOpportunities
                  : mode === "activeDeals"
                    ? b.activeDeals
                    : b.status;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
    return String(av).localeCompare(String(bv)) * mul;
  });
}

export function uniqueEmployeeFilterValues(rows: EldLenderEmployeeRow[]): {
  designations: { id: string; label: string }[];
  cities: { id: string; label: string }[];
  regions: { id: string; label: string }[];
} {
  const designations = new Map<string, string>();
  const cities = new Map<string, string>();
  const regions = new Map<string, string>();
  for (const r of rows) {
    if (r.designationId || r.designationLabel !== "Not Specified") {
      designations.set(r.designationId || r.designationLabel, r.designationLabel);
    }
    if (r.cityId || r.cityLabel !== "Not Specified") {
      cities.set(r.cityId || r.cityLabel, r.cityLabel);
    }
    if (r.regionId || r.regionLabel !== "Not Specified") {
      const canonical = normalizeEnterpriseRegionId(r.regionId) || r.regionId || r.regionLabel;
      const label =
        getEnterpriseRegionLabel(r.regionId) ||
        getEnterpriseRegionLabel(r.regionLabel) ||
        r.regionLabel;
      // Deduplicate by canonical Enterprise Region Master id (legacy hdfc-west → west).
      regions.set(canonical, label);
    }
  }
  const toSorted = (m: Map<string, string>) =>
    [...m.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  return {
    designations: toSorted(designations),
    cities: toSorted(cities),
    regions: toSorted(regions),
  };
}

export function exportEldLenderEmployeesCsv(rows: EldLenderEmployeeRow[]): string {
  const header = [
    "Employee Name",
    "Institution",
    "Branch",
    "City",
    "Designation",
    "Products Handled",
    "Mobile Number",
    "Email Address",
    "Performance Score",
    "Active Opportunities",
    "Active Deals",
    "Total Sanctions",
    "Total Disbursements",
    "Average TAT",
    "Status",
  ];
  const lines = rows.map((r) =>
    [
      r.employeeName,
      r.institutionName,
      r.branchLabel,
      r.cityLabel,
      r.designationLabel,
      r.productsHandledLabel,
      r.mobile,
      r.email,
      r.performanceScoreLabel,
      String(r.activeOpportunities),
      String(r.activeDeals),
      String(r.totalSanctions),
      String(r.totalDisbursements),
      r.averageTatLabel,
      r.statusLabel,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

/**
 * Load ECM Lender Contacts (role = lender_employee) — Prisma live when enabled.
 */
export async function loadEldLenderEmployeeContacts(): Promise<EcmContact[]> {
  if (isEnterprisePersistencePrisma()) {
    try {
      const result = await ecmApiClient.queryContacts({
        roles: ["lender_employee"],
        status: "all",
        page: 1,
        pageSize: 500,
        sortBy: "name",
        sortDir: "asc",
      });
      const items = Array.isArray(result.items) ? result.items : [];
      const bankers = items.filter(
        (c) =>
          getEcmContactAssignedRoles(c).includes("lender_employee") &&
          c.status !== "archived",
      );
      // Silent hydrate for hierarchy / relationship helpers (no registry bus notify).
      for (const c of bankers) {
        getEcmPorts().contacts.save(c);
      }
      return bankers;
    } catch {
      /* fall through to memory */
    }
  }
  return queryEcmContacts({
    roles: ["lender_employee"],
    status: "all",
    pageSize: 500,
  }).items.filter(
    (c) =>
      getEcmContactAssignedRoles(c).includes("lender_employee") &&
      c.status !== "archived",
  );
}

export const EMPTY_ELD_EMPLOYEE_FILTERS: EldLenderEmployeeFilters = {
  search: "",
  lenderId: "all",
  product: "all",
  designation: "all",
  city: "all",
  region: "all",
  status: "all",
  performance: "all",
};
