/**
 * CF-EFL-001 — Architecture-scale reference seeds.
 * Intentional small samples proving schema — full corpora post-certification.
 */

import type { EflLibraryEntry } from "@/types/enterprise-foundation-libraries";

const NOW = "2026-07-14T00:00:00.000Z";

function entry(
  partial: Omit<EflLibraryEntry, "createdBy" | "createdOn" | "modifiedBy" | "modifiedOn" | "version" | "defaultLocale" | "status" | "tags" | "sortOrder"> &
    Partial<
      Pick<
        EflLibraryEntry,
        | "createdBy"
        | "createdOn"
        | "modifiedBy"
        | "modifiedOn"
        | "version"
        | "defaultLocale"
        | "status"
        | "tags"
        | "sortOrder"
        | "description"
        | "body"
        | "locales"
        | "remarks"
      >
    >,
): EflLibraryEntry {
  return {
    createdBy: "system",
    createdOn: NOW,
    modifiedBy: "system",
    modifiedOn: NOW,
    version: "1.0.0",
    defaultLocale: "en-IN",
    status: "active",
    tags: [],
    sortOrder: 1,
    ...partial,
  };
}

/** Architecture freeze seeds — one structural sample per library (+ a few greets/wisdom). */
export const EFL_ARCHITECTURE_SEED_ENTRIES: readonly EflLibraryEntry[] = [
  entry({
    id: "efl-wisdom-001",
    libraryCode: "chanakya_wisdom",
    entryCode: "WSD-001",
    label: "Clear the desk before you stretch",
    body: "Before you stretch for new revenue, clear the files already waiting at your desk.",
    tags: ["operations", "revenue"],
    metadata: { theme: "velocity", surface: "daily_wisdom" },
    remarks: "Target corpus: 500 quotes after certification.",
  }),
  entry({
    id: "efl-wisdom-002",
    libraryCode: "chanakya_wisdom",
    entryCode: "WSD-002",
    label: "A silent banker is waiting",
    body: "A lender who has not replied in three days is not silent — they are waiting for you.",
    tags: ["lender", "follow-up"],
    metadata: { theme: "relationship", surface: "daily_wisdom" },
    sortOrder: 2,
  }),
  entry({
    id: "efl-greet-001",
    libraryCode: "greeting",
    entryCode: "GRT-MORNING-001",
    label: "Good morning pattern",
    body: "Good morning {name}.",
    tags: ["morning", "guidance"],
    metadata: { moment: "morning", context: "guidance", pattern: "Good morning {name}." },
    remarks: "Target corpus: 100+ / ~150 greetings after certification.",
  }),
  entry({
    id: "efl-greet-002",
    libraryCode: "greeting",
    entryCode: "GRT-READY-001",
    label: "We're almost ready",
    body: "Hi {name}, we're almost ready.",
    tags: ["guidance", "journey"],
    metadata: { moment: "any", context: "guidance", pattern: "Hi {name}, we're almost ready." },
    sortOrder: 2,
  }),
  entry({
    id: "efl-occ-001",
    libraryCode: "occupation",
    entryCode: "OCC-SAL-001",
    label: "Salaried — Private Sector",
    description: "Private limited / MNC employee.",
    tags: ["salaried"],
    metadata: { employmentType: "salaried", sector: "private" },
    remarks: "Target corpus: ~200 occupations after certification.",
  }),
  entry({
    id: "efl-ind-001",
    libraryCode: "industry",
    entryCode: "IND-MFG-001",
    label: "Manufacturing",
    description: "Discrete / process manufacturing.",
    tags: ["industry"],
    metadata: { nicGroup: "manufacturing" },
    remarks: "Target corpus: ~120 industries after certification.",
  }),
  entry({
    id: "efl-bank-001",
    libraryCode: "banking_master",
    entryCode: "BNK-HDFC",
    label: "HDFC Bank",
    description: "Scheduled commercial bank — private.",
    tags: ["bank", "private"],
    metadata: { bankCode: "HDFC", ifscPrefix: "HDFC0", type: "scb" },
    remarks: "Target corpus: ~300 banking entries after certification.",
  }),
  entry({
    id: "efl-mf-001",
    libraryCode: "mutual_fund_master",
    entryCode: "MF-AMC-001",
    label: "HDFC Mutual Fund",
    description: "Asset management company reference.",
    tags: ["amc"],
    metadata: { amcCode: "HDFC", category: "equity" },
    remarks: "Target corpus: ~250 MF entries after certification.",
  }),
  entry({
    id: "efl-doc-001",
    libraryCode: "document_types",
    entryCode: "DOC-KYC-PAN",
    label: "PAN Card",
    description: "Permanent Account Number identity proof.",
    tags: ["kyc", "identity"],
    metadata: { category: "kyc", mandatoryDefault: true },
    remarks: "Target corpus: ~80 document types after certification.",
  }),
  entry({
    id: "efl-comm-001",
    libraryCode: "communication_templates",
    entryCode: "TPL-WA-FOLLOWUP",
    label: "WhatsApp — Lender follow-up",
    body: "Following up on {lender} login for {customer}.",
    tags: ["whatsapp", "follow-up"],
    metadata: { channel: "whatsapp", intent: "follow_up" },
    remarks: "Target corpus: ~100 templates after certification.",
  }),
  entry({
    id: "efl-msg-001",
    libraryCode: "business_message",
    entryCode: "MSG-MIR-GUIDE",
    label: "Borrower profile almost ready",
    body: "I need a few more borrower details before I can begin the Loan Journey.",
    tags: ["mir", "guidance"],
    metadata: { surface: "business_journey", mode: "guide" },
    remarks: "Target corpus: ~200 business messages after certification.",
  }),
  entry({
    id: "efl-msg-inactive-sample",
    libraryCode: "business_message",
    entryCode: "MSG-LEGACY-SAMPLE",
    label: "Legacy instructional copy (inactive)",
    body: "Complete minimum Borrower profile information before starting the business journey.",
    status: "inactive",
    tags: ["legacy"],
    metadata: { surface: "business_journey", supersededBy: "MSG-MIR-GUIDE" },
    sortOrder: 99,
    remarks: "Demonstrates Active/Inactive governance in architecture freeze.",
  }),
];
