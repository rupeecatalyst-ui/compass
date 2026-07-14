/**
 * CF-EFL-001 — Search across Foundation Libraries.
 */

import type { EflSearchQuery, EflSearchResult } from "@/types/enterprise-foundation-libraries";
import type { EflSearchPort } from "@/types/enterprise-foundation-libraries-ports";
import { createEflEntryRepository } from "./repositories/in-memory";

export function createEflSearchService(): EflSearchPort {
  const repo = createEflEntryRepository();

  return {
    search(query: EflSearchQuery): EflSearchResult {
      let entries = repo.list(query.libraryCode);
      const status = query.status ?? "all";
      if (status !== "all") {
        entries = entries.filter((e) => e.status === status);
      }
      if (query.tags?.length) {
        entries = entries.filter((e) => query.tags!.every((t) => e.tags.includes(t)));
      }
      const text = query.text?.trim().toLowerCase();
      if (text) {
        entries = entries.filter((e) => {
          const localeBlob =
            query.locale && e.locales?.[query.locale]
              ? JSON.stringify(e.locales[query.locale]).toLowerCase()
              : "";
          return (
            e.label.toLowerCase().includes(text) ||
            e.entryCode.toLowerCase().includes(text) ||
            (e.description?.toLowerCase().includes(text) ?? false) ||
            (e.body?.toLowerCase().includes(text) ?? false) ||
            e.tags.some((t) => t.toLowerCase().includes(text)) ||
            localeBlob.includes(text)
          );
        });
      }
      const total = entries.length;
      const limit = query.limit ?? 100;
      return { total, entries: entries.slice(0, limit).sort((a, b) => a.sortOrder - b.sortOrder) };
    },
  };
}

export function searchEflEntries(query: EflSearchQuery): EflSearchResult {
  return createEflSearchService().search(query);
}
