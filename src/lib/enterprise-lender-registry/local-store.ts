/**
 * GO-LIVE P0 + CO-ARCH-004 — Enterprise Lender Registry local relational store.
 * Soft Go-Live SSOT when Prisma lender API is unavailable.
 * Same shape as API records — no duplicated lender rows across modules.
 */
import { allocateLenderCode, isImmutableLenderCode } from "@/lib/enterprise-lender-registry/codes";
import {
  applyLenderDuplicateMerges,
  type LenderMergeReport,
} from "@/lib/enterprise-lender-registry/merge";
import type {
  CreateLenderContactInput,
  CreateLenderDocumentInput,
  CreateLenderInput,
  CreateLenderProgramInput,
  EnterpriseLenderContactRecord,
  EnterpriseLenderDocumentRecord,
  EnterpriseLenderProgramRecord,
  EnterpriseLenderRecord,
  EnterpriseLenderCategoryRecord,
  LenderProgramQuery,
  LenderQuery,
  UpdateLenderInput,
  UpdateLenderProgramInput,
} from "@/types/enterprise-lender-registry";

const STORAGE_KEY = "compass:enterprise-lender-registry-v1";

type RegistryBag = {
  masterSeedVersion?: number;
  categories: EnterpriseLenderCategoryRecord[];
  lenders: EnterpriseLenderRecord[];
  programs: EnterpriseLenderProgramRecord[];
  contacts: EnterpriseLenderContactRecord[];
  documents: EnterpriseLenderDocumentRecord[];
};

const ORG = "local-org";

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyBag(): RegistryBag {
  const at = nowIso();
  const general: EnterpriseLenderCategoryRecord = {
    id: "elcat-general",
    organizationId: ORG,
    code: "GENERAL",
    label: "General",
    sortOrder: 0,
    status: "active",
    enabled: true,
    versionNumber: 1,
    isDeleted: false,
    approvalStatus: "none",
    createdBy: "system",
    modifiedBy: "system",
    createdAt: at,
    updatedAt: at,
  };
  return {
    masterSeedVersion: 0,
    categories: [general],
    lenders: [],
    programs: [],
    contacts: [],
    documents: [],
  };
}

function readBag(): RegistryBag {
  if (typeof window === "undefined") return emptyBag();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const bag = emptyBag();
      writeBag(bag);
      return bag;
    }
    const parsed = JSON.parse(raw) as RegistryBag;
    if (!parsed.categories?.length) {
      const bag = { ...emptyBag(), ...parsed, categories: emptyBag().categories };
      writeBag(bag);
      return bag;
    }
    return parsed;
  } catch {
    return emptyBag();
  }
}

function writeBag(bag: RegistryBag) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bag));
  window.dispatchEvent(new CustomEvent("compass:lender-registry-updated"));
}

export function subscribeLenderRegistryUpdated(cb: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => cb();
  window.addEventListener("compass:lender-registry-updated", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("compass:lender-registry-updated", handler);
    window.removeEventListener("storage", handler);
  };
}

function normalizeCode(code: string) {
  const trimmed = code.trim().toUpperCase();
  if (isImmutableLenderCode(trimmed)) return trimmed;
  return trimmed.replace(/\s+/g, "_").replace(/[^A-Z0-9_-]/g, "");
}

