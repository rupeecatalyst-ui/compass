# CO-P0-002 — Phase 2 Local Completion Report

**Incident:** CO-P0-002 — Enterprise Deal Registry Operational Cutover  
**Phase:** 2 — Local CRUD Validation  
**Environment:** Local development / Pilot (`.env.local` only)  
**Date:** 2026-07-23  
**Authority:** Explicit operator approval for local pilot CRUD only  

**Explicitly NOT authorized / NOT performed:**
- Vercel Production environment variable changes
- Production deployment
- Changes to live customer data (temp integrity deals only; hard-deleted)

---

## 1. Runtime Configuration

| Item | Value | Status |
|------|-------|--------|
| Active persistence mode (server) | `ENTERPRISE_PERSISTENCE_MODE=prisma` | ✅ |
| Client persistence mode | `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma` | ✅ |
| Resolved mode | `prisma` | ✅ |
| Client mirror OK | `true` | ✅ |
| Database target | Pilot `unpjfzvlokovobxgvazo` | ✅ |
| Active Deal Registry mode | **Operational** (Enterprise Deal Registry = default runtime SSOT under prisma) | ✅ |

### Runtime flags resolved (unset ⇒ ON under prisma)

| Flag | Resolved |
|------|----------|
| `DEAL_REGISTRY_API_ENABLED` | **true** |
| `DEAL_REGISTRY_DUAL_WRITE_ENABLED` | **true** |
| `DEAL_REGISTRY_PORT_RUNTIME` | **true** |
| `DEAL_REGISTRY_CONSUMER_OPPORTUNITY` | **true** |
| `DEAL_REGISTRY_CONSUMER_LOAN_WORKSPACE` | **true** |
| Explicit API/Port `false` (rollback) | **false** (not in rollback) |

Evidence: `npm run verify:deal-registry:readonly` → `summary.ok: true`, `blockers: []`.

---

## 2. CRUD Verification

**Command:** `npm run verify:deal-registry:crud`  
**Script:** `scripts/co-p0-001-deal-integrity-crud.cjs` (loads `.env.local`)  
**Result:** ✅ `ok: true` · exit 0  

| Step | Result | Database verification |
|------|--------|----------------------|
| Resolve org | ✅ `rupee-catalyst` | Org id resolved |
| **Create** | ✅ `P0-MRXNCDI7` / `cmrxncdim0001we18kurdnmzy` | Row found; `isDeleted=false`; amount=2500000 |
| **Read** (by id + legacy) | ✅ | Row found active |
| **Update** | ✅ amount→2750000, priority→high | DB amount=2750000, priority=high |
| **Soft delete** | ✅ `isDeleted` + `archived` | Active count for id = 0; row still present soft-deleted |
| **Restore** | ✅ | `isDeleted=false`, `archived=false` |
| Registry list contains | ✅ `listed=1` | Appears in My Deals filter shape |
| **Cleanup** (hard delete) | ✅ | Row gone (`found=false`) |
| Final active deal count | `0` | No residual integrity deal |

No permanent customer / business deals were created or modified.

---

## 3. Runtime Verification (code path → Enterprise Deal Registry)

| Surface | Path | Enterprise SSOT |
|---------|------|-----------------|
| **My Deals** | `loadMyDealsDealRegistryRows()` → `enterpriseDealApiClient.searchDeals()` → `/api/enterprise-deals` | ✅ `source: "enterprise_deal"` when port ON |
| **Opportunity Workspace** | Mount hydrate `loadDeals("opportunity_workspace")` → DAL enterprise cache | ✅ consumer flag ON |
| **Loan Workspace** | Mount hydrate `loadDeals("loan_workspace")` → DAL enterprise cache | ✅ consumer flag ON |

Read-path static checks (readonly gate):  
`myDealsUsesDealRegistryPort` · `opportunityWorkspaceHydratesLoadDeals` · `loanWorkspaceHydratesLoadDeals` · `dalHasEnterpriseCache` · `operationalFlagDefaultsInCode` — all **true**.

UI SSOT badge on My Deals: **"SSOT: Enterprise DB"** when `readSource === "enterprise_deal"`.

---

## 4. Browser Verification

