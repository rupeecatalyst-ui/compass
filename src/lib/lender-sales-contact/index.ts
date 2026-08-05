/**
 * CO-LR-013 — Lender Sales Contact helpers (ECM Banker enrichment).
 * Progressive capture: min fields at Identify Lender; official email at Disbursal.
 * CO-BUG-LSC-LOOKUP — Search consumes Enterprise Contact Registry (SSOT) via live ECM API.
 */

import {
  isLenderSalesDesignationId,
  lenderSalesDesignationLabel,
  LENDER_SALES_CONTACT_DISBURSAL_EMAIL_MESSAGE,
} from "@/constants/lender-sales-contact";
import { getEcmMasterLabel } from "@/constants/enterprise-contact-master";
import {
  normalizePersonName,
  parseBankerProductsHandled,
} from "@/lib/enterprise-contact-master";
import {
  persistRegisterEcmContact,
  persistUpdateEcmContact,
} from "@/lib/enterprise-persistence/ecm-persist";
import {
  resolveCanonicalProductCode,
} from "@/constants/enterprise-product-master";
import {
  findOperationalEcmContactById,
  liveSearchOperationalEcmContacts,
  searchOperationalContacts,
} from "@/lib/enterprise-registry";
import { ecmApiClient } from "@/lib/enterprise-persistence/ecm-api-client";
import {
  getFallbackProductMasterOptions,
  resolveProductOptionLabel,
} from "@/lib/enterprise-product-master/options";
import type { EcmContact } from "@/types/enterprise-contact-master";

export type LenderSalesContactDraft = {
  lenderId: string;
  lenderName: string;
  name: string;
  mobile: string;
  designationId: string;
  email?: string;
};

export type LenderSalesContactLink = {
  contactId: string;
  contactName: string;
  mobile?: string;
  designationId?: string;
  designationLabel?: string;
  officialEmail?: string;
  institutionId?: string;
  institutionLabel?: string;
  productCodes?: string[];
  productsLabel?: string;
};

export type LenderSalesContactLenderAliases = {
  code?: string | null;
  name?: string | null;
  shortName?: string | null;
  label?: string | null;
};

export type LenderSalesContactSearchInput = {
  lenderId: string;
  query?: string;
  aliases?: LenderSalesContactLenderAliases;
  /** Deal / program product code — soft filter when productsHandled is mapped */
  productCode?: string | null;
  limit?: number;
};

function normalizeKey(raw?: string | null): string {
  return (raw ?? "").trim().toLowerCase();
}

function normalizeMobile(raw: string): string {
  return raw.replace(/\D/g, "");
}

function normalizeEmail(raw?: string): string {
  return (raw ?? "").trim().toLowerCase();
}

function lenderMatchKeys(
  lenderId: string,
  aliases?: LenderSalesContactLenderAliases,
): Set<string> {
  return new Set(
    [
      lenderId,
      aliases?.code,
      aliases?.name,
      aliases?.shortName,
      aliases?.label,
    ]
      .map((x) => normalizeKey(x))
      .filter(Boolean),
  );
}

function contactLenderKeys(contact: EcmContact): string[] {
  const p = contact.roleProfiles?.lender_employee ?? {};
  return [p.institution, p.institutionLabel, p.lenderName]
    .map((x) => normalizeKey(x))
    .filter(Boolean);
}

/**
 * Match Banker → Lender using Contact Registry institution fields.
 * Accepts ELR UUID, legacy codes, and display-name labels (CO-BUG-005 / LSC lookup).
 * Also matches when banker institution label contains / equals lender short name.
 */
export function contactBelongsToLender(
  contact: EcmContact,
  lenderId: string,
  aliases?: LenderSalesContactLenderAliases,
): boolean {
  const id = lenderId.trim();
  if (!id) return false;
  const lenderKeys = lenderMatchKeys(id, aliases);
  if (lenderKeys.size === 0) return false;
  const contactKeys = contactLenderKeys(contact);
  if (contactKeys.some((k) => lenderKeys.has(k))) return true;

  // Fuzzy: "hsbc bank" banker label vs "hsbc" short name / code
  for (const ck of contactKeys) {
    for (const lk of lenderKeys) {
      if (lk.length >= 3 && (ck.includes(lk) || lk.includes(ck))) return true;
    }
  }
  return false;
}