export const localLenderRegistryStore = {
  listCategories() {
    return readBag().categories.filter((c) => !c.isDeleted);
  },

  queryLenders(query: LenderQuery = {}) {
    let items = readBag().lenders.filter((l) => !l.isDeleted || query.includeDeleted);
    if (query.search?.trim()) {
      const q = query.search.trim().toLowerCase();
      items = items.filter((l) => {
        const hay = [
          l.label,
          l.code,
          l.shortName,
          l.legalName,
          l.displayName,
          ...(l.aliases ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (query.status && query.status !== "all") {
      items = items.filter((l) => l.status === query.status);
    }
    if (query.enabled === true) items = items.filter((l) => l.enabled);
    if (query.enabled === false) items = items.filter((l) => !l.enabled);
    if (query.lifecycleStatus && query.lifecycleStatus !== "all") {
      items = items.filter((l) => l.lifecycleStatus === query.lifecycleStatus);
    }
    if (query.institutionCategory && query.institutionCategory !== "all") {
      items = items.filter((l) => l.institutionCategory === query.institutionCategory);
    }
    items = [...items].sort((a, b) => a.label.localeCompare(b.label));
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 200;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total: items.length };
  },

  getLender(id: string) {
    return readBag().lenders.find((l) => l.id === id && !l.isDeleted) ?? null;
  },

  createLender(input: CreateLenderInput): EnterpriseLenderRecord {
    const bag = readBag();
    const at = nowIso();
    const code = input.code?.trim()
      ? normalizeCode(input.code)
      : allocateLenderCode(bag.lenders.map((l) => l.code));
    if (bag.lenders.some((l) => !l.isDeleted && l.code === code)) {
      throw new Error(`Lender code ${code} already exists`);
    }
    const categoryId = input.categoryId || bag.categories[0]?.id || "elcat-general";
    const displayName = (input.displayName ?? input.label).trim();
    const row: EnterpriseLenderRecord = {
      id: uid("elend"),
      organizationId: ORG,
      categoryId,
      code,
      label: displayName,
      legalName: input.legalName?.trim() || displayName,
      displayName,
      shortName: input.shortName ?? null,
      aliases: input.aliases ?? [],
      description: input.description ?? null,
      institutionCategory: input.institutionCategory,
      classification: input.classification ?? null,
      lifecycleStatus: input.lifecycleStatus ?? "draft",
      operationalStatus: input.operationalStatus ?? "inactive",
      headquartersLabel: input.headquartersLabel ?? null,
      website: input.website ?? null,
      logoUrl: input.logoUrl ?? null,
      rbiRegistrationNumber: input.rbiRegistrationNumber ?? null,
      rbiRegulated: input.rbiRegulated ?? true,
      customerCarePhone: input.customerCarePhone ?? null,
      customerCareEmail: input.customerCareEmail ?? null,
      panIndia: input.panIndia ?? false,
      coverageStates: input.coverageStates ?? [],
      coverageCities: input.coverageCities ?? [],
      productsSupported: input.productsSupported ?? [],
      tags: input.tags ?? [],
      sortOrder: input.sortOrder ?? 0,
      status: input.status ?? "draft",
      enabled: input.enabled ?? true,
      versionNumber: 1,
      isDeleted: false,
      approvalStatus: "none",
      createdBy: input.createdBy,
      modifiedBy: input.createdBy,
      createdAt: at,
      updatedAt: at,
    };
    bag.lenders.unshift(row);
    writeBag(bag);
    return row;
  },

  /** One-time remint of legacy slug codes → LND######. Never changes an existing LND code. */
  remintLenderCode(id: string, actor: string): EnterpriseLenderRecord {
    const bag = readBag();
    const idx = bag.lenders.findIndex((l) => l.id === id && !l.isDeleted);
    if (idx < 0) throw new Error("Lender not found");
    const prev = bag.lenders[idx];
    if (isImmutableLenderCode(prev.code)) return prev;
    const nextCode = allocateLenderCode(bag.lenders.map((l) => l.code));
    const aliases = Array.from(
      new Set([...(prev.aliases ?? []), prev.code].filter(Boolean)),
    );
    bag.lenders[idx] = {
      ...prev,
      code: nextCode,
      aliases,
      modifiedBy: actor,
      updatedAt: nowIso(),
      versionNumber: prev.versionNumber + 1,
    };
    writeBag(bag);
    return bag.lenders[idx];
  },

  updateLender(id: string, input: UpdateLenderInput): EnterpriseLenderRecord {
    const bag = readBag();
    const idx = bag.lenders.findIndex((l) => l.id === id && !l.isDeleted);
    if (idx < 0) throw new Error("Lender not found");
    const prev = bag.lenders[idx];
    const next: EnterpriseLenderRecord = {
      ...prev,
      ...input,
      id: prev.id,
      organizationId: prev.organizationId,
      code: prev.code,
      createdBy: prev.createdBy,
      createdAt: prev.createdAt,
      modifiedBy: input.modifiedBy,
      updatedAt: nowIso(),
      versionNumber: prev.versionNumber + 1,
    };
    bag.lenders[idx] = next;
    writeBag(bag);
    return next;
  },

  archiveLender(id: string, modifiedBy: string) {
    return this.updateLender(id, {
      lifecycleStatus: "retired",
      status: "archived",
      enabled: false,
      operationalStatus: "inactive",
      modifiedBy,
    });
  },

  publishLender(id: string, modifiedBy: string) {
    return this.updateLender(id, {
      lifecycleStatus: "active",
      status: "active",
      enabled: true,
      operationalStatus: "active",
      modifiedBy,
    });
  },

  queryPrograms(query: LenderProgramQuery = {}) {
    let items = readBag().programs.filter((p) => !p.isDeleted);
    if (query.lenderId) items = items.filter((p) => p.lenderId === query.lenderId);
    if (query.productCode) items = items.filter((p) => p.productCode === query.productCode);
    if (query.lifecycleStatus && query.lifecycleStatus !== "all") {
      items = items.filter((p) => p.lifecycleStatus === query.lifecycleStatus);
    }
    if (query.status && query.status !== "all") {
      items = items.filter((p) => p.status === query.status);
    }
    if (query.publishedOnly) {
      items = items.filter(
        (p) => p.status === "active" && p.lifecycleStatus === "active" && p.enabled,
      );
      const lenders = new Map(readBag().lenders.map((l) => [l.id, l]));
      items = items.filter((p) => {
        const lender = lenders.get(p.lenderId);
        return (
          lender &&
          !lender.isDeleted &&
          lender.status === "active" &&
          lender.lifecycleStatus === "active" &&
          lender.enabled
        );
      });
    }
    if (query.search?.trim()) {
      const q = query.search.trim().toLowerCase();
      items = items.filter(
        (p) => p.label.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
      );
    }
    return { items, total: items.length };
  },

  createProgram(input: CreateLenderProgramInput): EnterpriseLenderProgramRecord {
    const bag = readBag();
    const at = nowIso();
    const code = normalizeCode(input.code);
    if (bag.programs.some((p) => !p.isDeleted && p.code === code)) {
      throw new Error(`Program code ${code} already exists`);
    }
    const row: EnterpriseLenderProgramRecord = {
      id: uid("elprog"),
      organizationId: ORG,
      lenderId: input.lenderId,
      productId: input.productId ?? null,
      productCode: input.productCode ?? null,
      code,
      label: input.label.trim(),
      description: input.description ?? null,
      borrowerType: input.borrowerType ?? null,
      employmentType: input.employmentType ?? null,
      roiPercent: input.roiPercent ?? null,
      minRoiPercent: input.minRoiPercent ?? null,
      maxRoiPercent: input.maxRoiPercent ?? null,
      processingFeeLabel: input.processingFeeLabel ?? null,
      processingFeePct: input.processingFeePct ?? null,
      maxFundingAmount: input.maxFundingAmount ?? null,
      maxLtvPercent: input.maxLtvPercent ?? null,
      maxTenureMonths: input.maxTenureMonths ?? null,
      minCibil: input.minCibil ?? null,
      minIncomeAmount: input.minIncomeAmount ?? null,
      eligibleStates: input.eligibleStates ?? [],
      eligibleCities: input.eligibleCities ?? [],
      averageTatDays: input.averageTatDays ?? null,
      remarks: input.remarks ?? null,
      lifecycleStatus: input.lifecycleStatus ?? "draft",
      status: input.status ?? "draft",
      enabled: input.enabled ?? true,
      versionNumber: 1,
      isDeleted: false,
      approvalStatus: "none",
      createdBy: input.createdBy,
      modifiedBy: input.createdBy,
      createdAt: at,
      updatedAt: at,
    };
    bag.programs.unshift(row);
    writeBag(bag);
    return row;
  },

  updateProgram(id: string, input: UpdateLenderProgramInput): EnterpriseLenderProgramRecord {
    const bag = readBag();
    const idx = bag.programs.findIndex((p) => p.id === id && !p.isDeleted);
    if (idx < 0) throw new Error("Program not found");
    const prev = bag.programs[idx];
    const next: EnterpriseLenderProgramRecord = {
      ...prev,
      ...input,
      id: prev.id,
      organizationId: prev.organizationId,
      code: prev.code,
      createdBy: prev.createdBy,
      createdAt: prev.createdAt,
      modifiedBy: input.modifiedBy,
      updatedAt: nowIso(),
      versionNumber: prev.versionNumber + 1,
    };
    bag.programs[idx] = next;
    writeBag(bag);
    return next;
  },

  listContacts(lenderId: string) {
    return readBag().contacts.filter((c) => c.lenderId === lenderId && !c.isDeleted);
  },

  replaceContacts(lenderId: string, contacts: CreateLenderContactInput[], actor: string) {
    const bag = readBag();
    const at = nowIso();
    bag.contacts = bag.contacts.map((c) =>
      c.lenderId === lenderId && !c.isDeleted
        ? { ...c, isDeleted: true, updatedAt: at, modifiedBy: actor }
        : c,
    );
    for (const [i, input] of contacts.entries()) {
      bag.contacts.push({
        id: uid("elcontact"),
        organizationId: ORG,
        lenderId,
        name: input.name.trim(),
        designation: input.designation ?? null,
        department: input.department,
        mobile: input.mobile ?? null,
        email: input.email ?? null,
        preferredContactMethod: input.preferredContactMethod ?? null,
        enabled: input.enabled ?? true,
        sortOrder: input.sortOrder ?? i,
        isDeleted: false,
        createdBy: actor,
        modifiedBy: actor,
        createdAt: at,
        updatedAt: at,
      });
    }
    writeBag(bag);
    return this.listContacts(lenderId);
  },

  listDocuments(lenderId: string) {
    return readBag().documents.filter((d) => d.lenderId === lenderId && !d.isDeleted);
  },

  replaceDocuments(lenderId: string, docs: CreateLenderDocumentInput[], actor: string) {
    const bag = readBag();
    const at = nowIso();
    bag.documents = bag.documents.map((d) =>
      d.lenderId === lenderId && !d.isDeleted
        ? { ...d, isDeleted: true, updatedAt: at, modifiedBy: actor }
        : d,
    );
    for (const input of docs) {
      bag.documents.push({
        id: uid("eldoc"),
        organizationId: ORG,
        lenderId,
        kind: input.kind,
        title: input.title.trim(),
        fileName: input.fileName ?? null,
        fileUrl: input.fileUrl ?? null,
        mimeType: input.mimeType ?? null,
        notes: input.notes ?? null,
        enabled: input.enabled ?? true,
        isDeleted: false,
        createdBy: actor,
        modifiedBy: actor,
        createdAt: at,
        updatedAt: at,
      });
    }
    writeBag(bag);
    return this.listDocuments(lenderId);
  },

  exportCsv(lenders: EnterpriseLenderRecord[]) {
    const header = [
      "code",
      "legalName",
      "displayName",
      "shortName",
      "classification",
      "institutionCategory",
      "lifecycleStatus",
      "status",
      "headquarters",
      "website",
      "customerCarePhone",
      "customerCareEmail",
      "panIndia",
      "aliases",
    ];
    const lines = [
      header.join(","),
      ...lenders.map((l) =>
        [
          l.code,
          JSON.stringify(l.legalName ?? l.label),
          JSON.stringify(l.displayName ?? l.label),
          JSON.stringify(l.shortName ?? ""),
          l.classification ?? "",
          l.institutionCategory,
          l.lifecycleStatus,
          l.status,
          JSON.stringify(l.headquartersLabel ?? ""),
          JSON.stringify(l.website ?? ""),
          JSON.stringify(l.customerCarePhone ?? ""),
          JSON.stringify(l.customerCareEmail ?? ""),
          String(l.panIndia),
          JSON.stringify((l.aliases ?? []).join("|")),
        ].join(","),
      ),
    ];
    return lines.join("\n");
  },

  getMasterSeedVersion() {
    return readBag().masterSeedVersion ?? 0;
  },

  setMasterSeedVersion(version: number) {
    const bag = readBag();
    bag.masterSeedVersion = version;
    writeBag(bag);
  },

  getMutableBag() {
    return readBag();
  },

  persistMutableBag(bag: RegistryBag) {
    writeBag(bag);
  },

  /** Detect + merge duplicate lenders; returns merge report. */
  mergeDuplicates(actor: string): LenderMergeReport {
    const bag = readBag();
    const report = applyLenderDuplicateMerges(bag, actor);
    writeBag(bag);
    return report;
  },
};
