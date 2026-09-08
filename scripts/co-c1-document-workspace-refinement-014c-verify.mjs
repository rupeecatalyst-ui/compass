/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014C
 * Recoverable deletion, durable audit, ephemeral cache, effective upload limit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROLES } from "../src/constants/roles.ts";
import {
  DOCUMENT_WORKSPACE_EFFECTIVE_UPLOAD_MAX_BYTES,
  DOCUMENT_WORKSPACE_MALWARE_SCANNING_ENABLED,
  DOCUMENT_WORKSPACE_SHARE_ZIP_MAX_BYTES,
  DOCUMENT_WORKSPACE_UPLOAD_MAX_BYTES,
} from "../src/constants/document-workspace-security.ts";
import { DOCUMENT_REGISTRY_MAX_BYTES } from "../src/constants/document-registry/index.ts";
import { ETD_OBJECT_STORAGE_MAX_BYTES } from "../src/constants/enterprise-document-object-storage/index.ts";
import { DOCUMENT_WORKSPACE_ZIP_MAX_BYTES } from "../src/constants/document-workspace-refinement-014.ts";
import { DOCUMENT_WORKSPACE_DESK_SHEET_CLASSNAME } from "../src/constants/document-workspace-refinement-014.ts";
import {
  DOCUMENT_WORKSPACE_DELETION_RETENTION_DAYS_DEFAULT,
  DOCUMENT_WORKSPACE_STATUS_DELETED,
  DOCUMENT_WORKSPACE_STATUS_ELIGIBLE_FOR_PURGE,
  DOCUMENT_WORKSPACE_STATUS_SUPERSEDED,
  resolveDocumentWorkspaceRetentionDays,
} from "../src/constants/document-workspace-lifecycle.ts";
import {
  buildDeletionLifecyclePatch,
  decideCanMoveToDeleted,
  decideCanRestoreDeleted,
  decideDeletionReason,
  decidePermanentPurge,
  decidePurgeEligibility,
  decideRestoreTargetStatus,
  findNewerActiveReplacement,
} from "../src/lib/document-workspace/lifecycle-decision.ts";
import { sanitizeDocumentWorkspaceAuditMetadata } from "../src/lib/document-workspace/audit-sanitize.ts";
import { resolveDocumentWorkspaceMalwareScanStatus } from "../src/lib/document-workspace/malware-status.ts";
import { capabilityAllowed } from "../src/lib/document-workspace/access-decision.ts";
import { validateDocumentWorkspaceUpload } from "../src/lib/document-workspace/file-security.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function expect(name, condition) {
  if (condition) console.log(`PASS  ${name}`);
  else {
    failures.push(name);
    console.log(`FAIL  ${name}`);
  }
}

function mustContain(rel, needle, label = needle) {
  expect(`${rel} contains ${label}`, read(rel).includes(needle));
}

function mustNotContain(rel, needle, label = needle) {
  expect(`${rel} omits ${label}`, !read(rel).includes(needle));
}

expect("014A desk width unchanged", DOCUMENT_WORKSPACE_DESK_SHEET_CLASSNAME.includes("min-[1280px]:w-[55vw]"));
expect(
  "registry advertised max remains 25MB",
  DOCUMENT_WORKSPACE_UPLOAD_MAX_BYTES === DOCUMENT_REGISTRY_MAX_BYTES,
);
expect(
  "effective upload max is min(25MB, 16MB)",
  DOCUMENT_WORKSPACE_EFFECTIVE_UPLOAD_MAX_BYTES ===
    Math.min(DOCUMENT_REGISTRY_MAX_BYTES, ETD_OBJECT_STORAGE_MAX_BYTES) &&
    DOCUMENT_WORKSPACE_EFFECTIVE_UPLOAD_MAX_BYTES === 16 * 1024 * 1024,
);
expect(
  "zip share cap stays 50MB and separate",
  DOCUMENT_WORKSPACE_SHARE_ZIP_MAX_BYTES === DOCUMENT_WORKSPACE_ZIP_MAX_BYTES &&
    DOCUMENT_WORKSPACE_EFFECTIVE_UPLOAD_MAX_BYTES !== DOCUMENT_WORKSPACE_ZIP_MAX_BYTES,
);
expect("malware scanning remains off", DOCUMENT_WORKSPACE_MALWARE_SCANNING_ENABLED === false);
expect(
  "disabled scanner never reports passed",
  resolveDocumentWorkspaceMalwareScanStatus({ scanningEnabled: false, scannerResult: "passed" }) ===
    "not_configured",
);
expect("default retention is 30 days", resolveDocumentWorkspaceRetentionDays(null) === DOCUMENT_WORKSPACE_DELETION_RETENTION_DAYS_DEFAULT);

