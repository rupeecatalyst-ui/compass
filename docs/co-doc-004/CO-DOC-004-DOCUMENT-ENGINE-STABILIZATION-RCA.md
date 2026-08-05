# CO-DOC-004 — Enterprise Document Engine Stabilization

**Status:** Investigation Complete · **No implementation** · Awaiting approval  
**Date:** 2026-07-29  
**Constraint:** Read-only — no code changes, no migrate, no deploy, no live data mutation

---

## 1. Symptoms

1. Folder Upload creates **child documents**, but the **Document Package** is not consistently visible or recoverable after refresh / logout-login / registry reload.
2. **Preview** fails (or is unreliable) for package contents.

---

## 2. Root Cause Analysis

### 2.1 Primary — Package is not a durable enterprise object

| Layer | Behaviour |
|-------|-----------|
| Create | `createDocumentPackage` writes **only** to `localStorage` key `catalyst.document-packages.v1` |
| Children | `uploadDocumentToRegistry` stamps `links.packageId` and syncs docs via CO-DOC-002 (best-effort) |
| Server | `packageId` / `packageRelativePath` sent by client are **ignored** by upsert (not in Prisma model) |
| Migration | `20260729140000_co_doc_003_document_package_upload` is **PREPARED ONLY — not executed** |
| Hydrate | `hydrateDocumentRegistryFromServer` restores **documents only** — never packages |
| Merge | `mergeDurableDocumentsIntoLocalRegistry` rebuilds links **without** package stamps |
| UI | `DocumentPackagesPanel` returns `null` when package list is empty → section disappears |

**Result:** After refresh on a clean cache / new session where CO-DOC-002 hydrate succeeds, **files reappear** but the **package does not**. Users see orphaned checklist/registry files without a recoverable Package container.

### 2.2 Secondary — Preview path is not record-scoped

Package panel Preview calls:

```text
onPreviewRecord → openViewer(record.typeRef)
```

Viewer resolves `viewerItem` from checklist `flatItems` / `otherDocs`, then loads:

```text
versionsMap[typeRef]  // owner-scoped registryRecords
```

Failures:

1. **typeRef**, not registry `record.id` — wrong file when multiple share a type; unmatched typeRefs → overlay never opens.
2. **Scoped versionsMap** vs unscoped package file list — Document Owner mismatch → empty versions.
3. **Missing IndexedDB blobs** after metadata-only hydrate (`contentBytes` only if ≤4MB) → “Preview unavailable”.

### 2.3 Lifecycle checklist

| Step | Result |
|------|--------|
| 1. Folder selected | OK |
| 2. Package created | OK (local) |
| 3. Package persisted (enterprise) | **FAIL** |
| 4. Child documents created | OK |
| 5. Registry updated | Partial (docs yes; package no) |
| 6. Package loaded after refresh | **FAIL** (typical) |
| 7. Package rendered | **FAIL** if store empty |
| 8. Preview resolution | **FAIL** often |
| 9. Storage references | Fragile (IndexedDB + optional 4MB Postgres) |
| 10. Download ZIP | Requires local package + local blobs |

### 2.4 Validation answers

| Question | Answer |
|----------|--------|
| Package metadata only in client memory? | **Yes** — localStorage authoring cache |
| Package metadata enterprise-persisted? | **No** |
| Children correctly linked to packageId? | **Locally at upload**; **not** durable on server; hydrate drops stamps |
| Preview valid storage refs? | **Often no** |

---

## 3. Evidence (key paths)

| Concern | Path |
|---------|------|
| Package store | `src/lib/document-package/store.ts` |
| Folder upload | `src/lib/document-package/index.ts` → `uploadFolderAsDocumentPackage` |
| Workspace wiring | `src/components/catalyst-one/document-center/document-center-workspace.tsx` |
| Panel hide-when-empty | `document-packages-panel.tsx` |
| Doc sync (ignores package) | `src/lib/document-registry/server-sync.ts` |
| Hydrate merge | `src/lib/document-registry/store.ts` → `mergeDurableDocumentsIntoLocalRegistry` |
| Prepared migration | `prisma/migrations/20260729140000_co_doc_003_document_package_upload/migration.sql` |
| CO-DOC-003 readiness | `docs/co-doc-003/CO-DOC-003-DOCUMENT-PACKAGE-UPLOAD-READINESS-REPORT.md` |

---

## 4. Recommended implementation (NOT approved / NOT implemented)

Make **Document Package a first-class durable Enterprise object** while preserving the single document binary sink:

1. **Approve and apply** additive migration (prepared CO-DOC-003 SQL or successor):  
   `enterprise_document_packages` + ETD `package_id` / `package_relative_path`.
2. **Activate Prisma** + extend durable document upsert/list to persist package stamps.
3. **Package sync API** — create/update/soft-delete; client upserts package after local write (mirror CO-DOC-002).
4. **Hydrate** — load packages by Opportunity **or** reconstruct from child `packageId` groups when package row missing.
5. **Preview** — open by **`registryRecordId`** / current version `blobId`; keep typeRef viewer for checklist-only UX.
6. **Binary durability** — object storage path for files &gt;4MB (do not rely solely on `contentBytes`).
7. Keep **Upload Files** unchanged; package remains grouping metadata over Document Registry.

---

## 5. Regression impact

| Surface | If fixed additively | If Prisma activated without migrate |
|---------|---------------------|-------------------------------------|
| Upload Files | Unaffected | N/A |
| Document Center checklist | Unaffected | N/A |
| CO-DOC-002 sync | Must store new columns safely | **Breaks** document sync |
| Customer portal | No package coupling today | Avoid exposing local-only packages |
| Radar / Mission Control / Kanban | Unaffected | Unaffected |

---

## 6. Disposition

| Item | Status |
|------|--------|
| RCA complete | ✅ |
| Implementation | ❌ Awaiting Product Owner approval |
| Migration executed | ❌ Not executed |
| Deploy | ❌ Not performed |

**Next step:** Approve implementation scope (durable package + preview-by-record + hydrate) before any code change.
