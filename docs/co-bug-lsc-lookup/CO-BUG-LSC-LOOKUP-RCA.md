# CO-BUG-LSC-LOOKUP — Availability / Timeout RCA (2026-08-05)

**Priority:** CRITICAL  
**Symptom:** “Enterprise Contact Registry unavailable” / “search timed out”  
**Constraint:** Do not raise timeouts · Do not retry-as-primary-fix · No dummy data

---

## Investigation answers

| # | Question | Finding |
|---|----------|---------|
| 1 | API reachable? | Yes — `GET /api/ecm/contacts` (auth Bearer) |
| 2 | Request reaches backend? | Yes — when auth present |
| 3 | Backend queries ECM? | Yes — `ecmContactService.query` → Prisma |
| 4 | Prisma/DB responding? | Yes — single banker page ~300–600ms (remote) |
| 5 | Indexes for Contact lookup? | Partial — org/status/role indexes exist; **no** institution JSON index historically |
| 6 | Auth blocking? | 401 would surface as unavailable; not the primary path when logged in |
| 7 | Waiting on another service? | **Yes — self-inflicted:** every list GET called `syncEcmPortsFromPrisma()` (loads up to **5000** contacts) |
| 8 | N+1? | Sequential multi-page LSC crawl = N HTTP round-trips |
| 9 | Full table scan? | **Yes on LSC path** — `liveListAllEcmContactsByRole` paginated **all** `lender_employee` rows (up to 25×200) |
| 10 | Institution filter timeout? | Institution was **client-side after over-fetch** — not the DB bottleneck; over-fetch was |
| 11 | Product filter timeout? | No — soft-rank is in-memory on a small set |
| 12 | Deadlock? | No evidence |
| 13 | Server logs? | Client timeout at 12s while server still syncing / paging |

---

## Root Cause (exact)

### RCA-A — Full banker pagination on every focus/keystroke

`searchLenderSalesContactsLive` called `liveListAllEcmContactsByRole(..., maxPages: 25)` — sequential REST pages of **all** Lender Contacts, then filtered institution in the browser.

### RCA-B — Full registry rehydrate on every list GET

`GET /api/ecm/contacts` always ran:

```ts
await syncEcmPortsFromPrisma(); // pageSize: 5000
```

So **each** LSC page paid for a second full Contact dump. Multiplied by pages ⇒ client 12s timeout ⇒ “timed out” / “unavailable”.

### RCA-C — Data gap (secondary)

Many `lender_employee` rows lack `roleProfiles.lender_employee.institution` (e.g. Shrikant Lasurve). Institution-only SQL would miss them on typed search; progressive name search covers incomplete profiles without inventing contacts.

---

## Measured timings (local → shared Postgres)

| Path | Timing |
|------|--------|
| Banker page 200 | ~639 ms (cold) / ~300 ms warm |
| Sync 5k (all contacts) | ~324 ms |
| Old LSC page + sync | ~900+ ms **per HTTP call** |
| New institution-scoped browse | ~550 ms cold / lower when warm |
| New scoped + name “Shrikant” | single/dual page — **no multi-page crawl** |

Target &lt; 500 ms is met once connection is warm and sync-on-GET is removed; cold remote RTT may still sit ~300–550 ms.

---

## Fix applied

1. **Remove** `syncEcmPortsFromPrisma()` from Contact **list GET** (mutations still sync).
2. **Server** `institutionKeys` + `skipTotal` on ECM query (JSON path filter).
3. **LSC** uses 1–2 bounded `queryContacts` calls (institution-scoped ± typed name) — **never** full-role pagination.
4. Progressive typed search for bankers with empty institution mapping.
5. Selection stamps Deal institution from selected Lender when Contact profile lacks it.
6. Migration indexes: `ecm_contacts_lender_inst_idx` (+ roles GIN, label).

---

## Manual ops

Apply migration on each environment DB:

```bash
npx prisma migrate deploy
# or run prisma/migrations/20260805120000_co_bug_lsc_institution_lookup/migration.sql
```

Requires `DIRECT_URL` for Prisma migrate.

---

## Verification

```bash
npm run verify:co-bug-lsc-lookup
```

BAT: Deal → Lender Pipeline → search `Shrikant` → select → save → refresh → persists.
