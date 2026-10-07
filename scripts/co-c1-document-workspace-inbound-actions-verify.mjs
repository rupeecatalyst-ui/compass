// Execute the real service functions with in-memory persistence and authorization fixtures.
// No environment files, database connection, ingestion or delivery calls are used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { listEdieDocumentTypeOptions } from '../src/lib/document-requests/resolve-program-lod.ts';
import { inboundEmailVersionKey } from '../src/lib/document-workspace/inbound-email-new.ts';
import { inboundFileCountsTowardReadiness } from '../src/lib/document-workspace/inbound-classification.ts';

const root = process.cwd();
const require = createRequire(import.meta.url);
let document, updates, audits, seen, race;
const validType = listEdieDocumentTypeOptions().find((row) => !row.typeRef.endsWith(':other'));
assert.ok(validType);
function reset() {
  document = { id: 'doc-a', organizationId: 'org-a', opportunityId: 'opp-a', dealId: 'deal-a',
    uploadSource: 'email', status: 'active', deletedAt: null, inboundEmailId: 'mail-a',
    inboundAttachmentId: 'att-a', contentVersion: 1, updatedAt: new Date('2026-09-10T00:00:00Z'),
    createdAt: new Date('2026-09-10T00:00:00Z'), typeRef: 'unclassified:email',
    categoryLabel: 'Inbound Email Attachment', originalFilename: 'statement.pdf',
    contentBytes: Buffer.from('fixture-binary'), storageKey: null, verifiedAt: null,
    inboundClassificationJson: null };
  updates = []; audits = []; seen = []; race = false;
}
const prisma = {
  enterpriseTransactionDocument: {
    findFirst: async () => structuredClone(document),
    findMany: async () => [structuredClone(document)],
    updateMany: async ({ where, data }) => {
      if (race || where.updatedAt.getTime() !== document.updatedAt.getTime()) return { count: 0 };
      updates.push(data); Object.assign(document, data, { updatedAt: new Date(document.updatedAt.getTime() + 1) });
      return { count: 1 };
    },
  },
  enterpriseInboundEmailAttachment: { findFirst: async ({ where }) =>
    where.id === document.inboundAttachmentId && where.documentId === document.id ? { id: 'att-a' } : null },
  enterpriseInboundEmailMessage: { findMany: async () => [], findFirst: async ({ where }) =>
    where.id === 'mail-a' && where.organizationId === 'org-a' && where.opportunityId === 'opp-a' ? { id: 'mail-a' } : null },
  enterpriseDocumentVersionSeen: { upsert: async (input) => { seen.push(input); } },
};
async function authorize(input) {
  assert.equal(input.userId, 'reviewer-a', 'unauthorized actor denied');
  if (input.opportunityId) assert.equal(input.opportunityId, document.opportunityId, 'cross-transaction denied');
  if (input.dealId) assert.equal(input.dealId, document.dealId, 'cross-deal denied');
  return { organizationId: 'org-a', opportunityId: document.opportunityId, dealId: document.dealId,
    documentId: document.id, actor: { userId: input.userId } };
}
function loadService(filename) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(root, filename), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fixtureRequire = (id) => {
    if (id === 'server-only') return {};
    if (id === '@server/lib/prisma') return { prisma, isDatabaseAvailable: () => true };
    if (id.endsWith('document-workspace-access.service')) return { resolveDocumentWorkspaceAccess: authorize };
    if (id.endsWith('document-workspace-audit.service')) return { appendDocumentWorkspaceAuditBestEffort: async (input) => audits.push(input) };
    if (id.startsWith('@server/')) return {};
    if (id.startsWith('@/')) return require(path.join(root, 'src', id.slice(2)));
    return require(id);
  };
  vm.runInNewContext(source, { require: fixtureRequire, module, exports: module.exports, Buffer, Date, console });
  return module.exports;
}
const review = loadService('server/services/document-workspace/document-workspace-refinement-014d.service.ts');
const lifecycle = loadService('server/services/document-workspace/document-workspace-refinement-014.service.ts');
function input(decision, extra = {}) {
  return { actorUserId: 'reviewer-a', opportunityId: 'opp-a', dealId: 'deal-a', documentId: 'doc-a',
    inboundEmailId: 'mail-a', inboundAttachmentId: 'att-a', versionKey: inboundEmailVersionKey({
      versionNumber: document.contentVersion, uploadedAt: document.updatedAt.toISOString(),
    }), decision, ...extra };
}
async function test(name, fn) { reset(); await fn(); console.log(`PASS ${name}`); }
await test('Confirm resolves valid classification without reason, binary or LOD writes', async () => {
  const binary = Buffer.from(document.contentBytes);
  await review.reviewInboundAttachment(input('confirm', { typeRef: validType.typeRef, categoryLabel: 'forged' }));
  assert.equal(document.categoryLabel, validType.label);
  assert.equal(document.inboundClassificationJson.outcome, 'attached_manually');
  assert.deepEqual(document.contentBytes, binary); assert.equal(document.verifiedAt, null);
  assert.equal((await review.listInboundEmailReviewQueue({ actorUserId: 'reviewer-a', opportunityId: 'opp-a' })).items.length, 0);
  assert.ok(audits.some((row) => row.metadata?.previousTypeRef));
});
await test('Confirm rejects Unknown and fabricated type without writes', async () => {
  for (const typeRef of ['', 'doc:invented']) await assert.rejects(review.reviewInboundAttachment(input('confirm', { typeRef })));
  assert.equal(updates.length, 0);
});
await test('Change uses master type, requires reason and preserves binary', async () => {
  await assert.rejects(review.reviewInboundAttachment(input('change', { typeRef: validType.typeRef })));
  await review.reviewInboundAttachment(input('change', { typeRef: validType.typeRef, reason: 'Correct document type' }));
  assert.equal(document.typeRef, validType.typeRef); assert.equal(updates.length, 1);
  assert.ok(!('contentBytes' in updates[0])); assert.ok(audits.some((row) => row.reason === 'Correct document type'));
});
for (const decision of ['duplicate', 'ignore']) await test(`${decision} requires reason, resolves queue, preserves evidence and cannot satisfy LOD`, async () => {
  document.verifiedAt = new Date();
  await assert.rejects(review.reviewInboundAttachment(input(decision)));
  await review.reviewInboundAttachment(input(decision, { reason: 'Reviewed email evidence' }));
  assert.equal(document.inboundAttachmentId, 'att-a'); assert.equal(document.inboundEmailId, 'mail-a');
  assert.equal(document.contentBytes.toString(), 'fixture-binary'); assert.equal(document.status, 'active');
  assert.equal(document.verifiedAt, null);
  assert.equal(inboundFileCountsTowardReadiness({ ...document, versions: [{}] }), false);
  assert.equal((await review.listInboundEmailReviewQueue({ actorUserId: 'reviewer-a', opportunityId: 'opp-a' })).items.length, 0);
});
await test('Unauthorized, wrong transaction/deal, wrong evidence, stale and missing callbacks fail closed', async () => {
  for (const extra of [{ actorUserId: 'outsider' }, { opportunityId: 'opp-b' }, { dealId: 'deal-b' },
    { inboundAttachmentId: 'att-b' }, { inboundEmailId: 'mail-b' }, { versionKey: 'stale' }, { versionKey: null }]) {
    await assert.rejects(review.reviewInboundAttachment(input('confirm', { typeRef: validType.typeRef, ...extra })));
  }
  assert.equal(updates.length, 0);
});
await test('Concurrent reviews produce one mutation; stale write produces no audit', async () => {
  const request = input('confirm', { typeRef: validType.typeRef });
  const results = await Promise.allSettled([review.reviewInboundAttachment(request), review.reviewInboundAttachment(request)]);
  assert.equal(results.filter((row) => row.status === 'fulfilled').length, 1); assert.equal(updates.length, 1);
  reset(); race = true;
  await assert.rejects(review.reviewInboundAttachment(input('confirm', { typeRef: validType.typeRef })));
  assert.equal(audits.length, 0);
});
await test('Mark seen changes only version receipt and rejects wrong transaction/stale version', async () => {
  const prior = structuredClone(document);
  const request = { userId: 'reviewer-a', opportunityId: 'opp-a', dealId: 'deal-a', documentId: 'doc-a', versionKey: input('confirm').versionKey };
  await lifecycle.markDocumentVersionSeen(request);
  assert.deepEqual(structuredClone(document), prior); assert.equal(seen.length, 1); assert.equal(updates.length, 0);
  await assert.rejects(lifecycle.markDocumentVersionSeen({ ...request, opportunityId: 'opp-b' }));
  await assert.rejects(lifecycle.markDocumentVersionSeen({ ...request, versionKey: 'stale' }));
  assert.equal(seen.length, 1);
  assert.equal((await review.listInboundEmailReviewQueue({ actorUserId: 'reviewer-a', opportunityId: 'opp-a' })).items.length, 1);
});
await test('Non-email, quarantined, deleted and already resolved items cannot be confirmed', async () => {
  for (const patch of [{ uploadSource: 'employee' }, { status: 'quarantined' }, { deletedAt: new Date() },
    { inboundClassificationJson: { outcome: 'attached_manually', method: 'manual_review', decidedByUserId: 'reviewer-a' } },
    { inboundClassificationJson: { outcome: 'malformed' } }]) {
    reset(); Object.assign(document, patch);
    await assert.rejects(review.reviewInboundAttachment(input('confirm', { typeRef: validType.typeRef })));
    assert.equal(updates.length, 0);
  }
});
const workspace = fs.readFileSync(path.join(root, 'src/components/catalyst-one/document-workspace/document-workspace.tsx'), 'utf8');
const ops = fs.readFileSync(path.join(root, 'src/components/catalyst-one/document-workspace/document-workspace-ops-bar.tsx'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src/components/catalyst-one/document-workspace/document-workspace-inbound-review.tsx'), 'utf8');
assert.ok(workspace.includes('onEmail={() => onAction("custom_email")}'));
assert.ok(workspace.includes('if (id === "custom_email" || id === "template_email")'));
assert.ok(ops.includes('<Mail className=') && ops.includes('onClick={onEmail}') && ops.includes('flex flex-wrap'));
assert.ok(ui.includes('pending.current = true') && ui.includes('if (!response.ok)') && ui.includes('mounted.current'));
assert.ok(ui.includes('typeRefs[item.documentId]') && ui.includes('reasons[item.documentId]'));
assert.ok(workspace.includes('hydrateDocumentRegistryFromServer({ opportunityId: lockedOpportunityId })'));
console.log('PASS Quick Email shares existing action; responsive/pending/per-item/error/refresh wiring (source checks only)');
for (const filename of ['src/components/catalyst-one/document-workspace/document-workspace-inbound-review.tsx',
  'src/components/catalyst-one/document-workspace/document-workspace-ops-bar.tsx',
  'src/components/catalyst-one/document-workspace/document-workspace.tsx', 'src/app/api/document-workspace/refinement-014/route.ts']) {
  const result = ts.transpileModule(fs.readFileSync(path.join(root, filename), 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true,
  });
  assert.equal(result.diagnostics.filter((row) => row.category === ts.DiagnosticCategory.Error).length, 0);
}
console.log('PASS Changed UI and route files transpile without syntax errors');
console.log('Fixture service proofs passed; live DB, rendered UI and browser proofs are outside this harness.');
