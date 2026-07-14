/**
 * CF-EFL-001 — Import / Export envelope services.
 */

import { EFL_FRAMEWORK_VERSION } from "@/constants/enterprise-foundation-libraries";
import type {
  EflImportExportEnvelope,
  EflLibraryCode,
} from "@/types/enterprise-foundation-libraries";
import type { EflImportExportPort } from "@/types/enterprise-foundation-libraries-ports";
import { createEflEntryRepository } from "./repositories/in-memory";

export function createEflImportExportService(): EflImportExportPort {
  const repo = createEflEntryRepository();

  return {
    exportLibrary(libraryCode: EflLibraryCode): EflImportExportEnvelope {
      return {
        frameworkVersion: EFL_FRAMEWORK_VERSION,
        exportedAt: new Date().toISOString(),
        libraryCode,
        localeHint: "en-IN",
        entries: repo.list(libraryCode),
      };
    },
    importLibrary(envelope, mode = "merge") {
      if (!envelope.libraryCode || !Array.isArray(envelope.entries)) {
        return { imported: 0, skipped: 0 };
      }
      let imported = 0;
      let skipped = 0;
      if (mode === "replace") {
        const others = repo.list().filter((e) => e.libraryCode !== envelope.libraryCode);
        repo.replaceAll([...others, ...envelope.entries.filter((e) => e.libraryCode === envelope.libraryCode)]);
        return { imported: envelope.entries.length, skipped: 0 };
      }
      for (const entry of envelope.entries) {
        if (entry.libraryCode !== envelope.libraryCode) {
          skipped += 1;
          continue;
        }
        repo.save({
          ...entry,
          modifiedOn: new Date().toISOString(),
          modifiedBy: entry.modifiedBy || "import",
        });
        imported += 1;
      }
      return { imported, skipped };
    },
  };
}

export function exportEflLibrary(libraryCode: EflLibraryCode): EflImportExportEnvelope {
  return createEflImportExportService().exportLibrary(libraryCode);
}

export function importEflLibrary(
  envelope: EflImportExportEnvelope,
  mode?: "merge" | "replace",
) {
  return createEflImportExportService().importLibrary(envelope, mode);
}
