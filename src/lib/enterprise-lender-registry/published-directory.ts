/**
 * CO-ARCH-004 / CO-LENDER-SSOT-REMEDIATE-001 — Published lender directory SSOT.
 *
 * Published (business visibility) = status active + enabled + lifecycleStatus active
 *   (+ operationalStatus active when present).
 *
 * Selection / Deal / Partner paths use Enterprise Lender Registry API (Prisma) ONLY.
 * Soft Go-Live localStorage is not a selection source of truth.
 */
import {
  subscribeLenderRegistryUpdated,
} from "@/lib/enterprise-lender-registry/local-store";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  getPublishedLendersInflight,
  peekPublishedLendersSession,
  putPublishedLendersSession,
  setPublishedLendersInflight,
  invalidatePublishedLendersSession,
} from "@/lib/enterprise-session/published-lenders-session";
import { dedupeLendersForSelection } from "@/lib/enterprise-lender-registry/presentation-canonical";

let lenderInvalidateWired = false;
function wireLenderSessionInvalidation(): void {
  if (lenderInvalidateWired || typeof window === "undefined") return;
  lenderInvalidateWired = true;
  subscribeLenderRegistryUpdated(() => invalidatePublishedLendersSession());
}

export interface PublishedLenderOption {
  /** Prefer Prisma/API id when available — store on Deal.lenderId */
  id: string;
  code: string;
  displayName: string;
  legalName: string;
  shortName?: string | null;
  classification?: string | null;
  institutionCategory: string;
  website?: string | null;
  /** CO-LW-005 — Official logo / brand asset from Lender Registry. */
  logoUrl?: string | null;
  /** CO-LW-005 — Marketing brand name (defaults to displayName). */
  brandName?: string | null;
  headquartersLabel?: string | null;
  customerCarePhone?: string | null;
  customerCareEmail?: string | null;
  aliases?: string[];
  /** Master seed key when known (e.g. bob) — stable across Soft Go-Live ↔ Prisma */
  seedKey?: string | null;
  /** Soft Go-Live id when different from API id */
  localId?: string | null;
  source: "api" | "local" | "merged";
  published: true;
  active: true;
}

/** Published ∧ Active gate (single visibility rule). */
export function isLenderPublishedAndActive(
  lender: Pick<
    EnterpriseLenderRecord,
    "status" | "enabled" | "lifecycleStatus" | "operationalStatus" | "isDeleted"
  >,
): boolean {
  if (lender.isDeleted) return false;
  if (lender.status !== "active") return false;
  if (!lender.enabled) return false;
  if (lender.lifecycleStatus !== "active") return false;
  if (lender.operationalStatus && lender.operationalStatus !== "active") return false;
  return true;
}

/** Soft Go-Live browser ids are never valid Deal.lenderId FKs (Prisma EnterpriseLender). */
export function isSoftGoLiveLenderId(id: string | null | undefined): boolean {
  const v = (id || "").trim().toLowerCase().replace(/^lender:/, "");
  if (!v) return false;
  return (
    v.startsWith("elend") ||
    v.startsWith("elprog") ||
    v.startsWith("elcat") ||
    v.startsWith("local-") ||
    v.startsWith("uid_")
  );
}

/** CO-BUG-011 — Backfill / provisional BF_* codes are not selectable for new Deals. */
export function isProvisionalBfLenderCode(code: string | null | undefined): boolean {
  return /^bf[_-]/i.test((code || "").trim());
}

export function isProvisionalBfLenderOption(opt: PublishedLenderOption): boolean {
  return (
    isProvisionalBfLenderCode(opt.code) ||
    isProvisionalBfLenderCode(opt.seedKey) ||
    isProvisionalBfLenderCode(opt.displayName)
  );
}

/**
 * Constitutional Deal-eligible lender:
 * - Prisma Enterprise Lender Registry primary key (not Soft Go-Live)
 * - Not provisional BF_* backfill
 * - API-sourced (never Soft Go-Live-only / never merged local placeholder)
 */