expect("analyst cannot delete", !capabilityAllowed(ROLES.ANALYST, "delete"));
expect("manager can delete", capabilityAllowed(ROLES.MANAGER, "delete"));

const activeDoc = {
  id: "d1",
  status: "active",
  contentVersion: 1,
  typeRef: "pan",
  originalFilename: "pan.pdf",
  opportunityId: "opp1",
  participantId: "p1",
};
const analystDelete = decideCanMoveToDeleted({ role: ROLES.ANALYST, document: activeDoc });
expect("analyst move-to-deleted is 403", !analystDelete.ok && analystDelete.httpStatus === 403);
const managerDelete = decideCanMoveToDeleted({ role: ROLES.MANAGER, document: activeDoc });
expect("manager move-to-deleted allowed", managerDelete.ok);
const emptyReason = decideDeletionReason("  ");
expect("empty deletion reason rejected", !emptyReason.ok && emptyReason.httpStatus === 400);

const deletedDoc = { ...activeDoc, status: DOCUMENT_WORKSPACE_STATUS_DELETED };
const analystRestore = decideCanRestoreDeleted({ role: ROLES.ANALYST, document: deletedDoc });
expect("analyst restore is 403", !analystRestore.ok && analystRestore.httpStatus === 403);
const managerRestore = decideCanRestoreDeleted({ role: ROLES.MANAGER, document: deletedDoc });
expect("manager restore allowed", managerRestore.ok);

const newer = findNewerActiveReplacement({
  candidate: deletedDoc,
  siblings: [{ ...activeDoc, id: "d2", contentVersion: 2, status: "active" }],
});
expect("newer active sibling detected", newer?.id === "d2");
const restoreBlocked = decideRestoreTargetStatus({ document: deletedDoc, newerCurrent: newer });
expect(
  "restore behind newer version stays superseded",
  restoreBlocked.status === DOCUMENT_WORKSPACE_STATUS_SUPERSEDED && restoreBlocked.blockedByNewer,
);

const purge = decidePermanentPurge();
expect("ordinary purge is 403", !purge.ok && purge.httpStatus === 403 && purge.code === "PURGE_NOT_AUTHORISED");

const now = new Date("2026-09-08T00:00:00.000Z");
const expired = decidePurgeEligibility({
  status: DOCUMENT_WORKSPACE_STATUS_DELETED,
  retentionUntil: new Date("2026-08-01T00:00:00.000Z"),
  now,
});
expect(
  "expiry marks eligible_for_purge only",
  expired.eligible && expired.nextStatus === DOCUMENT_WORKSPACE_STATUS_ELIGIBLE_FOR_PURGE,
);

const patch = buildDeletionLifecyclePatch({
  actorUserId: "u1",
  reason: "duplicate",
  priorStatus: "active",
  deletedAt: now,
});
expect("deletion patch status is deleted", patch.status === DOCUMENT_WORKSPACE_STATUS_DELETED);
expect("deletion patch retains no binary fields", !("contentBytes" in patch) && !("storageKey" in patch));

const sanitized = sanitizeDocumentWorkspaceAuditMetadata({
  otp: "123456",
  token: "secret-token",
  contentBytes: "AAAA",
  email: "a@b.com",
  priorStatus: "active",
  requestedCount: 2,
});
expect(
  "audit metadata strips secrets",
  sanitized &&
    sanitized.priorStatus === "active" &&
    sanitized.requestedCount === 2 &&
    !("otp" in sanitized) &&
    !("token" in sanitized) &&
    !("contentBytes" in sanitized) &&
    !("email" in sanitized),
);

const pdfBytes = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const overEffective = validateDocumentWorkspaceUpload({
  filename: "kyc.pdf",
  declaredMime: "application/pdf",
  byteLength: DOCUMENT_WORKSPACE_EFFECTIVE_UPLOAD_MAX_BYTES + 1,
  bytes: pdfBytes,
});
expect("file above 16MB effective max rejected", !overEffective.ok && overEffective.code === "TOO_LARGE");

const migration = "prisma/migrations/20260908220000_co_c1_document_workspace_refinement_014c/migration.sql";
mustContain(migration, "ADD COLUMN IF NOT EXISTS", "additive columns");
mustContain(migration, "CREATE TABLE IF NOT EXISTS \"enterprise_document_workspace_audit_events\"", "audit table");
mustContain(migration, "CREATE TABLE IF NOT EXISTS \"enterprise_document_workspace_rate_limits\"", "rate-limit table");
mustContain(migration, "ON DELETE RESTRICT", "org FK restrict");
mustNotContain(migration, "DROP TABLE", "no table drops");
mustNotContain(migration, "DROP COLUMN", "no column drops");
mustNotContain(migration, "DELETE FROM", "no row deletes");
mustNotContain(migration, "TRUNCATE", "no truncate");
mustNotContain(migration, "content_bytes", "does not touch binaries");

