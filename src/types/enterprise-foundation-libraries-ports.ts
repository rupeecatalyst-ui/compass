/**
 * CF-EFL-001 — Repository ports for Foundation Libraries.
 */

import type {
  EflImportExportEnvelope,
  EflLibraryCode,
  EflLibraryEntry,
  EflSearchQuery,
  EflSearchResult,
} from "@/types/enterprise-foundation-libraries";

export interface EflLibraryEntryRepositoryPort {
  list(libraryCode?: EflLibraryCode): EflLibraryEntry[];
  findById(id: string): EflLibraryEntry | undefined;
  findByCode(libraryCode: EflLibraryCode, entryCode: string): EflLibraryEntry | undefined;
  save(entry: EflLibraryEntry): void;
  replaceAll(entries: EflLibraryEntry[]): void;
}

export interface EflSearchPort {
  search(query: EflSearchQuery): EflSearchResult;
}

export interface EflImportExportPort {
  exportLibrary(libraryCode: EflLibraryCode): EflImportExportEnvelope;
  importLibrary(envelope: EflImportExportEnvelope, mode?: "merge" | "replace"): {
    imported: number;
    skipped: number;
  };
}