export function isCanonicalDealLenderOption(opt: PublishedLenderOption): boolean {
  if (!opt?.id || isSoftGoLiveLenderId(opt.id)) return false;
  if (isProvisionalBfLenderOption(opt)) return false;
  if (opt.source !== "api") return false;
  return true;
}

/** @deprecated Prefer isCanonicalDealLenderOption (CO-BUG-011). */
export function isPersistedDealLenderOption(opt: PublishedLenderOption): boolean {
  if (!opt?.id || isSoftGoLiveLenderId(opt.id)) return false;
  if (isProvisionalBfLenderOption(opt)) return false;
  if (opt.source === "local") return false;
  return opt.source === "api" || opt.source === "merged";
}

/** Collapse for identity matching (Bank of Baroda ≈ bankofbaroda ≈ BOB). */
export function normalizeLenderIdentity(value: string | null | undefined): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/^lender:/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** Strip legal suffixes so "HDFC Bank" ↔ code "HDFC", "BF_AU_…" ↔ "AU". */
function coreLenderToken(value: string | null | undefined): string {
  let n = normalizeLenderIdentity(value);
  if (!n) return "";
  if (n.startsWith("bf")) n = n.slice(2);
  if (n.startsWith("lnd")) n = n.replace(/^lnd[a-z0-9]*/, "");
  return n
    .replace(/smallfinance/g, "")
    .replace(/housingfinance/g, "")
    .replace(/cooperative/g, "")
    .replace(/ofindia/g, "")
    .replace(/bank/g, "")
    .replace(/limited/g, "")
    .replace(/ltd/g, "")
    .replace(/finance/g, "")
    .replace(/nbfc/g, "")
    .replace(/india/g, "");
}

function seedKeyFromTags(tags?: string[] | null): string | null {
  for (const t of tags ?? []) {
    if (t.startsWith("seed:")) return t.slice(5).trim() || null;
  }
  return null;
}

function toOption(
  lender: EnterpriseLenderRecord,
  source: "api" | "local",
): PublishedLenderOption {
  const seedKey = seedKeyFromTags(lender.tags as string[] | null | undefined);
  return {
    id: lender.id,
    code: lender.code,
    displayName: lender.displayName || lender.label,
    legalName: lender.legalName || lender.label,
    shortName: lender.shortName,
    classification: lender.classification,
    institutionCategory: lender.institutionCategory,
    website: lender.website,
    logoUrl: lender.logoUrl ?? null,
    brandName: lender.displayName || lender.label,
    headquartersLabel: lender.headquartersLabel,
    customerCarePhone: lender.customerCarePhone,
    customerCareEmail: lender.customerCareEmail,
    aliases: Array.isArray(lender.aliases) ? (lender.aliases as string[]) : [],
    seedKey,
    localId: source === "local" ? lender.id : null,
    source,
    published: true,
    active: true,
  };
}

function identityKeys(opt: PublishedLenderOption): string[] {
  const raw = [
    opt.id,
    opt.localId,
    opt.code,
    opt.seedKey,
    opt.shortName,
    opt.displayName,
    opt.legalName,
    ...(opt.aliases ?? []),
  ];
  const keys = new Set<string>();
  for (const v of raw) {
    const full = normalizeLenderIdentity(v || "");
    if (full) keys.add(full);
    const core = coreLenderToken(v || "");
    if (core && core.length >= 2) keys.add(core);
  }
  return Array.from(keys);
}

