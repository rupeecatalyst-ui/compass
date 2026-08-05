# CO-DOC-005 — Enterprise Document Package Registry

**Status:** Implementation Complete (code) · **Migration PENDING APPROVAL** · **No deploy**  
**Date:** 2026-07-29  
**Supersedes local-only package behaviour from CO-DOC-003 / RCA CO-DOC-004**

## Change control

- Upload Files path unchanged.
- Document Registry binary sink unchanged.
- **No migration executed.**
- **No Vercel / production deploy.**
- No live transactional data modified by this change set.

## What was delivered

### First-class Package Registry
- Types: Package ID, name, parent entity, opportunity/loan file, uploaded by/on, file count/size, status, version, storage status, audit timeline.
- Local cache key upgraded to `catalyst.document-packages.v2` (auto-migrates v1).
- Durable API: `GET/POST /api/enterprise-document-packages` (soft-fails with 503 until migrate).
- Prisma models: `EnterpriseDocumentPackage`, `EnterpriseDocumentPackageAudit`.

### Folder upload
1. Create package → upload children with `packageId` → update metadata → sync package to server (best-effort) → display in workspace.

### Preview engine
- Package Preview uses **Document Registry record → blobId** (`DocumentRegistryRecordPreviewDialog`).
- Checklist typeRef viewer remains for checklist UX only.

### Hydration
- After document hydrate, `hydrateDocumentPackagesFromServer` loads packages.
- `reconstructPackagesFromRegistryRecords` rebuilds packages from child `packageId` stamps when durable rows missing (no document duplication).

### Large files
- `storageStatus`: `durable_inline` | `durable_object` | `mixed`.
- Files &gt;4MB are not inlined to Postgres (existing CO-DOC-002 rule); architecture marks durable object path for follow-up object storage.

### Search
- Command Palette + Mission Control Search Center surface Document Package hits (name, file name, opportunity, uploader).
- API `GET /api/enterprise-document-packages?q=` for durable search post-migrate.

## Schema / migration (prepared)

`prisma/migrations/20260729160000_co_doc_005_document_package_registry/migration.sql`

Includes:
- `enterprise_document_packages`
- `enterprise_document_package_audits`
- Optional ETD `package_id` / `package_relative_path` columns (Prisma ETD fields **not** activated yet to protect CO-DOC-002 until migrate)

## Verify

```bash
npm run verify:co-doc-005
```

## BAT checklist (after migrate + deploy approval)

1. Upload Files still works (unchanged).
2. Upload Folder → package appears with progress/completion.
3. Refresh browser → package still visible.
4. Logout/login → package still visible (requires migrate applied).
5. Open Folder → files listed; Preview opens via Registry blob.
6. Download Package ZIP.
7. Rename / Add Files / Replace / Delete (Manager).
8. Timeline events present.
9. Legacy non-package documents still accessible.
10. No duplicate registry rows after hydrate.

## Regression assessment

| Area | Risk |
|------|------|
| Upload Files | Low — untouched |
| CO-DOC-002 sync | Low — ETD Prisma fields not activated without migrate |
| Package API pre-migrate | Soft 503; local + reconstruct still work |
| Checklist viewer | Unchanged |
| Radar / Mission Control / Kanban | Unaffected |

## Next approval gates

1. Product Owner approve migration `20260729160000_co_doc_005_document_package_registry`
2. Ops apply migrate
3. Deploy for BAT
4. Optional follow-up: activate ETD `packageId` in Prisma + object storage for &gt;4MB
