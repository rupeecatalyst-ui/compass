/**
 * EDL in-memory repositories — Phase 1 database structure via ports.
 * Future Prisma: configureEdlPorts({ ledger: prismaEdlLedgerRepository, … }).
 */

import type {
  EdlAuditReference,
  EdlCommercialAgreementVersion,
  EdlLedgerEntry,
} from "@/types/enterprise-decision-ledger";
import type { EdlPorts } from "@/types/enterprise-decision-ledger-ports";

export function createInMemoryEdlPorts(): EdlPorts {
  const entries: EdlLedgerEntry[] = [];
  const commercials: EdlCommercialAgreementVersion[] = [];
  const auditRefs: EdlAuditReference[] = [];

  return {
    ledger: {
      append(entry) {
        // Constitutional: append-only — never mutate prior rows.
        if (entries.some((e) => e.ledgerId === entry.ledgerId)) {
          throw new Error(`EDL: ledgerId ${entry.ledgerId} already exists — history cannot be rewritten.`);
        }
        entries.push(entry);
      },
      list() {
        return [...entries];
      },
      findById(ledgerId) {
        return entries.find((e) => e.ledgerId === ledgerId);
      },
      listByCategory(category) {
        return entries.filter((e) => e.changeCategory === category);
      },
      listByEntity(entityType, entityId) {
        return entries.filter(
          (e) => e.relatedEntityType === entityType && e.relatedEntityId === entityId,
        );
      },
      listByEngine(relatedEngine) {
        return entries.filter((e) => e.relatedEngine === relatedEngine);
      },
    },
    commercials: {
      append(version) {
        if (commercials.some((c) => c.id === version.id)) {
          throw new Error(`EDL: commercial version ${version.id} already exists.`);
        }
        commercials.push(version);
      },
      list() {
        return [...commercials];
      },
      listByAgreement(agreementCode) {
        return commercials.filter((c) => c.agreementCode === agreementCode);
      },
      findById(id) {
        return commercials.find((c) => c.id === id);
      },
    },
    auditReferences: {
      save(ref) {
        auditRefs.push(ref);
      },
      listByLedger(ledgerId) {
        return auditRefs.filter((r) => r.ledgerId === ledgerId);
      },
    },
  };
}
