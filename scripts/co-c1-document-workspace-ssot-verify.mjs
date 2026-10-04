/**
 * Document Workspace and Opportunity Document Center share one registry identity.
 * A company borrower with no stored participant rows still owns documents stamped
 * opp-company-{companyId}. Unclassified type refs stay unclassified.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveOpportunityLoanStructureParticipants } from "../src/lib/lead-opportunity-journey/opportunity-loan-structure.ts";
import {
  defaultLinkedPartyKey,
  mergeLinkedParties,
  partyMatchesRow,
} from "../src/lib/document-workspace/linked-parties.ts";
import { listUnclassifiedReceivedDocuments } from "../src/lib/document-workspace/unclassified.ts";
import { mergeDocumentWorkspaceRows } from "../src/lib/document-workspace/merge-rows.ts";
import { deriveOpportunityDocumentReadiness } from "../src/lib/document-requests/readiness.ts";
import { filterRegistryRecordsForLockedContext } from "../src/lib/document-workspace/context-lock.ts";

const companyId = "company-1";
const otherId = "company-2";
const participants = resolveOpportunityLoanStructureParticipants({
  lendingExtension: { remarks: "no participants array" },
  primaryBorrowerKind: "company",
  companyId,
  companyName: "Certified Company",
});
assert.equal(participants.length, 1);
assert.equal(participants[0].id, `opp-company-${companyId}`);
assert.equal(participants[0].entityId, companyId);
assert.equal(participants[0].role, "primary_applicant");

const parties = mergeLinkedParties({
  opportunityParticipants: participants,
  lockKind: "opportunity",
});
const activeKey = defaultLinkedPartyKey(parties);
const active = parties.find((party) => party.key === activeKey);
assert.equal(active?.entityId, companyId);
assert.equal(active?.role, "primary_applicant");

function record(id, typeRef, ownerId) {
  return {
    id,
    typeRef,
    categoryLabel: typeRef,
    displayName: typeRef,
    status: "active",
    uploadSource: "folder_package",
    verifiedAt: null,
    versions: [{ isCurrent: true, displayName: typeRef }],
    links: {
      opportunityId: "opp-1",
      documentScope: "applicant",
      ownerEntityId: ownerId,
      contactId: ownerId,
      participantId: `opp-company-${ownerId}`,
      participantRole: null,
    },
  };
}

const pan = record("doc-pan", "doc:pan", companyId);
const other = record("doc-other", "doc:other:folder-file", companyId);
const foreign = record("doc-foreign", "doc:pan", otherId);
const visible = filterRegistryRecordsForLockedContext({
  records: [pan, other, foreign],
  opportunityId: "opp-1",
});
assert.deepEqual(visible.map((row) => row.id), ["doc-pan", "doc-other", "doc-foreign"]);

const rows = mergeDocumentWorkspaceRows({
  records: visible,
  lodItems: [{
    typeRef: "doc:pan",
    label: "PAN Card",
    moduleLabel: "Identity",
    participantId: `opp-company-${companyId}`,
    registryRecordId: pan.id,
    status: "uploaded",
    category: "critical",
  }],
  participants,
});
const panRows = rows.filter((row) => row.registryRecordId === pan.id);
assert.equal(panRows.length, 1, "one durable document id");
assert.equal(rows.filter((row) => row.registryRecordId === other.id).length, 1);

function matches(party, row) {
  return partyMatchesRow({
    party,
    ownerTab: row.ownerTab,
    ownerEntityId: row.record?.links.ownerEntityId,
    participantRowId: row.record?.links.participantId,
    participantRole: row.record?.links.participantRole,
    contactId: row.record?.links.contactId,
  });
}
assert.equal(matches(active, rows.find((row) => row.registryRecordId === pan.id)), true);
assert.equal(matches(active, rows.find((row) => row.registryRecordId === other.id)), true);
assert.equal(matches(active, rows.find((row) => row.registryRecordId === foreign.id)), false);

const unclassified = listUnclassifiedReceivedDocuments(visible);
assert.deepEqual(unclassified.map((row) => row.id), ["doc-other"]);

const readiness = deriveOpportunityDocumentReadiness([
  { typeRef: "doc:pan", label: "PAN", category: "critical", status: "uploaded" },
  { typeRef: "doc:bank-statement", label: "Bank", category: "critical", status: "pending" },
]);
assert.equal(readiness.total, 2);
assert.equal(readiness.uploaded, 1);
assert.equal(readiness.completionPct, 50);

const absentName = resolveOpportunityLoanStructureParticipants({
  lendingExtension: {},
  primaryBorrowerKind: "company",
  companyId,
  companyName: "",
});
assert.equal(absentName.length, 0);

const service = readFileSync(new URL("../server/services/document-workspace/document-workspace-refinement-014.service.ts", import.meta.url), "utf8");
assert.match(service, /resolveOpportunityLoanStructureParticipants\(opportunity\)/);
assert.match(service, /organizationId, isDeleted: false/);
assert.match(service, /requireAuthorisedWorkspace/);
assert.doesNotMatch(service, /readOpportunityParticipantsFromExtension/);

console.log("co-c1-document-workspace-ssot-verify: PASS");