const lifecycle = "server/services/document-workspace/document-workspace-lifecycle.service.ts";
mustContain(lifecycle, "Does not physically destroy binaries", "lifecycle comment");
mustContain(lifecycle, "refusePermanentPurge", "purge refusal");
mustNotContain(lifecycle, "contentBytes:", "lifecycle never clears inline bytes");
mustNotContain(lifecycle, "deleteObject", "no object-store delete");
mustNotContain(lifecycle, "physicallyPurged: true", "no physical purge flag");

mustContain("server/services/document-workspace/document-workspace-audit.service.ts", "enterpriseDocumentWorkspaceAuditEvent.create", "append-only audit create");
mustNotContain("server/services/document-workspace/document-workspace-audit.service.ts", ".update(", "audit has no update");
mustNotContain("server/services/document-workspace/document-workspace-audit.service.ts", ".delete(", "audit has no delete");

mustContain(
  "server/services/document-workspace/document-workspace-rate-limit.service.ts",
  "count: { increment: 1 }",
  "durable limiter upsert increment",
);
mustContain(
  "server/services/document-workspace/document-workspace-rate-limit.service.ts",
  "consumeUploadPortalRateLimit",
  "in-memory remains first-line only",
);
mustContain(
  "server/services/document-workspace/document-workspace-rate-limit.service.ts",
  "prisma.enterpriseDocumentWorkspaceRateLimit.upsert",
  "Postgres is authoritative limiter",
);

mustContain("src/lib/document-registry/blob-store.ts", "ephemeralBlobs", "in-memory blob map");
mustContain("src/lib/document-registry/blob-store.ts", "clearLegacyIndexedDbDocumentBlobs", "legacy IDB clear");
mustNotContain("src/lib/document-registry/blob-store.ts", ".put(", "no IndexedDB put");
mustContain("src/lib/api-client.ts", "clearEphemeralDocumentBlobs", "logout clears ephemeral blobs");
mustContain("src/lib/api-client.ts", "localStorage.removeItem(TOKEN_KEY)", "token key unchanged");
mustContain("src/lib/document-registry/authorised-binary.ts", "/api/enterprise-transaction-documents/binary?", "authorised binary URL");
mustNotContain("src/lib/document-registry/server-sync.ts", "saveDocumentBlob", "hydrate does not persist binaries");

mustContain("src/app/api/document-workspace/refinement-014/route.ts", 'view === "deleted"', "deleted list");
mustContain("src/app/api/document-workspace/refinement-014/route.ts", "move_to_deleted", "move action");
mustContain("src/app/api/document-workspace/refinement-014/route.ts", "restore_deleted", "restore action");
mustContain("src/app/api/document-workspace/refinement-014/route.ts", "refuseDocumentWorkspacePermanentPurge", "purge refused");
mustContain("src/app/api/enterprise-transaction-documents/route.ts", "A deletion reason is required", "ETD delete requires reason");
mustContain("src/app/api/document-workspace/upload-portal/route.ts", "Retry-After", "portal Retry-After");

const workspace = "src/components/catalyst-one/document-workspace/document-workspace.tsx";
mustContain(workspace, "DOCUMENT_WORKSPACE_DESK_SHEET_CLASSNAME", "desk class unchanged");
mustContain(workspace, "DOCUMENT_WORKSPACE_DELETED_DOCUMENTS_LABEL", "recycle bin inside desk");
mustContain(workspace, "deleteDocumentFromRegistry", "governed delete");
mustNotContain(workspace, "permanent_purge", "UI does not call purge");
mustContain("src/components/catalyst-one/document-workspace/document-workspace-ops-bar.tsx", "DOCUMENT_WORKSPACE_MOVE_TO_DELETED_LABEL", "move-to-deleted copy");
mustContain("src/components/catalyst-one/document-workspace/document-workspace-preview.tsx", "getDocumentPreviewUrl", "authorised preview");
mustContain("src/components/catalyst-one/document-workspace/document-workspace-preview.tsx", "revokeDocumentObjectUrl", "revoke object URLs");

if (failures.length) {
  console.error(`\nFAILED ${failures.length}`);
  process.exit(1);
}
console.log("\nPASS  CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014C");
