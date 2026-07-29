# CO-DOC-003 — Enterprise Document Package Upload

Status: **Implementation Complete (code)** · **Migration PENDING APPROVAL** · No production deploy

## Change control

- Extends Opportunity Document Center / Document Registry — does **not** replace File Upload.
- Contained files continue to use `uploadDocumentToRegistry` (single binary sink).
- **No migration executed.** SQL prepared at:
  `prisma/migrations/20260729140000_co_doc_003_document_package_upload/migration.sql`
- **No Vercel / production deploy** performed.
- Prisma schema model columns for `package_id` are **not** activated until migration approval (avoids breaking CO-DOC-002 sync against live DB).

## Upload options

| Action | Behaviour |
|--------|-----------|
| **Upload Files** | Unchanged — multi-file classify → per-file registry upload |
| **Upload Folder** | Creates a **Document Package**, preserves folder name, uploads each file into registry stamped with `packageId`, shows progress |

## Document Package UI

- Folder Name · File count · Total size · Uploaded By · Upload Date · Status
- Actions: Open Folder · Download Folder (ZIP) · Add More Files · Delete (Manager+)
- Open Folder: file name / type / size / date · Preview · Download · Replace · Delete

## Audit timeline (package-scoped)

Folder Uploaded · Folder Opened · File Added · File Replaced · File Deleted · Folder Deleted

## Approval required

1. Product Owner approve additive migration `20260729140000_co_doc_003_document_package_upload`
2. After migrate: wire `packageId` / `packageRelativePath` into Prisma model + durable upsert (optional Phase B)
3. BAT: Upload Files still works · Upload Folder creates package · Open / Download / Add / Delete

## Verify

```bash
node scripts/co-doc-003-verify.mjs
# or
npm run verify:co-doc-003
```
