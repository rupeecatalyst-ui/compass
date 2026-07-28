# CO-DOC-002 — Runtime Re-trace Addendum (OPP-2026-000043)

**Status:** OPEN until documents are visible again after re-upload on fixed build  
**Date:** 2026-07-27 (runtime re-investigation)  
**Case:** `OPP-2026-000043` · Priyesh Jain · Files=0 · Readiness=0%

---

## Live runtime verdict

The prior association/heal fix was **necessary but insufficient**.

A second defect **deleted Document Registry metadata on every authenticated dashboard mount** in prisma / Vercel mode. That is why BAT still saw Files = 0 after the first fix.

---

## Runtime trace (OPP-2026-000043)

| Stage | Live result |
|-------|-------------|
| 1. Storage (Postgres Opportunity) | ✅ Present — `cms30bmw70003l8045fgp8fxt` · `OPP-2026-000043` · contact `cmrxevs0b0001l704lyfsj88k` · participants in `lending_extension` |
| 2. Browser Document Registry (`catalyst.document-registry.v1`) | ❌ **Wiped** by `purgeClientDemoBusinessDataIfNeeded()` whenever demo seeds are disabled |
| 3. IndexedDB blobs (`catalyst-document-registry`) | ⚠️ May still hold orphan blobs; metadata keys required to surface them — association lost after purge |
| 4. Opportunity association | N/A after purge — no local records to associate |
| 5. Owner association | N/A after purge |
| 6. Repository query | Returns `[]` because localStorage snapshot is empty |
| 7. UI | Correctly renders empty projection → Files=0 · Readiness=0% |
| 8. Browser profile | Correct profile was likely used; **purge ran inside that profile** and erased the registry |

### Smoking gun

```ts
// src/lib/demo-seed/purge-client-demo-data.ts (BEFORE fix)
DOCUMENT_REGISTRY_STORAGE_KEY, // ← wiped on every dashboard mount when demo seeds OFF
```

Called from `dashboard-layout.tsx` on mount. On Vercel / `ENTERPRISE_PERSISTENCE_MODE=prisma`, `isDemoSeedEnabled()` is false → purge always runs → **all Opportunity documents disappear after refresh / navigation**.

This matches the user’s observation exactly: uploads appear during the session, then Files=0 on re-open.

---

## Answers to verification questions

1. **Is the Document Registry returning records?** — No (empty after purge).  
2. **Is the Opportunity ID matching?** — Opportunity id is correct in Postgres; client had nothing left to match.  
3. **Is the Document Owner matching?** — N/A after purge.  
4. **Is the UI receiving the records?** — Yes: receives `[]`.  
5. **Is the UI filtering them out?** — No filter bug once empty; earlier owner-match bugs were real but secondary.  
6. **Are localStorage / IndexedDB records present?** — localStorage registry **cleared by purge**; IndexedDB blobs may remain orphaned.  
7. **Is hydration running?** — Yes (OW + Document Center hydrate), but against an empty store.  
8. **Is the browser profile read correctly?** — Yes; purge targeted the live profile.

---

## Fixes applied in this re-open

| Fix | Purpose |
|-----|---------|
| Remove Document Registry from demo purge list | Stop wiping live uploads |
| Durable Postgres `enterprise_transaction_documents` | Survive browser clear / device change |
| Upload → server sync (best-effort) | Persist metadata (+ content ≤4MB) |
| Document Center / OW hydrate from server | Restore into local registry on open |
| Stronger alias reclaim (opportunity number + contact) | Association layer still hardened |

### Manual ops required

1. Apply migration `prisma/migrations/20260727194500_co_doc_002_durable_transaction_documents/`  
2. Deploy this build (do not rely on verify scripts alone)  
3. **Re-upload documents for OPP-2026-000043** — prior localStorage metadata was destroyed by purge; binaries cannot be reliably reconstructed without metadata  

---

## Functional closure criteria (not yet met until BAT)

- [ ] Migration applied  
- [ ] Build deployed  
- [ ] Open OPP-2026-000043 Document Center  
- [ ] Upload at least one Primary Applicant document  
- [ ] Refresh / navigate away and back  
- [ ] Files > 0 and Readiness > 0% still visible  
- [ ] Second browser or hard refresh still shows metadata via server hydrate  

**CO-DOC-002 remains OPEN until the above BAT passes.**
