# CO-QA-005 — Move to Deal Transaction Timeout

**Status:** OPEN — root cause identified; structural fix implemented; live BAT required  
**Error:** `Transaction API error: Unable to start a transaction in the given time.`  
**Surface:** Strategy Workbench → Move to Deal → Deal create

---

## 1. Root Cause Analysis

**The transaction did not fail mid-SQL.** Prisma could not **start** an interactive transaction within `maxWait` (default **2 seconds**) because it could not check out a connection from the pool in time.

| Ruled out | Evidence |
|-----------|----------|
| Deadlocks / lock waits | `pg_locks` ungranted = **[]**; blocking query = **[]** |
| Long-running SQL | No xact older than 5s |
| Migration still running | `in_progress_or_failed = 0`; CO-DOM-001 / CO-DOC-002 **finished** |
| Schema misalignment | Post–CO-QA-004 drift audit aligned |

**Primary cause:** Connection checkout pressure under **Supabase transaction pooler (`:6543`, `pgbouncer=true`)** + **Vercel serverless** Prisma clients, amplified by **two sequential interactive `$transaction`s per Deal create**.

**Contributing design defect:**

```text
POST /api/enterprise-deals
  → allocateDealNumber()     ← interactive $transaction #1
  → createDeal $transaction  ← interactive $transaction #2 (create + snapshot + timeline)
```

Move to Deal loops **one POST per lender** → 2N interactive transaction starts for N lenders (e.g. 3 lenders → 6 starts), each racing default `maxWait=2s`.

Prisma also defaults `maxWait=2s` while Postgres `pool_timeout` defaults to **10s** — known inconsistency: interactive txs give up before the pool timeout would allow a connection.

**Not the root cause:** arbitrarily low SQL `timeout` after the transaction has started.

---

## 2. Transaction timeline (Move to Deal)

```text
LIFE Strategy → Move to Deal confirm
  ↓
moveOpportunityToDeal()  (browser)
  ↓
for each Execution Queue lender:
  POST /api/enterprise-deals
    ↓
  enterpriseDealService.createDeal
    ↓
  [BEFORE FIX]
  allocateDealNumber → BEGIN … COMMIT          ← often fails here (maxWait)
    ↓
  prisma.$transaction(create+snapshot+timeline) ← second checkout
  ↓
markConvertedToDeal (best-effort)
  ↓
Navigate Deal Workspace
```

**Where execution stops (observed class of failure):** before / at interactive transaction **start** (`BEGIN` checkout), not at commit of Deal rows.

**After fix:**

```text
POST /api/enterprise-deals
  → ONE $transaction:
       allocateDealNumberInTransaction
       enterpriseDeal.create
       snapshot + timeline
  → COMMIT
```

---

## 3. Database lock report (production evidence)

Script: `scripts/co-qa-005-tx-lock-audit.mjs`

| Check | Result |
|-------|--------|
| Blocking lock pairs | **none** |
| Ungranted locks | **none** |
| Long-running transactions (>5s) | **none** |
| Notable state | Multiple `idle in transaction` / `BEGIN` waiting `ClientRead` (pooler holding backends) |

---

## 4. Connection pool report

| Setting | Production value |
|---------|------------------|
| `DATABASE_URL` host | `*.pooler.supabase.com` |
| Port | **6543** (transaction mode) |
| `pgbouncer` | **true** |
| `connection_limit` | **unset** (Prisma default per instance) |
| `DIRECT_URL` | pooler **:5432** (migrations / direct) |

Interactive `$transaction` probe from audit script: **ok in ~319ms** when pool is quiet — confirms SQL path works; failure is under contention / multi-tx Move to Deal.

---

## 5. Migration status

| Metric | Value |
|--------|--------|
| Applied finished | 25 |
| In progress | **0** |
| CO-DOM-001 / CO-DOC-002 | finished earlier today |

Migrations are **not** currently locking Move to Deal.

---

## 6. API / Prisma

| Item | Detail |
|------|--------|
| Endpoint | `POST /api/enterprise-deals` |
| Client | `createDealFromOpportunity` → `enterpriseDealApiClient.createDeal` |
| Fail point class | Interactive txn **start** (`maxWait`) |
| Prisma defaults (before) | `maxWait=2000`, `timeout=5000`, no `transactionOptions` |

---

## 7. Recommended fix (implemented)

1. **Structural:** Allocate Deal Number **inside** the same `$transaction` as Deal create (`allocateDealNumberInTransaction`) — halves interactive starts per create.  
2. **Config consistency:** Set Prisma `transactionOptions.maxWait=10_000` to align with default `pool_timeout` (not a blind SQL timeout bump). `timeout=20_000` for multi-statement create.  
3. **Ops guidance:** Document `connection_limit` on serverless pooler URL in `.env.example` (recommend 1–5). Apply on Vercel `DATABASE_URL` if pool saturation continues.

---

## 8. Files changed

| File | Change |
|------|--------|
| `server/services/enterprise-deal/deal-number.service.ts` | `allocateDealNumberInTransaction` |
| `server/repositories/enterprise-deal/enterprise-deal.repository.ts` | Single TX create path |
| `server/lib/prisma.ts` | `transactionOptions` aligned with pool |
| `server/services/enterprise-deal/index.ts` | Export |
| `.env.example` | Pooler / `connection_limit` notes |
| `scripts/co-qa-005-tx-lock-audit.mjs` | Lock/pool audit |
| `docs/co-qa-005/CO-QA-005-MOVE-TO-DEAL-TX-TIMEOUT.md` | This report |

---

## Certification

**CO-QA-005 remains OPEN** until live BAT:

1. Strategy Workbench → Move to Deal  
2. `POST /api/enterprise-deals` succeeds (201)  
3. Deal appears in Registry / Pipeline  
4. No “Unable to start a transaction” toast  

Engineering scripts ≠ Business Certification.
