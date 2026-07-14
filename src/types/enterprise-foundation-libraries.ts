/**
 * CF-EFL-001 — Enterprise Foundation Libraries (EFL)
 *
 * Architecture freeze: metadata-driven reusable reference libraries.
 * Build once. Reuse everywhere.
 *
 * Full enterprise-scale corpus population is deferred until after certification.
 */

/** Stable library identity codes — configuration, not hardcoded UI branches. */
export type EflLibraryCode =
  | "chanakya_wisdom"
  | "greeting"
  | "occupation"
  | "industry"
  | "banking_master"
  | "mutual_fund_master"
  | "document_types"
  | "communication_templates"
  | "business_message";

/** Operational status — Active / Inactive (Admin configurable). */
export type EflEntryStatus = "active" | "inactive";

/** Future multilingual support — locale codes reserved in architecture. */
export type EflLocaleCode = "en-IN" | "hi-IN" | "en-US" | string;

/** Metadata bag — library-specific attributes without schema forks. */
export type EflMetadataBag = Record<
  string,
  string | number | boolean | string[] | null | undefined
>;

/**
 * Common entry contract for every Foundation Library.
 * Domain consumers read through this shape — never clone fields.
 */
export interface EflLibraryEntry {
  id: string;
  libraryCode: EflLibraryCode;
  /** Stable business key within the library (unique per library). */
  entryCode: string;
  /** Default display label (primary locale). */
  label: string;
  description?: string;
  status: EflEntryStatus;
  tags: string[];
  /** Primary locale for this entry's default text. */
  defaultLocale: EflLocaleCode;
  /**
   * Future multilingual payloads — architecture reserved.
   * Keys are locale codes; values are translated label/description/body.
   */
  locales?: Partial<
    Record<
      EflLocaleCode,
      {
        label?: string;
        description?: string;
        body?: string;
      }
    >
  >;
  /** Library-specific structured metadata. */
  metadata: EflMetadataBag;
  /** Optional free-form body (wisdom quote, greeting pattern, message template). */
  body?: string;
  sortOrder: number;
  version: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
  remarks?: string;
}

/** Library catalogue definition — Admin-configurable registry of libraries. */
export interface EflLibraryDefinition {
  id: string;
  libraryCode: EflLibraryCode;
  name: string;
  description: string;
  /** Intended enterprise-scale size after full population. */
  targetEntryCount: number;
  /** Architecture phase — freeze vs populate. */
  architectureStatus: "frozen" | "populating" | "ready";
  enabled: boolean;
  supportsLocales: boolean;
  supportsImportExport: boolean;
  supportsSearch: boolean;
  supportsActiveInactive: boolean;
  adminConfigurable: boolean;
  category: "advisory" | "reference" | "master" | "communication";
  sortOrder: number;
  consumerHints: string[];
}

export interface EflSearchQuery {
  libraryCode?: EflLibraryCode;
  text?: string;
  status?: EflEntryStatus | "all";
  tags?: string[];
  locale?: EflLocaleCode;
  limit?: number;
}

export interface EflSearchResult {
  total: number;
  entries: EflLibraryEntry[];
}

/** Portable import/export envelope — versioned for future multilingual & schema evolution. */
export interface EflImportExportEnvelope {
  frameworkVersion: string;
  exportedAt: string;
  libraryCode: EflLibraryCode;
  localeHint?: EflLocaleCode;
  entries: EflLibraryEntry[];
}

export interface EflLibraryStats {
  libraryCode: EflLibraryCode;
  total: number;
  active: number;
  inactive: number;
  targetEntryCount: number;
  populationPct: number;
}

export interface EflRegistrySnapshot {
  frameworkVersion: string;
  frozenAt: string;
  libraries: EflLibraryDefinition[];
  stats: EflLibraryStats[];
  entryCount: number;
  architectureNote: string;
}

export interface EflFoundationValidationResult {
  passed: boolean;
  details: Record<string, unknown>;
}