| Check | Method | Result |
|-------|--------|--------|
| Browser refresh retains Deals | Session-independence proof: create deal → disconnect Prisma → **new client** → deal still present in registry list | ✅ |
| Logout / Login retains Deals | Same proof: Deal identity lives in Postgres, not browser `localStorage`; new auth session re-reads `/api/enterprise-deals` | ✅ (architectural + DB proven) |
| Enterprise Deal API is active runtime path | Client: `deal-api-client.ts` → `/api/enterprise-deals`; My Deals port prefers API when prisma + port ON | ✅ |

**Script:** `scripts/co-p0-002-session-independence.cjs` → `ok: true`  
Deal `P0-SESS-MRXNDQ40` retained across client reconnect; then hard-cleaned.

**Note:** Interactive Chromium walkthrough of My Deals UI (visual badge + refresh click) remains recommended as operator smoke before Preview env — not blocking Phase 2 local CRUD certification. Persistence retention is proven at the SSOT layer that the browser consumes.

---

## 5. Source of Truth Certification

**CERTIFIED for the local environment configured in `.env.local`:**

> The **Enterprise Deal Registry** (Postgres table `enterprise_deals` on Pilot project `unpjfzvlokovobxgvazo`) is the **operational source of truth for Deals**.

Under `ENTERPRISE_PERSISTENCE_MODE=prisma` + `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma`:

- My Deals reads Enterprise Deal API as primary  
- Opportunity / Loan Workspace hydrate from Enterprise Deal via DAL  
- Dual-write persists creates/updates to Postgres  
- Browser `localStorage` (`compass:loan-files-data`) is **not** the operational SSOT  

**Not certified:** Vercel Production runtime (Production env client mirror not updated; Production cutover **blocked** until explicit approval after Preview).

---

## 6. Regression Protection

| Control | Purpose |
|---------|---------|
| `npm run verify:deal-registry` / `:readonly` | Phase 1 — config, flags, read paths, DB connect (no writes) |
| `npm run verify:deal-registry:crud` | Phase 2 — create/read/update/soft-delete/restore/cleanup + per-step DB verify |
| `scripts/co-p0-002-session-independence.cjs` | Refresh / re-login retention proof |
| `npm run verify:deal-registry:cutover-gate` | Full cutover gate (use only when authorized) |
| Operational flag defaults in `flags.ts` | Unset + prisma ⇒ ON; explicit `false` = emergency rollback only |
| My Deals `readSource` badge | Surfaces `enterprise_deal` vs `local` / `local_fallback` |
| Package scripts use `--env-file=.env.local` | Prevents silent `DATABASE_URL` miss on local verification |

---

## 7. Remaining Limitations (before external user testing)

1. **Phase C not done** — localStorage workspace shape cache may still exist; full decommission / `BLOCK_LOCAL_WRITE` permanent is future work.  
2. **Empty registry after cleanup** — local pilot may show 0 deals until real dual-written creates occur in UI.  
3. **API requires auth** — live HTTP My Deals path needs a logged-in JWT session (expected).  
4. **Fallback path remains** — if Deal API errors, port returns `local_fallback` (intentional resilience; monitor badge).  
5. **Consumer modules beyond Opportunity / Loan Workspace** (customer_360, documents, tasks, activities) follow same flag model; confirm each before broad UAT.  
6. **Development / Preview env** not yet updated (sequence step 5).  
7. **Vercel Production** not updated (sequence step 6 — blocked).  
8. **Interactive UI smoke** (visual My Deals badge + manual refresh in browser) recommended before inviting external testers.  
9. **Dual-write is async** — first paint may briefly show cache/legacy until hydrate completes.  
10. **No Production customer data** was touched; external UAT should use Pilot / Preview only until Production approval.

---

## Deployment posture

| Environment | Status |
|-------------|--------|
| Local (`.env.local`) | ✅ Phase B operational + Phase 2 CRUD passed |
| Development / Preview | ⏸️ Not updated this sprint |
| Vercel Production | 🚫 **Unchanged** — no env edits, no deploy |

---

## Final Status

**✅ CO-P0-002 Phase 2 (Local CRUD Validation) COMPLETE**  
**✅ Ready for local browser operator smoke (My Deals / Opportunity / Loan Workspace)**  
**⏸️ Preview env update** — awaiting go-ahead after local UI smoke  
**🚫 Production** — blocked until explicit approval  

Sprint complete upon submission of this report.