function productMatchTokens(productCode?: string | null): string[] {
  const raw = (productCode ?? "").trim();
  if (!raw) return [];
  const resolved = resolveCanonicalProductCode(raw) || raw;
  const tokens = new Set<string>([raw.toLowerCase(), resolved.toLowerCase()]);
  const label = resolveProductOptionLabel(resolved, getFallbackProductMasterOptions());
  if (label) tokens.add(label.toLowerCase());
  // Compact aliases e.g. "HL" / "home loan"
  for (const t of [...tokens]) {
    tokens.add(t.replace(/[\s_-]+/g, ""));
  }
  return [...tokens];
}

/**
 * Soft product match: true when banker products overlap deal product, OR banker has no mapping yet.
 * Prefer `rankLenderSalesContacts` for list ordering — do not hard-exclude institution peers.
 */
export function contactHandlesProduct(
  contact: EcmContact,
  productCode?: string | null,
): boolean {
  const want = productMatchTokens(productCode);
  if (want.length === 0) return true;
  const handled = parseBankerProductsHandled(
    contact.roleProfiles?.lender_employee?.productsHandled,
  );
  if (handled.length === 0) return true;
  const options = getFallbackProductMasterOptions();
  return handled.some((code) => {
    const resolved = resolveCanonicalProductCode(code) || code;
    const label = resolveProductOptionLabel(resolved, options);
    const hay = [code, resolved, label]
      .map((x) => (x ?? "").toLowerCase())
      .filter(Boolean);
    const compact = hay.map((h) => h.replace(/[\s_-]+/g, ""));
    return want.some((w) => hay.includes(w) || compact.includes(w.replace(/[\s_-]+/g, "")));
  });
}

/** 2 = explicit product match · 1 = no products mapped (progressive) · 0 = mapped but other product */
export function contactProductPriority(
  contact: EcmContact,
  productCode?: string | null,
): number {
  const want = productMatchTokens(productCode);
  if (want.length === 0) return 1;
  const handled = parseBankerProductsHandled(
    contact.roleProfiles?.lender_employee?.productsHandled,
  );
  if (handled.length === 0) return 1;
  return contactHandlesProduct(contact, productCode) ? 2 : 0;
}

function designationSearchLabel(contact: EcmContact): string {
  const id = contact.roleProfiles?.lender_employee?.designation?.trim() || "";
  if (!id) return "";
  return (
    lenderSalesDesignationLabel(id) ||
    getEcmMasterLabel("designation", id) ||
    id
  );
}

function productsSearchBlob(contact: EcmContact): string {
  const codes = parseBankerProductsHandled(
    contact.roleProfiles?.lender_employee?.productsHandled,
  );
  if (codes.length === 0) return "";
  const options = getFallbackProductMasterOptions();
  return codes
    .map((code) => {
      const resolved = resolveCanonicalProductCode(code) || code;
      return `${code} ${resolved} ${resolveProductOptionLabel(resolved, options)}`;
    })
    .join(" ");
}

