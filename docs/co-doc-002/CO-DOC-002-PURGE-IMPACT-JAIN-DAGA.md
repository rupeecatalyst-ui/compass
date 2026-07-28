# CO-DOC-002 — Purge Impact: Priyesh Jain & Sandeep Daga

**Standard:** CO-QA-001 (E2E / regression evidence)  
**Date:** 2026-07-27  
**Verdict:** **Single global regression** — `purgeClientDemoBusinessDataIfNeeded()` wiped the shared Document Registry (`catalyst.document-registry.v1`) for **all** Opportunity documents in the browser, not only Priyesh Jain.

---

## Identities (Postgres)

| Customer | Opportunity | Opportunity ID | Contact ID |
|----------|-------------|----------------|------------|
| **Priyesh Jain** | `OPP-2026-000043` | `cms30bmw70003l8045fgp8fxt` | `cmrxevs0b0001l704lyfsj88k` |
| **Sandeep Daga** | `OPP-2026-000042` | `cms2vufve0005kt04ckevxu85` | `cms2vphsy0005ji04q0ikd89s` |

Sandeep also has Deal `DEAL-2026-000066` (gross stage `login`). Priyesh has no Deal row in this query.

---

## Mechanism (why both are in scope)

Document Registry metadata is a **single browser key** for the whole org session:

- Key: `catalyst.document-registry.v1`  
- Blobs: IndexedDB DB `catalyst-document-registry` / store `blobs`  
- Purge (before CO-DOC-002 fix): removed `DOCUMENT_REGISTRY_STORAGE_KEY` from **localStorage on every dashboard mount** when demo seeds are off (prisma / Vercel).

The purge is **not** opportunity-scoped. One `removeItem` clears **every** Opportunity’s document metadata in that browser profile — Jain, Daga, and any other uploads present at that time.

---

## Answers by question

### 1. Were documents originally uploaded?

| Opportunity | Evidence | Conclusion |
|-------------|----------|------------|
| **Priyesh Jain** | BAT: uploads appeared in-session, then Files=0 / Readiness=0% after navigate/refresh (`CO-DOC-002-RUNTIME-RETRACE`) | **Yes** — originally uploaded |
| **Sandeep Daga** | No Postgres document rows (none possible — durable table missing). Deal document links = `[]`. No snapshot document inventory. Business path reached Deal/login, consistent with prior Document Center use, but **server cannot prove file count**. | **Likely yes if uploaded in the certification browser** — same client path; **cannot prove count from DB**. User assertion of upload should be treated as in-scope for this regression. |

### 2. Were they stored in `catalyst.document-registry.v1`?

**Yes (architecture).** Before durable server sync, Document Center writes **only** to that localStorage registry (+ IndexedDB blobs). Both Opportunities used the same client SSOT. There was no alternate per-customer store.

### 3. Were they purged by `purgeClientDemoBusinessDataIfNeeded()`?

| Opportunity | Conclusion |
|-------------|------------|
| **Priyesh Jain** | **Yes** — confirmed by runtime re-trace (registry empty after mount purge). |
| **Sandeep Daga** | **Yes, if his records were in that browser’s registry** — same `removeItem(DOCUMENT_REGISTRY_STORAGE_KEY)` call. Not a separate bug. |

### 4. Are any IndexedDB blobs still present?

**Unknown from server** (browser-only).  

- Purge cleared **localStorage metadata only** — it did **not** delete IndexedDB.  
- Orphan blobs **may** remain under `catalyst-document-registry` → `blobs`.  
- Without registry metadata (`blobId` ↔ opportunity / filename / type), blobs cannot be reliably reattached to Jain vs Daga.  
- **Practical recovery via IndexedDB alone: No.**

### 5. Are any server-side records in `enterprise_transaction_documents`?

**No for both.**

Live DB check (2026-07-27):

- Table `enterprise_transaction_documents` → **does not exist**  
- Migration `20260727194500_co_doc_002_durable_transaction_documents` → **not applied**  
- Related doc tables present are masters / deal link stubs only; `enterprise_deal_document_links` for Daga’s deal → **empty**

Therefore neither Opportunity has durable server document recovery today.

### 6. Is recovery possible?

| Path | Possible? |
|------|-----------|
| Restore from `enterprise_transaction_documents` | **No** — table not live; never synced pre-fix |
| Reconstruct from IndexedDB orphans | **No** (reliable) — metadata gone |
| Re-upload after purge-fix + migration + deploy | **Yes** — required BAT path |

---

## Single regression statement (CO-QA-001)

This is **one regression**, not two customer-specific defects:

> All transaction documents uploaded to the client Document Registry **before** the durable server persistence fix were subject to deletion of `catalyst.document-registry.v1` by `purgeClientDemoBusinessDataIfNeeded()` on authenticated dashboard mount in prisma/Vercel mode. That includes **Priyesh Jain (`OPP-2026-000043`)**, **Sandeep Daga (`OPP-2026-000042`)**, and **any other Opportunities** whose documents lived only in that browser registry.

Module status remains **OPEN** until CO-DOC-002 E2E Scenario Pack passes on the live app (re-upload → navigate → refresh → Files > 0), after migration apply + deploy of the purge exclusion + server sync.

---

## Ops checklist (shared)

1. Apply `prisma/migrations/20260727194500_co_doc_002_durable_transaction_documents/`  
2. Deploy build that excludes Document Registry from demo purge + enables server sync  
3. Re-upload documents for **both** Opportunities (and any others known to have been uploaded pre-fix)  
4. Run `CO-DOC-002-E2E-001` (and a second scenario for Daga / cross-opportunity if desired) under CO-QA-001  

---

## Evidence scripts

- `scripts/co-doc-002-purge-impact-jain-daga.mjs`  
- `scripts/co-doc-002-purge-impact-followup.mjs`  
