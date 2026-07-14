/**
 * CF-EFL-001 — In-memory EFL entry store (architecture freeze).
 */

import { EFL_ARCHITECTURE_SEED_ENTRIES } from "@/data/catalyst-one/enterprise-foundation-libraries/efl-architecture-seed";
import type { EflLibraryCode, EflLibraryEntry } from "@/types/enterprise-foundation-libraries";
import type { EflLibraryEntryRepositoryPort } from "@/types/enterprise-foundation-libraries-ports";

function clone(entries: readonly EflLibraryEntry[]): EflLibraryEntry[] {
  return entries.map((e) => ({ ...e, tags: [...e.tags], metadata: { ...e.metadata } }));
}

let store: EflLibraryEntry[] = clone(EFL_ARCHITECTURE_SEED_ENTRIES);

export function resetEflEntryStore(): void {
  store = clone(EFL_ARCHITECTURE_SEED_ENTRIES);
}

export function createEflEntryRepository(): EflLibraryEntryRepositoryPort {
  return {
    list(libraryCode) {
      if (!libraryCode) return [...store];
      return store.filter((e) => e.libraryCode === libraryCode);
    },
    findById(id) {
      return store.find((e) => e.id === id);
    },
    findByCode(libraryCode, entryCode) {
      return store.find((e) => e.libraryCode === libraryCode && e.entryCode === entryCode);
    },
    save(entry) {
      const idx = store.findIndex((e) => e.id === entry.id);
      if (idx >= 0) store[idx] = entry;
      else store.push(entry);
    },
    replaceAll(entries) {
      store = clone(entries);
    },
  };
}

export function listEflEntries(libraryCode?: EflLibraryCode): EflLibraryEntry[] {
  return createEflEntryRepository().list(libraryCode);
}