function matchesNameMobileEmail(contact: EcmContact, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  const hay = [
    contact.name,
    contact.mobilePrimary,
    contact.officialEmail,
    contact.personalEmail,
    contact.roleProfiles?.lender_employee?.officialMobile,
    contact.roleProfiles?.lender_employee?.officialEmail,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (hay.includes(q)) return true;
  if (digits.length >= 3) {
    const mobiles = [
      contact.mobilePrimary,
      contact.roleProfiles?.lender_employee?.officialMobile,
    ]
      .map((m) => normalizeMobile(m || ""))
      .filter(Boolean);
    if (mobiles.some((m) => m.includes(digits))) return true;
  }
  return false;
}

function matchesQuery(contact: EcmContact, query: string): boolean {
  if (matchesNameMobileEmail(contact, query)) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  // Secondary: designation / institution / products (browse assist)
  const hay = [
    designationSearchLabel(contact),
    contact.roleProfiles?.lender_employee?.institutionLabel,
    contact.roleProfiles?.lender_employee?.lenderName,
    productsSearchBlob(contact),
    contact.roleProfiles?.lender_employee?.employeeCode,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (hay.includes(q)) return true;
  const compactQ = q.replace(/[\s_-]+/g, "");
  if (compactQ.length >= 2 && hay.replace(/[\s_-]+/g, "").includes(compactQ)) {
    return true;
  }
  return false;
}

function listBankerContacts(): EcmContact[] {
  return searchOperationalContacts("", { roles: ["lender_employee"] })
    .map((r) => findOperationalEcmContactById(r.id))
    .filter((c): c is EcmContact => Boolean(c))
    .filter((c) => c.status !== "archived" && c.enabled !== false);
}

/**
 * Institution-scoped banker list:
 * 1) Prefer contacts belonging to selected lender
 * 2) Match typed query (name / mobile / email primary)
 * 3) Soft-rank by product — never hard-exclude other institution contacts
 * 4) Progressive: when typing, also allow bankers with no institution mapping yet
 */
export function filterBankersForLender(
  pool: EcmContact[],
  input: LenderSalesContactSearchInput,
): EcmContact[] {
  const lenderId = input.lenderId.trim();
  if (!lenderId) return [];
  const limit = input.limit ?? 12;
  const q = (input.query ?? "").trim();
  const typed = q.length >= 2;

  const filtered = pool
    .filter((c) => c.status !== "archived" && c.enabled !== false)
    .filter((c) => {
      const belongs = contactBelongsToLender(c, lenderId, input.aliases);
      if (belongs) return matchesQuery(c, q);
      // Progressive capture: incomplete Banker profiles (no institution yet)
      // still resolve on name/mobile/email search — ranked below institution peers.
      if (typed && contactLenderKeys(c).length === 0 && matchesNameMobileEmail(c, q)) {
        return true;
      }
      return false;
    });

  filtered.sort((a, b) => {
    const ba = contactBelongsToLender(a, lenderId, input.aliases) ? 1 : 0;
    const bb = contactBelongsToLender(b, lenderId, input.aliases) ? 1 : 0;
    if (bb !== ba) return bb - ba;
    const pa = contactProductPriority(a, input.productCode);
    const pb = contactProductPriority(b, input.productCode);
    if (pb !== pa) return pb - pa;
    return a.name.localeCompare(b.name);
  });

  return filtered.slice(0, limit);
}

export function validateLenderSalesContactCreate(
  draft: Partial<LenderSalesContactDraft>,
): string | null {
  if (!draft.lenderId?.trim()) return "Lender is mandatory.";
  if (!normalizePersonName(draft.name ?? "")) return "Contact Person Name is mandatory.";
  const mobile = normalizeMobile(draft.mobile ?? "");
  if (mobile.length < 10) return "Mobile Number is mandatory (10 digits).";
  if (!isLenderSalesDesignationId(draft.designationId)) {
    return "Sales Designation is mandatory.";
  }
  return null;
}

export function findLenderSalesContactDuplicates(input: {
  lenderId: string;
  name: string;
  mobile: string;
  email?: string;
  aliases?: LenderSalesContactLenderAliases;
}): EcmContact[] {
  const mobile = normalizeMobile(input.mobile);
  const email = normalizeEmail(input.email);
  const nameKey = normalizePersonName(input.name).toLowerCase();
  const pool = listBankerContacts();

  const matches: EcmContact[] = [];
  for (const c of pool) {
    const cMobile = normalizeMobile(c.mobilePrimary || "");
    const cEmail = normalizeEmail(c.officialEmail || c.personalEmail);
    const cName = normalizePersonName(c.name).toLowerCase();
    const sameMobile = mobile.length >= 10 && cMobile === mobile;
    const sameEmail = Boolean(email) && cEmail === email;
    const sameNameLender =
      Boolean(nameKey) &&
      cName === nameKey &&
      contactBelongsToLender(c, input.lenderId, input.aliases);
    if (sameMobile || sameEmail || sameNameLender) {
      matches.push(c);
    }
  }

  return [
    ...matches.filter((c) => contactBelongsToLender(c, input.lenderId, input.aliases)),
    ...matches.filter((c) => !contactBelongsToLender(c, input.lenderId, input.aliases)),
  ].filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
}

/** Sync memory search — prefer `searchLenderSalesContactsLive` in UI. */
export function searchLenderSalesContacts(
  lenderId: string,
  query: string,
  aliases?: LenderSalesContactLenderAliases,
  productCode?: string | null,
): EcmContact[] {
  return filterBankersForLender(listBankerContacts(), {
    lenderId,
    query,
    aliases,
    productCode,
  });
}

/**
 * Live ECM Contact Registry search (SSOT) — one/two bounded requests, never full-table crawl.
 *
 * Browse (empty query): institution-scoped page only.
 * Typed search: institution-scoped + role-scoped name/mobile/email page (for incomplete profiles).
 * Product soft-rank remains client-side on the small result set.
 */
export async function searchLenderSalesContactsLive(
  input: LenderSalesContactSearchInput,
): Promise<EcmContact[]> {
  const lenderId = input.lenderId.trim();
  if (!lenderId) return [];

  const userQuery = (input.query ?? "").trim();
  const institutionKeys = [...lenderMatchKeys(lenderId, input.aliases)].filter(Boolean);
  const pageSize = Math.min(Math.max(input.limit ?? 25, 12), 50);

  const scoped = ecmApiClient.queryContacts({
    search: userQuery || undefined,
    page: 1,
    pageSize,
    status: "all",
    sortBy: "name",
    sortDir: "asc",
    roles: ["lender_employee"],
    institutionKeys,
    skipTotal: true,
  });

  const named =
    userQuery.length >= 2
      ? ecmApiClient.queryContacts({
          search: userQuery,
          page: 1,
          pageSize: 25,
          status: "all",
          sortBy: "name",
          sortDir: "asc",
          roles: ["lender_employee"],
          skipTotal: true,
        })
      : Promise.resolve({ items: [] as EcmContact[], total: 0, page: 1, pageSize: 25 });

  const [scopedResult, namedResult] = await Promise.all([scoped, named]);

  const byId = new Map<string, EcmContact>();
  for (const c of [...(scopedResult.items ?? []), ...(namedResult.items ?? [])]) {
    if (c.status === "archived" || c.enabled === false) continue;
    byId.set(c.id, c);
  }

  return filterBankersForLender([...byId.values()], {
    ...input,
    query: userQuery,
    limit: input.limit ?? 12,
  });
}

/** Live duplicate detection against Enterprise Contact Registry. */
export async function findLenderSalesContactDuplicatesLive(input: {
  lenderId: string;
  name: string;
  mobile: string;
  email?: string;
  aliases?: LenderSalesContactLenderAliases;
}): Promise<EcmContact[]> {
  const mobile = normalizeMobile(input.mobile);
  const email = normalizeEmail(input.email);
  const nameKey = normalizePersonName(input.name).toLowerCase();
  const searches = [input.name, mobile, email].filter((x) => Boolean(x?.trim()));
  const pool = new Map<string, EcmContact>();
  for (const q of searches.length ? searches : [""]) {
    const rows = await liveSearchOperationalEcmContacts(q, {
      pageSize: 100,
      roles: ["lender_employee"],
    });
    for (const c of rows) pool.set(c.id, c);
  }
  // Live institution-scoped pool (no full-table banker pagination)
  const liveBankers = await ecmApiClient
    .queryContacts({
      page: 1,
      pageSize: 100,
      status: "all",
      roles: ["lender_employee"],
      institutionKeys: [
        input.lenderId,
        input.aliases?.code,
        input.aliases?.name,
        input.aliases?.shortName,
        input.aliases?.label,
      ].filter((x): x is string => Boolean(x?.trim())),
      skipTotal: true,
    })
    .then((r) => r.items)
    .catch(() => [] as EcmContact[]);
  for (const c of liveBankers) pool.set(c.id, c);

  const matches: EcmContact[] = [];
  for (const c of pool.values()) {
    const cMobile = normalizeMobile(c.mobilePrimary || "");
    const cEmail = normalizeEmail(c.officialEmail || c.personalEmail);
    const cName = normalizePersonName(c.name).toLowerCase();
    const sameMobile = mobile.length >= 10 && cMobile === mobile;
    const sameEmail = Boolean(email) && cEmail === email;
    const sameNameLender =
      Boolean(nameKey) &&
      cName === nameKey &&
      contactBelongsToLender(c, input.lenderId, input.aliases);
    if (sameMobile || sameEmail || sameNameLender) {
      matches.push(c);
    }
  }

  return [
    ...matches.filter((c) => contactBelongsToLender(c, input.lenderId, input.aliases)),
    ...matches.filter((c) => !contactBelongsToLender(c, input.lenderId, input.aliases)),
  ].filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
}

export function toLenderSalesContactLink(contact: EcmContact): LenderSalesContactLink {
  const profile = contact.roleProfiles?.lender_employee ?? {};
  const designationId = profile.designation?.trim() || undefined;
  const productCodes = parseBankerProductsHandled(profile.productsHandled);
  const options = getFallbackProductMasterOptions();
  const productsLabel = productCodes
    .map((code) => {
      const resolved = resolveCanonicalProductCode(code) || code;
      return resolveProductOptionLabel(resolved, options) || code;
    })
    .filter(Boolean)
    .join(", ");

  return {
    contactId: contact.id,
    contactName: contact.name,
    mobile:
      contact.mobilePrimary ||
      profile.officialMobile?.trim() ||
      undefined,
    designationId,
    designationLabel:
      lenderSalesDesignationLabel(designationId) ||
      (designationId ? getEcmMasterLabel("designation", designationId) : undefined) ||
      designationId,
    officialEmail:
      contact.officialEmail?.trim() ||
      profile.officialEmail?.trim() ||
      undefined,
    institutionId: profile.institution?.trim() || undefined,
    institutionLabel:
      profile.institutionLabel?.trim() ||
      profile.lenderName?.trim() ||
      undefined,
    productCodes: productCodes.length ? productCodes : undefined,
    productsLabel: productsLabel || undefined,
  };
}

export function formatLenderSalesContactResultLine(contact: EcmContact): {
  title: string;
  subtitle: string;
} {
  const link = toLenderSalesContactLink(contact);
  const subtitle = [
    link.designationLabel,
    link.institutionLabel,
    link.productsLabel,
    link.mobile,
  ]
    .filter(Boolean)
    .join(" · ");
  return { title: link.contactName, subtitle };
}

export async function createLenderSalesContact(
  draft: LenderSalesContactDraft,
  actorId = "ui",
): Promise<EcmContact> {
  const error = validateLenderSalesContactCreate(draft);
  if (error) throw new Error(error);

  const name = normalizePersonName(draft.name);
  const mobile = normalizeMobile(draft.mobile);
  const email = draft.email?.trim() || undefined;
  const designationId = draft.designationId.trim();

  const duplicates = await findLenderSalesContactDuplicatesLive({
    lenderId: draft.lenderId,
    name,
    mobile,
    email,
    aliases: { name: draft.lenderName },
  });
  if (duplicates[0]) {
    throw Object.assign(
      new Error("A matching Sales Contact already exists. Use Existing Contact."),
      { code: "DUPLICATE_SALES_CONTACT", contact: duplicates[0] },
    );
  }

  const roleProfiles = {
    lender_employee: {
      institution: draft.lenderId,
      institutionLabel: draft.lenderName,
      designation: designationId,
      officialMobile: mobile,
      ...(email ? { officialEmail: email } : {}),
      lenderName: draft.lenderName,
    },
  };

  return persistRegisterEcmContact({
    name,
    mobilePrimary: mobile,
    officialEmail: email,
    personalEmail: email,
    roles: ["lender_employee"],
    primaryRole: "lender_employee",
    roleProfiles,
    createdBy: actorId,
    ownerName: "Platform Admin",
  });
}

export function salesContactHasOfficialEmail(contact: EcmContact | null | undefined): boolean {
  if (!contact) return false;
  const email =
    contact.officialEmail?.trim() ||
    contact.roleProfiles?.lender_employee?.officialEmail?.trim() ||
    "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function enrichLenderSalesContactOfficialEmail(
  contactId: string,
  officialEmail: string,
  actorId = "ui",
): Promise<EcmContact> {
  const email = officialEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(LENDER_SALES_CONTACT_DISBURSAL_EMAIL_MESSAGE);
  }

  const existing = findOperationalEcmContactById(contactId);
  const nextProfile = {
    ...(existing?.roleProfiles?.lender_employee ?? {}),
    officialEmail: email,
  };

  return persistUpdateEcmContact(
    contactId,
    {
      officialEmail: email,
      roleProfiles: {
        ...(existing?.roleProfiles ?? {}),
        lender_employee: nextProfile,
      },
    },
    actorId,
  );
}

export { LENDER_SALES_CONTACT_DISBURSAL_EMAIL_MESSAGE };
