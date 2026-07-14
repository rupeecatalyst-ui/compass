/**
 * CF-EFL-001 — Foundation validation for architecture freeze.
 */

import {
  EFL_FRAMEWORK_VERSION,
  EFL_LIBRARY_CATALOGUE,
} from "@/constants/enterprise-foundation-libraries";
import type { EflFoundationValidationResult } from "@/types/enterprise-foundation-libraries";
import { exportEflLibrary, importEflLibrary } from "./import-export";
import { getEflFrameworkVersion, getEflRegistrySnapshot } from "./registry-snapshot";
import { resetEflEntryStore } from "./repositories/in-memory";
import { searchEflEntries } from "./search";

export function runEflFoundationValidation(): EflFoundationValidationResult {
  resetEflEntryStore();

  const snap = getEflRegistrySnapshot();
  const search = searchEflEntries({ text: "HDFC", status: "active" });
  const exported = exportEflLibrary("banking_master");
  const imported = importEflLibrary(exported, "merge");
  const inactiveSearch = searchEflEntries({
    libraryCode: "business_message",
    status: "inactive",
  });

  const allCodes = new Set(EFL_LIBRARY_CATALOGUE.map((l) => l.libraryCode));
  const required: Array<(typeof EFL_LIBRARY_CATALOGUE)[number]["libraryCode"]> = [
    "chanakya_wisdom",
    "greeting",
    "occupation",
    "industry",
    "banking_master",
    "mutual_fund_master",
    "document_types",
    "communication_templates",
    "business_message",
  ];

  const hasAllLibraries = required.every((c) => allCodes.has(c));
  const allFrozen = EFL_LIBRARY_CATALOGUE.every((l) => l.architectureStatus === "frozen");
  const allAdmin = EFL_LIBRARY_CATALOGUE.every((l) => l.adminConfigurable);
  const allSearch = EFL_LIBRARY_CATALOGUE.every((l) => l.supportsSearch);
  const allIe = EFL_LIBRARY_CATALOGUE.every((l) => l.supportsImportExport);

  const passed =
    getEflFrameworkVersion() === EFL_FRAMEWORK_VERSION &&
    snap.libraries.length === 9 &&
    hasAllLibraries &&
    allFrozen &&
    allAdmin &&
    allSearch &&
    allIe &&
    snap.entryCount >= 9 &&
    search.total >= 1 &&
    exported.entries.length >= 1 &&
    imported.imported >= 1 &&
    inactiveSearch.total >= 1;

  return {
    passed,
    details: {
      frameworkVersion: getEflFrameworkVersion(),
      libraries: snap.libraries.length,
      entryCount: snap.entryCount,
      searchHits: search.total,
      exportCount: exported.entries.length,
      importCount: imported.imported,
      inactiveHits: inactiveSearch.total,
      architectureNote: snap.architectureNote,
    },
  };
}
