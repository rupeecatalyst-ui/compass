# CO-C1-DOCUMENT-WORKSPACE-CONTACT-CENTRIC-013

Status: **Implementation complete (local)** · Hostinger production **unchanged**  
Title: Context-Locked Contact-Centric Document Workspace  
Base: `origin/compass-hl03-conversation-first` = `2a1c2a5b658281db3cace0d84932b3394d1d5410`  
Worktree: `.tmp/wt-document-workspace-refinement-13` · Branch: `co-c1-document-workspace-refinement-013`

## Hold

Product Programme authenticated production smoke is **not** certified (`401 INVALID_CREDENTIALS` on `CATALYST_BAT_*`). This workstream therefore **must not** push to `origin/compass-hl03-conversation-first` or Hostinger-deploy.

`CO-CHANAKYA-RELEASE-FREEZE-015` remains in force.

## What shipped (local)

Contact-centric opener (extends 012):

- Compact 3 / 2 / 1 Opportunity cards
- Largest text is the Contact name, or Company name when a canonical `companyId` is present
- **Open Contact** → Contact 360 / Company 360 via canonical IDs only
- **View Documents** locks that Opportunity or nested Deal
- Nested Deal cards remain grouped by Opportunity ID
- Lender logo with initials fallback
- Category-level readiness (multiple files in one category do not inflate %)
- Recently created = last 30 days
- Opening a card does not mutate stage, assignment, records, or communications

Context-locked desk (extends 008):

- Grid stays on the left (lg); right desk ≥ 50vw (`lg:min-w-[50vw]`), expand to full, mobile fullscreen
- Deep links with `opportunityId` / `dealId` still open the desk
- Locked header: party, Opportunity, Deal, product, lender, stage, RC employee, readiness
- Ops: Add Document, Folder Upload, Other Documents, Attach inbound
- Row ops: Preview, Replace (reason + new version), Remove (confirm), Email (Outbox + paused countdown), Mark Received, Note
- Existing Action Centre / request / lender pack / review retained
- Registry SSOT only; `reclassifyDocumentRegistryRecord` refuses cross-Opportunity / Deal attach

## Safety

| Guard | Result |
|---|---|
| Enterprise Document Registry remains the only document store | Yes |
| New Prisma migration | **None** (`prisma/schema.prisma` and `prisma/migrations` untouched) |
| `prisma migrate deploy` / `db push` / `migrate resolve` | Not run |
| Email live send | Not run (`queueOutboxMessage` + `pauseOutboxCountdown`) |
| Marketing execution | `ENTERPRISE_MARKETING_EXECUTION_ENABLED = false` |
| Push / Hostinger / production env | **Not run** |
| Next production `npm run build` | **Skipped** — the build script includes `prisma-migrate-deploy-on-build` |

## Local BAT

| Gate | Result |
|---|---|
| `verify:co-c1-document-workspace-contact-centric-013` | PASS |
| `verify:co-c1-document-workspace-card-grid-012` | PASS |
| `verify:co-c1-document-workspace-001` | PASS |
| `verify:co-c1-context-locked-document-workspace-008` | PASS |
| `verify:co-advantage-committed` | PASS |
| `verify:co-product-program-operations-001` | PASS (`ok: true`) |
| Scoped ESLint `--max-warnings 0` on changed TS/TSX | PASS |
| `prisma validate` (dummy local URLs only; no production URL printed) | PASS |
| `tsc --noEmit` (`--max-old-space-size=8192`) | PASS (re-confirmed 2026-09-08 after `cn` import; empty compiler output) |
| Visual capture desktop 1440 / tablet 768 / mobile 390 | PASS — desk ≥ 50% viewport (720 / 384 / 390) |
| Secret scan of changed Document Workspace files | PASS — no keys / private PEM / BAT password |
| Authenticated Hostinger smoke | **Blocked** — predecessor Product Programme BAT credentials invalid |

## Visual evidence

- `docs/co-c1-document-workspace-contact-centric-013/visual-layout.html`
- `docs/co-c1-document-workspace-contact-centric-013/visual-desktop.png` + `.json`
- `docs/co-c1-document-workspace-contact-centric-013/visual-tablet.png` + `.json`
- `docs/co-c1-document-workspace-contact-centric-013/visual-mobile.png` + `.json`

Desktop desk width 720 / 1440. Tablet 384 / 768. Mobile fullscreen 390 / 390.

## Reviewable commits (local only · not pushed)

1. `93f4055` — contact-centric grid
2. `786d0ee` — locked operations workspace
3. This evidence commit — BAT report, Scenario Pack, verify script, screenshots

## Known follow-ups (not blocking this local close)

- Folder upload currently maps files to `doc:other:…` rather than full EDIE classify
- Preview / Action Centre remains sheet + half preview, not a permanent three-pane
- Authenticated production smoke of Document Workspace is deferred until Product Programme reports **PRODUCT PROGRAMMES AND ADVANTAGE COMMITTED — PRODUCTION CERTIFIED**

## Production

Hostinger and production git remain at Product Programme HEAD `2a1c2a5`. This branch was **not** fast-forwarded.
