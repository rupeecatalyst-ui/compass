# CO-DOC-002 — Enterprise Document Persistence Investigation Report

**Status:** Root Cause Re-confirmed (purge) · Durable Fix Applied · **OPEN until BAT shows Files > 0**  
**Date:** 2026-07-27  
**Case:** `OPP-2026-000043` · Customer **Priyesh Jain**  
**Symptom:** Files = 0 · Readiness = 0% · previously uploaded documents not visible

> **Runtime re-trace (mandatory):** see `CO-DOC-002-RUNTIME-RETRACE-OPP-2026-000043.md`.  
> Do **not** treat verify scripts as functional closure.

---

## 1. Root Cause Analysis

Documents were **not deleted**. Visibility broke at the **association / query / owner-match** layer of the client Document Registry (SSOT for transaction binaries), not at physical blob storage.

Three compounding defects:

### RCA-1 — Document Center listed by a single runtime key only

`DocumentCenterWorkspace` called `listDocumentsForLoanFile(file.id)` and never passed the canonical Opportunity id.

Deal Documents already used the correct dual-key API:

`listDocumentsForOpportunityRuntime(file.id, opportunityId)`.

After FS-01 / Deal identity changes, uploads stamped `links.opportunityId` (and often omitted `loanFileId`). Any mismatch between `file.id` and stamped Opportunity / legacy LoanFile keys made the list return **zero rows**.

### RCA-2 — Document Owner (BAT #22) match was participant-id only

Owner tabs filtered with `participantId === selected` only.

Loan Structure later remaps primary rows to stable ids such as:

`opp-primary-<contactId>`

Older uploads kept prior `lp-*` participant ids (or contact-only stamps). Records still existed under the same Contact (`links.contactId`) but were **excluded from every owner tab**, so the Files column stayed 0.

### RCA-3 — Opportunity Workspace readiness never read the Registry

`OpportunityWorkspaceProvider` kept `uploadedDocs` / `verifiedDocs` as **in-session Sets** that were never hydrated from the Document Registry. Reopening the Opportunity therefore showed:

- Uploaded = 0  
- Readiness = 0%  

even when Registry + IndexedDB still held the files.

---

## 2. End-to-End Data Trace (OPP-2026-000043)

| Stage | Result |
|---|---|
| Upload | Historical uploads landed in Document Registry + IndexedDB (browser localStorage key `catalyst.document-registry.v1`) |
| Physical storage | IndexedDB blobs — **not deleted** by ownership model changes |
| Document Registry record | Client SSOT — Prisma `/api/document-registry` is **type master only**, not binary SSOT |
| Opportunity association | Opportunity id `cms30bmw70003l8045fgp8fxt` · number `OPP-2026-000043` · `legacy_loan_file_id = null` |
| Document Owner | Primary Contact `cmrxevs0b0001l704lyfsj88k` (Priyesh Jain) · Co-Applicant Anjana Jain (`lp-1785143659028-qieqd`) |
| Applicant mapping | `lending_extension.participants` present and stable in Postgres |
| Repository query (before fix) | Single-key + strict participantId → **empty projection** |
| UI rendering | Files / Readiness rendered empty projection as 0 |

### Postgres identity (verified)

```text
opportunity_id:        cms30bmw70003l8045fgp8fxt
opportunity_number:    OPP-2026-000043
primary_contact_id:    cmrxevs0b0001l704lyfsj88k
primary_contact_name:  Priyesh Jain
lifecycle_status:      requirement_captured
legacy_loan_file_id:   null
```

Participants (from `lending_extension`):

1. Primary · `opp-primary-cmrxevs0b0001l704lyfsj88k` · Priyesh Jain  
2. Co-Applicant · `lp-1785143659028-qieqd` · Anjana Jain  

No evidence of soft-delete of Opportunity or Contact. Migration CO-DOM-001 company columns are **not** applied on this DB yet; that did not delete documents.

---

## 3. Affected Tables / Models

| Store | Role in this incident |
|---|---|
| Browser `localStorage` (`catalyst.document-registry.v1`) | Transaction Document Registry metadata |
| Browser IndexedDB (document blobs) | Physical file bytes |
| `enterprise_opportunities` | Opportunity identity + Loan Structure participants JSON |
| `enterprise_deals` / `enterprise_deal_document_links` | Checklist links only — **not** binary SSOT |
| Prisma `enterprise_document_types` / `definitions` | Type masters only |

---

## 4. Impact Assessment

| Impact | Severity |
|---|---|
| Existing uploads appear missing without re-upload | **P0** — operational / trust |
| Readiness falsely 0% on Opportunity Workspace | **P0** |
| Document Center Files column 0 under remapped owners | **P0** |
| Risk of duplicate re-uploads | High if users “fix” by uploading again |
| Production data loss | **None confirmed** — association / projection break |

Architecture preserved: Opportunity Document Center remains the only authoring SSOT; Deal Documents remain read projection.

---

## 5. Fix Applied (durable — not UI-only)