async function listApiPublished(search?: string): Promise<PublishedLenderOption[]> {
  const q = search?.trim();
  const params = new URLSearchParams({
    page: "1",
    pageSize: "5000",
    status: "active",
    enabled: "true",
    lifecycleStatus: "active",
  });
  if (q) params.set("search", q);
  const res = await authenticatedJsonFetch(`/api/lender-registry/lenders?${params}`);
  if (res.status === 401) {
    throw new Error("Session expired. Sign in again to search the Enterprise Lender Registry.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; code?: string };
    };
    throw new Error(
      body.error?.message ||
        `Enterprise Lender Registry unavailable (${res.status}${
          body.error?.code ? ` · ${body.error.code}` : ""
        }).`,
    );
  }
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { items?: EnterpriseLenderRecord[]; total?: number };
    error?: { message?: string };
  };
  if (!body.success || !Array.isArray(body.data?.items)) {
    throw new Error(
      body.error?.message || "Enterprise Lender Registry returned an invalid response.",
    );
  }
  return body.data.items
    .filter(isLenderPublishedAndActive)
    .map((l) => toOption(l, "api"));
}

/**
 * Sync published lenders — API session cache only.
 * Soft Go-Live is NOT a selection source (CO-LENDER-SSOT-REMEDIATE-001).
 * Prefer listPublishedLenderOptionsAsync / listCanonicalEnterpriseLenderOptionsAsync.
 */
export function listPublishedLenderOptions(): PublishedLenderOption[] {
  wireLenderSessionInvalidation();
  const warm = peekPublishedLendersSession();
  if (warm && warm.length > 0) return warm;
  return [];
}

/**
 * CO-LENDER-SSOT-REMEDIATE-001 — Published lenders from Enterprise Lender Registry API only.
 * No Soft Go-Live merge. Throws when the registry is unavailable.
 */
export async function listPublishedLenderOptionsAsync(
  search?: string,
): Promise<PublishedLenderOption[]> {
  wireLenderSessionInvalidation();

  const warm = peekPublishedLendersSession(search);
  if (warm) return warm;

  const pending = getPublishedLendersInflight(search);
  if (pending) return pending;

  const request = (async () => {
    const apiOpts = await listApiPublished(search);
    const sorted = apiOpts.sort((a, b) => a.displayName.localeCompare(b.displayName));
    putPublishedLendersSession(sorted, search);
    return sorted;
  })();

  return setPublishedLendersInflight(search, request);
}

/**
 * CO-BUG-011 — Canonical lenders for Deal creation / Manual Recommendation.
 * Source of truth: Enterprise Lender Registry API (Prisma) ONLY.
 * Never Soft Go-Live, never BF_* provisional, never display-only names.
 */
