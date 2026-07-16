/**
 * EDL Ports — repository contracts (Prisma adapters later via configureEdlPorts).
 */

import type {
  EdlAuditReference,
  EdlCommercialAgreementVersion,
  EdlLedgerEntry,
  EdlRegistrySnapshot,
} from "./enterprise-decision-ledger";

export interface EdlLedgerRepositoryPort {
  /** Append-only — never update or delete. */
  append(entry: EdlLedgerEntry): void;
  list(): EdlLedgerEntry[];
  findById(ledgerId: string): EdlLedgerEntry | undefined;
  listByCategory(category: string): EdlLedgerEntry[];
  listByEntity(entityType: string, entityId: string): EdlLedgerEntry[];
  listByEngine(relatedEngine: string): EdlLedgerEntry[];
}

export interface EdlCommercialVersionRepositoryPort {
  append(version: EdlCommercialAgreementVersion): void;
  list(): EdlCommercialAgreementVersion[];
  listByAgreement(agreementCode: string): EdlCommercialAgreementVersion[];
  findById(id: string): EdlCommercialAgreementVersion | undefined;
}

export interface EdlAuditReferenceRepositoryPort {
  save(ref: EdlAuditReference): void;
  listByLedger(ledgerId: string): EdlAuditReference[];
}

export interface EdlPorts {
  ledger: EdlLedgerRepositoryPort;
  commercials: EdlCommercialVersionRepositoryPort;
  auditReferences: EdlAuditReferenceRepositoryPort;
}

export type PartialEdlPorts = Partial<EdlPorts>;

export type { EdlRegistrySnapshot };
