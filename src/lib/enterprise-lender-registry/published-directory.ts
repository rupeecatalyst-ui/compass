/**
 * CO-ARCH-004 / CO-LENDER-ARCH-001 / CO-LENDER-ARCH-002 — Published lender directory SSOT.
 *
 * Published (business visibility) = status active + enabled + lifecycleStatus active
 *   (+ operationalStatus active when present).
 *
 * Soft Go-Live (browser) and Prisma API may assign different primary keys for the same
 * master lender. Selection + Move to Deal MUST merge both and resolve by canonical
 * identity (code / seed key / name / aliases), preferring the API id for Deal.lenderId FK.
 */
import {
  localLenderRegistryStore,
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
import { ensureLenderMasterBootstrapped } from "@/lib/enterprise-lender-registry/bootstrap-master";

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

function optionsOverlap(a: PublishedLenderOption, b: PublishedLenderOption): boolean {
  const aKeys = new Set(identityKeys(a));
  return identityKeys(b).some((k) => aKeys.has(k));
}

/**
 * Prefer API row for Deal FK; keep Soft Go-Live fields when richer.
 */
function mergeOptions(
  apiOpts: PublishedLenderOption[],
  localOpts: PublishedLenderOption[],
): PublishedLenderOption[] {
  const merged: PublishedLenderOption[] = [];
  const usedLocal = new Set<string>();

  for (const api of apiOpts) {
    const local = localOpts.find((l) => optionsOverlap(api, l));
    if (local) {
      usedLocal.add(local.id);
      merged.push({
        ...api,
        source: "merged",
        localId: local.id,
        seedKey: api.seedKey || local.seedKey,
        aliases: Array.from(
          new Set([...(api.aliases ?? []), ...(local.aliases ?? []), local.code]),
        ),
        shortName: api.shortName || local.shortName,
        website: api.website || local.website,
        headquartersLabel: api.headquartersLabel || local.headquartersLabel,
      });
    } else {
      merged.push(api);
    }
  }

  for (const local of localOpts) {
    if (usedLocal.has(local.id)) continue;
    if (merged.some((m) => optionsOverlap(m, local))) continue;
    merged.push(local);
  }

  return merged.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function publishedQuery() {
  return {
    pageSize: 5000 as const,
    status: "active" as const,
    enabled: true,
    lifecycleStatus: "active" as const,
  };
}

function listLocalPublished(search?: string): PublishedLenderOption[] {
  if (typeof window !== "undefined") {
    ensureLenderMasterBootstrapped();
  }
  const { items } = localLenderRegistryStore.queryLenders({
    ...publishedQuery(),
    pageSize: 5000,
    search: search?.trim() || undefined,
  });
  return items.filter(isLenderPublishedAndActive).map((l) => toOption(l, "local"));
}

async function listApiPublished(search?: string): Promise<PublishedLenderOption[]> {
  const q = search?.trim();
  const params = new URLSearchParams({
    page: "1",
    pageSize: "500",
    status: "active",
    enabled: "true",
    lifecycleStatus: "active",
  });
  if (q) params.set("search", q);
  try {
    const res = await authenticatedJsonFetch(`/api/lender-registry/lenders?${params}`);
    if (!res.ok) return [];
    const body = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { items?: EnterpriseLenderRecord[] };
    };
    if (!body.success || !Array.isArray(body.data?.items)) return [];
    return body.data.items
      .filter(isLenderPublishedAndActive)
      .map((l) => toOption(l, "api"));
  } catch {
    return [];
  }
}

/** Sync Soft Go-Live published lenders — prefers warm Enterprise Session snapshot. */
export function listPublishedLenderOptions(): PublishedLenderOption[] {
  wireLenderSessionInvalidation();
  const warm = peekPublishedLendersSession();
  if (warm && warm.length > 0) return warm;
  return listLocalPublished().sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}

/**
 * CO-LENDER-ARCH-002 / CO-ARCH-002 — Union of API + Soft Go-Live Published lenders.
 * Session-cached (TTL) + single-flight per search key.
 *
 * Do NOT use for Manual Recommendation / Move to Deal selection UI (CO-BUG-011).
 * Those must call listCanonicalEnterpriseLenderOptionsAsync (API / Prisma only).
 */
export async function listPublishedLenderOptionsAsync(
  search?: string,
): Promise<PublishedLenderOption[]> {
  wireLenderSessionInvalidation();
  if (typeof window !== "undefined") {
    ensureLenderMasterBootstrapped();
  }

  const warm = peekPublishedLendersSession(search);
  if (warm) return warm;

  const pending = getPublishedLendersInflight(search);
  if (pending) return pending;

  const request = (async () => {
    const [apiOpts, localOpts] = await Promise.all([
      listApiPublished(search),
      Promise.resolve(listLocalPublished(search)),
    ]);
    let merged: PublishedLenderOption[];
    if (apiOpts.length === 0) {
      merged = localOpts.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } else if (localOpts.length === 0) {
      merged = apiOpts.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } else {
      merged = mergeOptions(apiOpts, localOpts);
    }
    putPublishedLendersSession(merged, search);
    return merged;
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
  return apiOpts
    .filter(isCanonicalDealLenderOption)
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
