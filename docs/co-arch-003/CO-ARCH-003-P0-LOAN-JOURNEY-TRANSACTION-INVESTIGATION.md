# P0 — Production Regression Investigation Report

**Status:** Investigation only (no fix implemented)  
**Observed UI error:** `Could not start loan journey`  
**Observed API/detail error:** `Transaction API error: Unable to start a transaction in the given time.`  
**Production URL under test:** https://catalyst-one-two.vercel.app  
**Deployment:** `dpl_HiFLnxDS5mYatgMxVZMQ2kGLXunS` (Ready)

---

## 1. Root Cause

**Primary root cause:** Prisma interactive transaction **failed to acquire a DB connection within the default `maxWait` (2 seconds)**.

This is **not** a business-rule / FK / RLS / Invoice Party validation failure. The exact Prisma message means:

> The Transaction API could not *start* (checkout a connection / begin txn) before `maxWait` elapsed.

On Loan Journey start (typical BAT path: Contact → Opportunity, no lender yet), the first server write that uses `prisma.$transaction` is:

**`allocateOpportunityNumber()`** in `server/services/enterprise-opportunity/opportunity-number.service.ts`

That call is invoked by `POST /api/enterprise-opportunities` during `createDealAsync` → `persistNewOpportunityToEnterpriseRegistry`.

**Contributing / precipitating cause (strong production evidence):**

While the Loan Journey create UI is open, production logs show a **high-frequency flood** of:

- `GET /api/ecm/contacts`
- `GET /api/ecm/companies`

≈ every **150–250 ms**, sustained for many seconds.

This matches a **client feedback loop** in `LiveEntityMasterSearch`:

1. `warmOnMount` effect depends on `registryVersion`
2. Search success → `liveSearchOperationalContacts/Companies` → `syncContactsToCache` → `notifyEcmContactRegistryChanged()`
3. Version bump re-triggers the warm effect → another API call → infinite (or near-infinite) loop

That storm saturates Supabase **PgBouncer / connection pool** capacity used by Vercel serverless Prisma clients. When the user submits, Opportunity create’s interactive `$transaction` cannot acquire a connection in 2s → exact user-facing error.

**Secondary risk on Deal create:** if lender is present, Deal create runs **two sequential** interactive transactions (`allocateDealNumber` then create+snapshot+timeline), each also using default `maxWait=2s` / `timeout=5s`, with **no** custom `transactionOptions` on `PrismaClient`.

---

## 2. Evidence

### 2.1 UI → error surface (code)

Toast title is hard-coded only here:

```85:88:src/components/catalyst-one/loan-files/loan-information-workspace.tsx
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deal could not be saved.";
      error("Could not start loan journey", message);
```

`message` is the thrown `Error.message` from `createDealAsync` / API client.

### 2.2 Call chain (Loan Journey start)

```
LoanCreateFormDialog submit
  → addFileAsync / createDealAsync(..., "loan_workspace")
    → persistNewOpportunityToEnterpriseRegistry
      → POST /api/enterprise-opportunities
        → enterpriseOpportunityService.createOpportunity
          → allocateOpportunityNumber()  ← prisma.$transaction (DEFAULT maxWait 2s)
          → prisma.enterpriseOpportunity.create(...)
    → [only if lenderRegistryId] POST /api/enterprise-deals
        → allocateDealNumber()  ← $transaction
        → createDeal $transaction (deal + snapshot + timeline)
```

For standard BAT Step 1 (no lender yet), failure is almost certainly on **Opportunity** create / number allocation — **before** Deal / Invoice Party writes.

### 2.3 Exact Prisma error semantics

Official Prisma interactive-transaction default:

| Option | Default | Meaning |
|--------|---------|---------|
| `maxWait` | **2000 ms** | Wait to *start* / acquire txn |
| `timeout` | 5000 ms | Max runtime after start |

Error text **“Unable to start a transaction in the given time”** = **`maxWait` exceeded** (pool/connection acquisition), **not** statement timeout mid-txn, **not** constraint violation.

Prisma client config has **no** overrides:

```6:10:server/lib/prisma.ts
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: serverEnv.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
```

### 2.4 Production server logs (Vercel)

Sample from live production host `catalyst-one-two.vercel.app` during investigation window:

- Continuous `GET /api/ecm/contacts` and `GET /api/ecm/companies` at ~200 ms cadence (dozens–hundreds of invocations in a few seconds).
- Matches Loan Journey picker warm/search loop behavior.
- (Browser Network tab for the failed POST itself was not captured in this session; code path + Prisma message uniquely identify the failing API class.)