export async function listCanonicalEnterpriseLenderOptionsAsync(
  search?: string,
): Promise<PublishedLenderOption[]> {
  const apiOpts = await listApiPublished(search);
  // CO-LR-008 — presentation canonicalisation only (preserve survivor Registry ids).
  const canonical = dedupeLendersForSelection(
    apiOpts
      .filter(isCanonicalDealLenderOption)
      .map((o) => ({
        ...o,
        label: (o.displayName || o.code || "").trim() || o.id,
        displayName: (o.displayName || o.code || "").trim() || o.id,
        legalName: (o.legalName || o.displayName || o.code || "").trim() || o.id,
        source: "api" as const,
      })),
  );
  return canonical
    .map((o) => ({
      ...o,
      displayName: (o.displayName || o.code || "").trim() || o.id,
      legalName: (o.legalName || o.displayName || o.code || "").trim() || o.id,
      source: "api" as const,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function listPublishedLenderDisplayNames(): string[] {
  return listPublishedLenderOptions().map((l) => l.displayName);
}

export async function listPublishedLenderDisplayNamesAsync(
  search?: string,
): Promise<string[]> {
  return (await listPublishedLenderOptionsAsync(search)).map((l) => l.displayName);
}

/** Canonical shortlist ref — always lender:{enterpriseId} for Deal FK continuity. */
export function buildCanonicalLenderRef(opt: PublishedLenderOption): string {
  return `lender:${opt.id}`;
}

/**
 * Resolve shortlist / search token to a Published option.
 * Matches id, localId, code, seedKey, shortName, display/legal names, aliases.
 */
export function resolvePublishedLenderOption(
  refOrName: string | null | undefined,
  options?: PublishedLenderOption[],
): PublishedLenderOption | null {
  const raw = (refOrName || "").trim();
  if (!raw) return null;
  const pool = options ?? listPublishedLenderOptions();
  const needle = normalizeLenderIdentity(raw);
  if (!needle) return null;

  for (const opt of pool) {
    const keys = identityKeys(opt);
    if (keys.includes(needle)) return opt;
    const core = coreLenderToken(raw);
    if (core && core.length >= 2 && keys.includes(core)) return opt;
  }
  return null;
}

export function findPublishedLenderByDisplayName(
  name: string,
  options?: PublishedLenderOption[],
): PublishedLenderOption | null {
  return resolvePublishedLenderOption(name, options);
}

export function resolvePublishedEnterpriseLenderId(
  refOrName: string | null | undefined,
  options?: PublishedLenderOption[],
): string | null {
  return resolvePublishedLenderOption(refOrName, options)?.id ?? null;
}

/** Resolve Execution Queue item (ref + name + optional stored id/code). */
export function resolveShortlistToPublishedLender(
  item: {
    lenderRef?: string | null;
    lenderName?: string | null;
    enterpriseLenderId?: string | null;
    lenderCode?: string | null;
  },
  options: PublishedLenderOption[],
): PublishedLenderOption | null {
  if (item.enterpriseLenderId) {
    const byStored = options.find(
      (o) =>
        o.id === item.enterpriseLenderId ||
        o.localId === item.enterpriseLenderId,
    );
    if (byStored) return byStored;
    const byStoredFuzzy = resolvePublishedLenderOption(
      item.enterpriseLenderId,
      options,
    );
    if (byStoredFuzzy) return byStoredFuzzy;
  }
  if (item.lenderCode) {
    const byCode = resolvePublishedLenderOption(item.lenderCode, options);
    if (byCode) return byCode;
  }
  return (
    resolvePublishedLenderOption(item.lenderRef, options) ||
    resolvePublishedLenderOption(item.lenderName, options)
  );
}

/**
 * CO-BUG-010 — Resolve a lender that is safe for EnterpriseDeal.lenderId (Prisma FK).
 * Soft Go-Live `elend-*` / local-only options are never returned.
 */
export async function resolvePersistedLenderForDeal(
  item: {
    lenderRef?: string | null;
    lenderName?: string | null;
    enterpriseLenderId?: string | null;
    lenderCode?: string | null;
  },
  options?: PublishedLenderOption[],
): Promise<PublishedLenderOption | null> {
  // CO-BUG-011 — Resolve only against canonical Prisma registry options.
  const pool =
    options?.filter(isCanonicalDealLenderOption) ??
    (await listCanonicalEnterpriseLenderOptionsAsync());

  if (item.enterpriseLenderId && isSoftGoLiveLenderId(item.enterpriseLenderId)) {
    // Soft Go-Live id — try remap by name/code against canonical pool only.
  } else if (item.enterpriseLenderId) {
    const byId = pool.find((o) => o.id === item.enterpriseLenderId);
    if (byId && isCanonicalDealLenderOption(byId)) return byId;
  }

  const primary = resolveShortlistToPublishedLender(item, pool);
  if (primary && isCanonicalDealLenderOption(primary)) return primary;

  const searchTerms = [
    item.lenderCode,
    primary?.code,
    item.lenderName,
    primary?.displayName,
    item.lenderRef?.replace(/^lender:/i, ""),
  ]
    .map((s) => (s || "").trim())
    .filter(Boolean);

  for (const term of searchTerms) {
    if (isSoftGoLiveLenderId(term) || isProvisionalBfLenderCode(term)) continue;
    const apiHits = (await listApiPublished(term)).filter(isCanonicalDealLenderOption);
    if (apiHits.length === 0) continue;
    const hit =
      resolveShortlistToPublishedLender(item, apiHits) ||
      resolvePublishedLenderOption(term, apiHits) ||
      apiHits[0];
    if (hit && isCanonicalDealLenderOption(hit)) return hit;
  }

  return null;
}
