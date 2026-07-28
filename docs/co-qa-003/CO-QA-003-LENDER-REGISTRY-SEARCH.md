# CO-QA-003 — Enterprise Lender Registry Search Regression

**Status:** OPEN until E2E BAT Pass (CO-QA-001)  
**Surface:** Strategy Workbench → Manual Recommendation (“Searching Enterprise Lender Registry…”)

---

## 1. Root Cause Analysis

### Symptom

User types a lender name (e.g. ICICI) → UI stays on **“Searching Enterprise Lender Registry…”** / returns no selectable lenders → Deal creation blocked.

### What is NOT broken

Live Postgres (pilot org `rupee-catalyst`) **contains** active lenders, including:

| Code | Label | Status |
|------|-------|--------|
| ICICI | ICICI Bank | active |
| LND-P2A-ICICI | ICICI | active |
| HDFC | HDFC Bank | active |
| SBI | State Bank of India | active |
| AXIS | Axis Bank | active |
| KOTAK | Kotak Mahindra Bank | active |

Search SQL for `ICICI` with `status=active&enabled=true&lifecycle=active` returns rows.

### Root causes (confirmed)

1. **Auth refresh waiter hang (primary for perpetual “Searching…”)**  
   `authenticatedJsonFetch` queued concurrent 401 retries on `subscribeTokenRefresh`, but on **refresh failure** never flushed waiters → promises hang forever → `registryLoading` never clears.

2. **Silent API failure → empty list**  
   `listApiPublished` swallowed non-OK / parse errors as `[]`. Manual Recommendation treated failures as “no lenders” with no error UI.

3. **Loading lifecycle gaps**  
   Early exit when `!opportunityId` did not clear loading; Competition panel could leave “Searching…” after cancel races.

4. **Blocking double-fetch**  
   Manual column awaited a second full-catalog call for shortlist purge **before** clearing loading, amplifying hang/slow search.

SSOT remains Prisma Enterprise Lender Registry (CO-BUG-011). Soft Go-Live was correctly excluded from Manual Recommendation — not the bug.

---

## 2. Files modified

| File | Change |
|------|--------|
| `src/lib/api-client.ts` | Flush token-refresh waiters on failure (fetch + axios) |
| `src/lib/enterprise-lender-registry/published-directory.ts` | Surface API errors; pageSize 200; merge path keeps Soft Go-Live fallback for Competition only |
| `src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx` | Error state; clear loading on no opportunity; non-blocking purge |
| `src/components/catalyst-one/opportunity-workspace/workspace-competition-panel.tsx` | Loading/error lifecycle |
| `src/lib/deal-workspace/lender-program-api.ts` | Use `authenticatedJsonFetch` (refresh-safe) |

---

## 3. API verification

`GET /api/lender-registry/lenders?page=1&pageSize=200&status=active&enabled=true&lifecycleStatus=active&search=ICICI`

- Auth: Bearer required  
- Persistence: `ENTERPRISE_PERSISTENCE_MODE=prisma`  
- Expected: HTTP 200 · `success: true` · ICICI items  

Failures must throw/surface — never silent `[]` on Manual path.

---

## 4. Registry verification

Manual Recommendation → `listCanonicalEnterpriseLenderOptionsAsync` → API only (`source: "api"`).  
No localStorage / demo / Soft Go-Live fallback for Deal-eligible selection.

---

## 5. Database verification

See script `scripts/co-qa-003-lender-search-db-check.mjs` / `co-qa-003-lender-ops-check.mjs`.  
12 lenders in pilot org; majors present and active (except draft P2A HDFC/SBI duplicates — canonical HDFC/SBI codes remain active).

---

## 6. Cache verification

- No TanStack Query on Manual path  
- Published session cache used by Competition merge only  
- Inflight cleared in `finally` (including reject)  
- Auth waiters no longer hang on refresh failure  

---

## 7. Network verification (BAT)

In DevTools Network:

1. Typing ICICI issues `GET .../lenders?...&search=ICICI`  
2. 200 with items  
3. Loading text clears; ICICI Bank / ICICI selectable  

If 401 → refresh must complete or redirect to login — never infinite Searching.

---

## 8. Before vs After

| | Before | After |
|--|--------|-------|
| Refresh fail during search | Hang on Searching… | Waiters flushed; error or login |
| API 500 / bad body | Silent empty | Error message in Manual column |
| Search UX | Blocked on purge second call | Results first; purge async |
| Deal Identify search | Raw fetch (no refresh) | `authenticatedJsonFetch` |

---

## 9. BAT

See `CO-QA-003-E2E-SCENARIO.md`. Module remains **OPEN** until live Pass.