### 2.5 Feedback loop (code evidence)

`LiveEntityMasterSearch` warm effect depends on registry version:

```81:109:src/components/catalyst-one/shared/live-entity-master-search.tsx
  useEffect(() => {
    if (!warmOnMount || !isEnterprisePersistencePrisma()) return;
    // ... liveSearchOperationalContacts/Companies("")
  }, [warmOnMount, kind, registryVersion]);
```

`live-search` notifies on every successful contact sync:

```24:29:src/lib/enterprise-registry/live-search.ts
function syncContactsToCache(...) {
  ...
  if (contacts.length) notifyEcmContactRegistryChanged();
}
```

Loan create form mounts **both** contact and company live pickers (`loan-create-form-dialog.tsx`), explaining dual endpoint spam.

### 2.6 Ruled out (with rationale)

| Hypothesis | Verdict | Why |
|------------|---------|-----|
| Invoice Party FK / Master missing | **Not primary** | Not required for Opportunity-first create; error text is Prisma txn start, not validation |
| Opportunity/Deal business uniqueness (Option A) | **Not primary** | Would be `P2002` / conflict mapping, different message |
| RLS blocking insert | **Unlikely** | App uses Prisma service role / direct DB URL pattern; RLS would typically surface permission / policy errors, not Prisma Transaction API maxWait |
| Auth session invalid | **Unlikely as sole cause** | Would usually be 401 before txn |
| Nested `$transaction` (allocator inside outer txn) | **Not present** | Allocators are standalone; Deal uses sequential (not nested) txns |
| Wrong Supabase project | **Not indicated** | Production env has `DATABASE_URL`/`DIRECT_URL`; org in prior checks = `rupee-catalyst` |

---

## 3. Stack Trace (reconstructed)

Browser does not receive a full Node stack; it receives the Prisma message via API JSON.

**Logical stack (server):**

```
PrismaClientKnownRequestError / Transaction API error:
  Unable to start a transaction in the given time.
    at allocateOpportunityNumber
       (server/services/enterprise-opportunity/opportunity-number.service.ts:14)
    at EnterpriseOpportunityRepository.createOpportunity
       (server/repositories/enterprise-opportunity/enterprise-opportunity.repository.ts)
    at EnterpriseOpportunityService.createOpportunity
       (server/services/enterprise-opportunity/index.ts)
    at POST /api/enterprise-opportunities
       (src/app/api/enterprise-opportunities/route.ts)
```

**Client stack:**

```
enterpriseOpportunityApiClient.createOpportunity
  → DealCreatePersistenceError(message = Prisma message)
  → createDealAsync
  → addFileAsync
  → LoanInformationWorkspaceInner.handleSubmit
  → toast "Could not start loan journey"
```

`mapOpportunityRouteError` passes through generic `Error.message` as HTTP 500 `OPPORTUNITY_ERROR` — preserving the Prisma wording.

---

## 4. Files involved

| File | Role |
|------|------|
| `src/components/catalyst-one/loan-files/loan-information-workspace.tsx` | Toast surface |
| `src/hooks/use-loan-files-workspace.ts` | `addFileAsync` |
| `src/lib/enterprise-deal/deal-data-access.ts` | `createDealAsync` Opportunity-first |
| `src/lib/enterprise-deal/primary-write.ts` | API persist Opportunity/Deal |
| `src/app/api/enterprise-opportunities/route.ts` | POST handler |
| `src/app/api/enterprise-opportunities/_lib/route-utils.ts` | Error mapping |
| `server/services/enterprise-opportunity/opportunity-number.service.ts` | **Failing `$transaction` (typical)** |
| `server/repositories/enterprise-opportunity/enterprise-opportunity.repository.ts` | Create Opportunity |
| `server/services/enterprise-deal/deal-number.service.ts` | Deal number `$transaction` (if lender path) |
| `server/repositories/enterprise-deal/enterprise-deal.repository.ts` | Deal create `$transaction` |
| `server/lib/prisma.ts` | No `transactionOptions` / pool tuning |
| `src/components/catalyst-one/shared/live-entity-master-search.tsx` | **Registry version → warm loop** |
| `src/lib/enterprise-registry/live-search.ts` | Notify on sync → bumps version |
| `src/components/catalyst-one/loan-files/loan-create-form-dialog.tsx` | Mounts live pickers |

---

## 5. Recommended fix (do not implement yet)

