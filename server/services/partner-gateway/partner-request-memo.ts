/**
 * CO-WP-PERF-002 — Request-scoped memo for Partner Gateway hot paths.
 * Same HTTP request only — does not change entitlement/ownership rules.
 */
import { AsyncLocalStorage } from "node:async_hooks";

type MemoStore = {
  bindings: Map<string, Promise<unknown>>;
  entitlements: Map<string, Promise<unknown>>;
  templates: Map<string, Promise<unknown>>;
  pipelines: Map<string, Promise<unknown>>;
};

const als = new AsyncLocalStorage<MemoStore>();

export function runWithPartnerRequestMemo<T>(fn: () => Promise<T>): Promise<T> {
  return als.run(
    {
      bindings: new Map(),
      entitlements: new Map(),
      templates: new Map(),
      pipelines: new Map(),
    },
    fn,
  );
}

function memoGetSet<T>(
  bucket: keyof MemoStore,
  key: string,
  factory: () => Promise<T>,
): Promise<T> {
  const store = als.getStore();
  if (!store) return factory();
  const map = store[bucket];
  const existing = map.get(key);
  if (existing) return existing as Promise<T>;
  const created = factory();
  map.set(key, created);
  return created;
}

export function memoPartnerBinding<T>(userId: string, factory: () => Promise<T>): Promise<T> {
  return memoGetSet("bindings", userId, factory);
}

export function memoPartnerEntitlements<T>(
  key: string,
  factory: () => Promise<T>,
): Promise<T> {
  return memoGetSet("entitlements", key, factory);
}

export function memoPartnerTemplates<T>(
  organizationId: string,
  factory: () => Promise<T>,
): Promise<T> {
  return memoGetSet("templates", organizationId, factory);
}

export function memoPartnerPipeline<T>(
  partnerId: string,
  factory: () => Promise<T>,
): Promise<T> {
  return memoGetSet("pipelines", partnerId, factory);
}