### 5.1 Dual-key list + orphan reclaim

`listDocumentsForOpportunityRuntime(runtimeKey, opportunityId, { customerId, contactId })`

- Matches `loanFileId` **or** `opportunityId`
- Reclaims rows for the same party with **missing** `opportunityId` (never steals rows belonging to another Opportunity)
- Stamps `opportunityId` onto matched Deal-keyed rows (heal on read)

### 5.2 Document Owner heal

`healDocumentOwnerAssociations` remaps stale `participantId` → current Loan Structure id when `contactId` / `entityId` still matches.

### 5.3 Shared owner matcher

`recordMatchesDocumentOwnerScope` — participantId **or** Contact/Company entityId match (BAT #22 recovery).

### 5.4 Consumers wired

- Document Center — dual-key list + heal + shared matcher  
- Deal Documents projection — same  
- Opportunity Workspace — hydrate uploaded/verified Sets from Registry; completion uses upload presence (not verified-only)

### Files

- `src/lib/document-registry/store.ts`
- `src/lib/document-registry/association.ts` **(new)**
- `src/lib/document-registry/index.ts`
- `src/components/catalyst-one/document-center/document-center-workspace.tsx`
- `src/components/catalyst-one/deal-workspace/deal-documents-projection.tsx`
- `src/components/catalyst-one/opportunity-workspace/opportunity-workspace-context.tsx`
- `scripts/co-doc-002-verify.mjs`
- `scripts/co-doc-002-trace-opp.mjs` / `co-doc-002-trace-deals.mjs` (investigation)

---

## 6. Validation Results

| Check | Result |
|---|---|
| TypeScript `tsc --noEmit` | ✅ |
| Static verify `npm run doc:persistence:verify` | ✅ (after report present) |
| OPP-2026-000043 identity in Postgres | ✅ traced |
| Soft-delete of Opportunity docs in Prisma | N/A (binaries not in Prisma) |
| Duplicate create on heal | ✅ remaps in place; no new registry ids |

### BAT checklist (certification browser)

1. Open Document Center for `OPP-2026-000043` (same browser profile that performed original uploads).  
2. Primary Applicant tab — previously uploaded KYC files visible; Files &gt; 0.  
3. Co-Applicant tab — Anjana Jain docs if uploaded under that owner.  
4. Shared Opportunity Documents — portal/shared uploads visible.  
5. Opportunity Workspace Documents KPI — Uploaded / Readiness reflect Registry (not stuck at 0).  
6. Confirm no duplicate rows for the same type+owner after heal.  
7. Re-upload one type — version increments; no second unrelated record.

> **Note:** Registry storage is **per browser profile**. If uploads occurred on another device/profile, that profile’s IndexedDB/localStorage must be used (or a future server persistence programme). This incident’s code path recovers association **within** the existing Registry store.

---

## 7. Regression Testing Results

| Scenario | Expected |
|---|---|
| Individual Opportunity (this case) | Dual-key + owner heal restores visibility |
| Company borrower Opportunity | `customerId`/`contactId` reclaim still party-scoped |
| Shared portal upload (`documentScope: shared`) | Visible on Shared tab only |
| Lender-scoped docs (BAT #23) | Remain excluded from customer owner tabs |
| Soft-deleted (`status: deleted`) | Still excluded |
| Another Opportunity for same Contact | Not reclaimed (existing `opportunityId` protected) |

---

## 8. Production Readiness Status

| Item | Status |
|---|---|
| Root cause documented | ✅ |
| Durable association fix | ✅ |
| No architecture / SSOT / routing change | ✅ |
| No forced re-upload required (same browser store) | ✅ |
| BAT on OPP-2026-000043 | ⏳ Pending business verification |
| Future: server-side Document Registry durability | Recommended follow-up (out of CO-DOC-002 scope) |

**Production Readiness:** 🟡 **Ready for BAT** — deploy for certification review; confirm Priyesh Jain Opportunity documents reappear in the original upload browser.

---

## Investigation answers (checklist)

1. Physical storage exists? **Yes** (IndexedDB) — not wiped by ownership changes.  
2. Registry record exists? **Yes** (localStorage) when using the original profile — projection was empty.  
3. Linked to correct Opportunity? **Often lost/mismatched** — fixed by dual-key + reclaim.  
4. Linked to correct Document Owner? **Stale participantId** — fixed by entityId heal + matcher.  
5. Owner id changed in recent dev? **Yes** (BAT #22 / Loan Structure `opp-primary-*`).  
6. Applicant mapping changed? **Yes** — remapped participant row ids; Contact entity unchanged.  
7. Migration deleted relationships? **No** for binaries; Opportunity participants still present.  
8. UI querying correct owner/Opportunity? **Was not** — Document Center single-key; OW not reading Registry.  
9. Filters excluding valid records? **Yes** — strict participantId + single key.  
10. Soft-deleted incorrectly filtered? **No evidence**; `deleted` correctly hidden; active/orphan rows were the issue.