**P0 (stop the bleed):**

1. **Break the LiveEntityMasterSearch loop**  
   - Do **not** depend warm effect on `registryVersion`, **or**  
   - Do **not** call `notifyEcmContactRegistryChanged()` from warm/search sync (or only notify on true mutations), **or**  
   - Gate notifies so warm search does not re-trigger itself.

2. **Hardening Prisma interactive transactions** (Opportunity/Deal number allocators + Deal create):
   - Raise `maxWait` / `timeout` appropriately for serverless + pooler.
   - Prefer connection string practices for Vercel: transaction pooler + conservative `connection_limit` (often `1` per lambda) **with** enough Supabase pool capacity for concurrent functions.
   - Optionally allocate numbers with `UPDATE … RETURNING` / advisory lock patterns that reduce interactive-txn pressure (design follow-up).

3. **Operational:** Confirm Supabase pooler metrics (active connections, waiting, CPU) during BAT UI open.

**Order:** Fix the client request storm first (highest confidence), then tune txn/pool settings.

---

## 6. Risk assessment

| Risk | Level | Notes |
|------|-------|-------|
| Loan Journey / Opportunity create blocked | **Critical (P0)** | Confirmed by BAT + error text + path |
| Deal create under pool pressure | **High** | Same Prisma txn defaults; two sequential txns |
| Contact/Company search reliability | **High** | Loop causes load and may self-starve |
| Data corruption / partial writes | **Medium** | Failure is *before* or at txn start; Opportunity insert may not run if allocator fails. If allocator succeeds and insert fails later, numbers can skip (acceptable). Incomplete Opportunity+Deal pairs only if Deal path fails after Opportunity success — possible under partial recovery. |
| Invoice Party / Accounting | **Low for this symptom** | Not on Opportunity-first create critical path |
| Schema / migration defect | **Low** | Error is pool/txn start, not constraint |

---

## 7. Blast radius

| Workflow | Affected? |
|----------|-----------|
| Start Loan Journey / Loan Information create | **Yes (confirmed)** |
| Contact → Start Loan Journey (same `createDealAsync`) | **Yes** |
| Direct `POST /api/enterprise-opportunities` | **Yes** under pool pressure |
| `POST /api/enterprise-deals` (number + create txns) | **Yes** under pool pressure |
| ECM Contact/Company list/search | **Degraded** (self-induced storm) |
| Edit Deal / Invoice Party assignment alone | Unlikely unless same pool saturation |
| Read-only dashboards | Possible latency under storm |

**Conclusion:** Not limited to “Loan Journey toast” wording — any API path requiring `prisma.$transaction` under pool exhaustion can fail the same way. Loan Journey is the first user-visible BAT path that hits Opportunity number allocation after opening the create UI that triggers the ECM storm.

---

## 8. Regression / commit analysis

- Phase 2A/2B introduced **mandatory Opportunity primary write** + interactive number allocators — so create now **always** depends on `$transaction` for `OPP-YYYY-######`.
- Prior localStorage-only create would not surface this Prisma Transaction API error.
- The **LiveEntityMasterSearch ↔ notify** loop is a separate regression amplifier introduced with live Prisma pickers (`CO-BLOCKER-001` / related hotfix).
- Exact bisect commit cannot be named from Vercel inspect (CLI deploy without published Git SHA on `dpl_HiFLnxDS5mYatgMxVZMQ2kGLXunS`). Functionally, the regression set is: **primary-write Opportunity create + live picker notify loop + default Prisma maxWait on serverless pooler**.

---

## 9. BAT verification checklist (for engineer after fix)

1. Open Loan Information with Network tab — confirm ECM GETs are bounded (no ~200 ms infinite loop).  
2. Submit Contact → Opportunity — expect `POST /api/enterprise-opportunities` **201** and `OPP-YYYY-######`.  
3. Create Deal with lender — expect `POST /api/enterprise-deals` **201** and `DEAL-YYYY-######`.  
4. Confirm Supabase pool metrics calm during picker use.

---

## Final investigation verdict

| Item | Finding |
|------|---------|
| **Root cause** | Prisma interactive txn `maxWait` exceeded while allocating Opportunity number during Loan Journey create |
| **Trigger** | Connection pool starvation, strongly correlated with LiveEntityMasterSearch ECM request storm |
| **Not the cause** | Invoice Party rules, RLS policy message, Option A uniqueness, nested allocator txn |
| **Fix implemented?** | **No** — investigation only per request |
