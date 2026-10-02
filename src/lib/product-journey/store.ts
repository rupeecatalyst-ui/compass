import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { JourneyDraft, PublishedJourneyDefinition } from "@/lib/product-journey/publication";

/**
 * Durable product-journey port.
 * The runtime authority is the Prisma store. A file store exists only so local
 * proofs can restart a process without using the production database.
 */

export type JourneyAuditRecord = {
  action: string;
  productCode: string;
  version: number | null;
  previousVersion: number | null;
  actorId: string;
  validationResult: string;
  configurationHash: string | null;
  at: string;
};

export type JourneyBook = {
  organizationId: string;
  productCode: string;
  bookRevision: number;
  draft: JourneyDraft | null;
  versions: PublishedJourneyDefinition[];
  effectiveVersion: number | null;
  publiclyEnabled: boolean;
  audits: JourneyAuditRecord[];
};

export class ProductJourneyStoreError extends Error {
  code: "STORE_UNAVAILABLE" | "JOURNEY_CONFLICT";

  constructor(code: "STORE_UNAVAILABLE" | "JOURNEY_CONFLICT", message: string) {
    super(message);
    this.code = code;
  }
}

export interface ProductJourneyStore {
  read(organizationId: string, productCode: string): Promise<JourneyBook | null>;
  compareAndSwap(
    organizationId: string,
    productCode: string,
    expectedRevision: number,
    next: JourneyBook,
  ): Promise<void>;
}

const stores = new Map<string, ProductJourneyStore>();
let activeKey = "prisma";

export function configureProductJourneyStore(key: string, store: ProductJourneyStore): void {
  stores.set(key, store);
  activeKey = key;
}

export function useProductJourneyStore(key: string): void {
  if (!stores.has(key)) {
    throw new ProductJourneyStoreError("STORE_UNAVAILABLE", "The product journey store is not configured.");
  }
  activeKey = key;
}

export async function getProductJourneyStore(): Promise<ProductJourneyStore> {
  const existing = stores.get(activeKey);
  if (existing) return existing;
  if (activeKey !== "prisma") {
    throw new ProductJourneyStoreError("STORE_UNAVAILABLE", "The product journey store is not configured.");
  }
  const { createPrismaProductJourneyStore } = await import(
    "@server/services/product-journey/prisma-product-journey-store"
  );
  const store = new CachingProductJourneyStore(createPrismaProductJourneyStore());
  stores.set("prisma", store);
  return store;
}

export function resetProductJourneyStoreForTests(): void {
  stores.clear();
  activeKey = "prisma";
}

export class CachingProductJourneyStore implements ProductJourneyStore {
  private readonly cache = new Map<string, JourneyBook>();

  constructor(private readonly inner: ProductJourneyStore) {}

  async read(organizationId: string, productCode: string): Promise<JourneyBook | null> {
    const cacheKey = `${organizationId}:${productCode}`;
    const hit = this.cache.get(cacheKey);
    if (hit) return structuredClone(hit);
    const loaded = await this.inner.read(organizationId, productCode);
    if (loaded) this.cache.set(cacheKey, structuredClone(loaded));
    return loaded ? structuredClone(loaded) : null;
  }

  async compareAndSwap(
    organizationId: string,
    productCode: string,
    expectedRevision: number,
    next: JourneyBook,
  ): Promise<void> {
    this.cache.delete(`${organizationId}:${productCode}`);
    await this.inner.compareAndSwap(organizationId, productCode, expectedRevision, next);
    this.cache.delete(`${organizationId}:${productCode}`);
  }
}

type FileShape = Record<string, JourneyBook>;

export function createFileProductJourneyStore(file: string): ProductJourneyStore {
  const storageKey = (organizationId: string, productCode: string) =>
    `${organizationId}:${productCode.trim().toLowerCase()}`;

  const load = (): FileShape => {
    try {
      return JSON.parse(readFileSync(file, "utf8")) as FileShape;
    } catch {
      return {};
    }
  };

  const persist = (value: FileShape) => {
    mkdirSync(dirname(file), { recursive: true });
    const temporary = `${file}.tmp`;
    writeFileSync(temporary, JSON.stringify(value));
    renameSync(temporary, file);
  };

  return {
    async read(organizationId, productCode) {
      return load()[storageKey(organizationId, productCode)] ?? null;
    },
    async compareAndSwap(organizationId, productCode, expectedRevision, next) {
      const all = load();
      const key = storageKey(organizationId, productCode);
      const current = all[key];
      const revision = current?.bookRevision ?? 0;
      if (revision !== expectedRevision) {
        throw new ProductJourneyStoreError(
          "JOURNEY_CONFLICT",
          "The journey draft changed before it could be saved.",
        );
      }
      all[key] = structuredClone(next);
      persist(all);
    },
  };
}
