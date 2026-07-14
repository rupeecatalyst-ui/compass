/**
 * CF-EFL-001 — Enterprise Foundation Libraries lifecycle & catalogue.
 */

import type { EflLibraryCode, EflLibraryDefinition } from "@/types/enterprise-foundation-libraries";

/** Architecture freeze version — corpora populate after certification. */
export const EFL_FRAMEWORK_VERSION = "1.0.0-cf-efl-001";

export const EFL_ARCHITECTURE_FREEZE_NOTE =
  "Architecture frozen (CF-EFL-001). Populate with enterprise-scale reference data after current certification.";

export const EFL_LIBRARY_CODES = {
  CHANAKYA_WISDOM: "chanakya_wisdom",
  GREETING: "greeting",
  OCCUPATION: "occupation",
  INDUSTRY: "industry",
  BANKING_MASTER: "banking_master",
  MUTUAL_FUND_MASTER: "mutual_fund_master",
  DOCUMENT_TYPES: "document_types",
  COMMUNICATION_TEMPLATES: "communication_templates",
  BUSINESS_MESSAGE: "business_message",
} as const satisfies Record<string, EflLibraryCode>;

/**
 * Initial Foundation Library catalogue.
 * targetEntryCount documents intended enterprise scale — not current seed size.
 */
export const EFL_LIBRARY_CATALOGUE: readonly EflLibraryDefinition[] = [
  {
    id: "efl-lib-wisdom",
    libraryCode: "chanakya_wisdom",
    name: "CHANAKYA Wisdom Library",
    description: "Operational and strategic wisdom quotes for Daily Wisdom and coaching surfaces.",
    targetEntryCount: 500,
    architectureStatus: "frozen",
    enabled: true,
    supportsLocales: true,
    supportsImportExport: true,
    supportsSearch: true,
    supportsActiveInactive: true,
    adminConfigurable: true,
    category: "advisory",
    sortOrder: 1,
    consumerHints: ["dashboard/briefing", "stage-coaching", "mission-control"],
  },
  {
    id: "efl-lib-greeting",
    libraryCode: "greeting",
    name: "Greeting Library",
    description: "Personalized CHANAKYA greetings (100+) — time/session-aware selection.",
    targetEntryCount: 150,
    architectureStatus: "frozen",
    enabled: true,
    supportsLocales: true,
    supportsImportExport: true,
    supportsSearch: true,
    supportsActiveInactive: true,
    adminConfigurable: true,
    category: "advisory",
    sortOrder: 2,
    consumerHints: ["chanakya-greeting-engine", "briefing", "guidance-cards"],
  },
  {
    id: "efl-lib-occupation",
    libraryCode: "occupation",
    name: "Occupation Library",
    description: "Standardized occupations for borrower / ECM employment context.",
    targetEntryCount: 200,
    architectureStatus: "frozen",
    enabled: true,
    supportsLocales: true,
    supportsImportExport: true,
    supportsSearch: true,
    supportsActiveInactive: true,
    adminConfigurable: true,
    category: "reference",
    sortOrder: 3,
    consumerHints: ["ecm", "loan-origin", "cdc-relevance"],
  },
  {
    id: "efl-lib-industry",
    libraryCode: "industry",
    name: "Industry Library",
    description: "Industry classifications for business borrowers and partners.",
    targetEntryCount: 120,
    architectureStatus: "frozen",
    enabled: true,
    supportsLocales: true,
    supportsImportExport: true,
    supportsSearch: true,
    supportsActiveInactive: true,
    adminConfigurable: true,
    category: "reference",
    sortOrder: 4,
    consumerHints: ["ecm", "opportunity", "risk"],
  },
  {
    id: "efl-lib-banking",
    libraryCode: "banking_master",
    name: "Banking Master",
    description: "Bank / IFSC-aware reference master for lenders and disbursement context.",
    targetEntryCount: 300,
    architectureStatus: "frozen",
    enabled: true,
    supportsLocales: false,
    supportsImportExport: true,
    supportsSearch: true,
    supportsActiveInactive: true,
    adminConfigurable: true,
    category: "master",
    sortOrder: 5,
    consumerHints: ["lenders", "life", "disbursement"],
  },
  {
    id: "efl-lib-mf",
    libraryCode: "mutual_fund_master",
    name: "Mutual Fund Master",
    description: "AMC / scheme reference master for investor journeys.",
    targetEntryCount: 250,
    architectureStatus: "frozen",
    enabled: true,
    supportsLocales: false,
    supportsImportExport: true,
    supportsSearch: true,
    supportsActiveInactive: true,
    adminConfigurable: true,
    category: "master",
    sortOrder: 6,
    consumerHints: ["investor", "opportunity"],
  },
  {
    id: "efl-lib-docs",
    libraryCode: "document_types",
    name: "Document Types",
    description: "Canonical document type codes for EDIE and document workspaces.",
    targetEntryCount: 80,
    architectureStatus: "frozen",
    enabled: true,
    supportsLocales: true,
    supportsImportExport: true,
    supportsSearch: true,
    supportsActiveInactive: true,
    adminConfigurable: true,
    category: "reference",
    sortOrder: 7,
    consumerHints: ["edie", "documents", "loan-workspace"],
  },
  {
    id: "efl-lib-comm",
    libraryCode: "communication_templates",
    name: "Communication Templates",
    description: "Reusable communication templates (EMAIL / WhatsApp / SMS) for ENCE.",
    targetEntryCount: 100,
    architectureStatus: "frozen",
    enabled: true,
    supportsLocales: true,
    supportsImportExport: true,
    supportsSearch: true,
    supportsActiveInactive: true,
    adminConfigurable: true,
    category: "communication",
    sortOrder: 8,
    consumerHints: ["ence", "tasks", "follow-up"],
  },
  {
    id: "efl-lib-msg",
    libraryCode: "business_message",
    name: "Business Message Library",
    description: "Structured business messages for guidance, coaching, and system copy.",
    targetEntryCount: 200,
    architectureStatus: "frozen",
    enabled: true,
    supportsLocales: true,
    supportsImportExport: true,
    supportsSearch: true,
    supportsActiveInactive: true,
    adminConfigurable: true,
    category: "communication",
    sortOrder: 9,
    consumerHints: ["chanakya", "business-completion", "coaching"],
  },
] as const;

export function getEnabledEflLibraries(): EflLibraryDefinition[] {
  return EFL_LIBRARY_CATALOGUE.filter((l) => l.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getEflLibraryDefinition(
  code: EflLibraryCode,
): EflLibraryDefinition | undefined {
  return EFL_LIBRARY_CATALOGUE.find((l) => l.libraryCode === code);
}
