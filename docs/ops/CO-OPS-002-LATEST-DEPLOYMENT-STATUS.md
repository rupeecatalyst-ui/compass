# CO-OPS-002 — Latest Deployment Status Report

**Report ID:** CO-OPS-002  
**Generated:** 2026-07-23 (evening, IST)  
**Governance:** CO-GOV-001 Release Governance Framework v1.0  
**Method:** Verified from Git, Vercel CLI, HTTP probes, and Pilot DB `_prisma_migrations` / `enterprise_deals`  
**Rule:** Unverified items are marked **NOT VERIFIED** — no assumptions presented as fact.

---

## 1. Latest Vercel Deployment

| Environment | URL | Status |
|-------------|-----|--------|
| **Production (alias)** | https://catalyst-one-two.vercel.app | Ready (alias of latest Production deployment) |
| **Production (deployment)** | https://catalyst-hjatdpgyo-rupee-catalyst.vercel.app | ● Ready |
| **Preview (latest Ready)** | https://catalyst-5n4q8iwkf-rupee-catalyst.vercel.app | ● Ready |
| **Preview (branch alias)** | https://catalyst-one-git-compass-hl03-conversation-first-rupee-catalyst.vercel.app | Alias of latest Preview |

Also aliased to Production deployment:  
`https://catalyst-one-rupee-catalyst.vercel.app`

---

## 2. Deployment Details

### 2.1 Latest Production (verified via `vercel inspect`)

| Field | Verified value |
|-------|----------------|
| Deployment ID | `dpl_FUoMFoVxwycVoXdiTxai6wyLzu1p` |
| Status | **Success** (● Ready) |
| Target | `production` |
| Created | **2026-07-23 18:44:22 IST** (2026-07-23T13:14:22.073Z) |
| Project | `rupee-catalyst/catalyst-one` |
| Build | Ready (`@vercel/vc-build`, Next.js, `npm run build`) |
| Git branch | **NOT VERIFIED** — Vercel inspect payload did not expose commit/branch metadata for this deployment |
| Commit SHA | **NOT VERIFIED** — same as above |
| Build Number / CO-OPS-001 on Production | **Not present on Production** — `GET https://catalyst-one-two.vercel.app/api/admin/build-information` → **HTTP 404** |

### 2.2 Latest Preview (verified via `vercel ls --environment preview` + `vercel inspect`)

| Field | Verified value |
|-------|----------------|
| Deployment ID | `dpl_EWSji8St3TZpm3dCgkETrmJ7wMUY` |
| Status | **Success** (● Ready) |
| Target | `preview` |
| Created | **2026-07-21 22:36:24 IST** (2026-07-21T17:06:24.863Z) |
| Branch signal | Alias includes `compass-hl03-conversation-first` |
| Commit SHA | **NOT VERIFIED from Vercel meta**; temporally adjacent to local HEAD `a80dae8` (committed 2026-07-21 22:35:52 IST) — **correlation only, not proof** |

### 2.3 Local Git (verified)

| Field | Verified value |
|-------|----------------|
| Branch | `compass-hl03-conversation-first` (tracks `origin/compass-hl03-conversation-first`) |
| HEAD SHA | `a80dae8e5fd5e757ce90e6f48d7c175bbe80b338` (`a80dae8`) |
| HEAD commit time | 2026-07-21 22:35:52 +0530 |
| HEAD message | `fix(opportunity-workspace): resolve header overlap and separate title, CHANAKYA and actions` |
| Working tree | **Dirty** — large set of modified + untracked files (not committed) |
| Local Build Information constants | Version `0.9.0-internal` · Build `#1` · Local Certification = certified · Preview/Production = pending |

### 2.4 Critical deployment fact (this evening)

**Tonight’s CO-OPS-001 / CO-OPS-001.1 / CO-GOV-001 / CO-P0-002 local work was not deployed to Preview or Production** (per standing no-deploy / no-Production instructions).  

The Production deployment at **18:44 IST today** is therefore **not** the Build Information / Release Governance local tree. Evidence: Production Build Information API **404**.

---

## 3. Changes Included

### 3.A — On latest Production (deployed 2026-07-23 18:44 IST)

**Cannot inventory file-level diff without a verified Production commit SHA.**  

Verified behavioural probes only:

| Probe | Result |
|-------|--------|
| `/login` | HTTP 200 (auth UI reachable) |
| `/api/admin/build-information` | HTTP **404** (CO-OPS-001 not on Production) |
| `/admin/build-information` | HTTP **307** (redirect — typical auth guard; page may or may not exist after login — **route presence not confirmed without authenticated session**) |

### 3.B — Implemented locally this evening (NOT deployed) — verified present in working tree

| Area | Items |
|------|--------|
| **New features** | CO-OPS-001 Build Information admin page + API; CO-OPS-001.1 Release Health, Copy Build Information, Certification board, admin footer |
| **Governance (docs only)** | CO-GOV-001 Release Governance Framework v1.0 |
| **Bug / integrity** | CO-P0-002 Enterprise Deal Registry operational cutover (local flags/DAL/consumers); Phase 2 local CRUD validation executed & cleaned up |
| **UI/UX** | Admin Build Information workspace only for CO-OPS scope (no redesign of business workflows) |
| **Database / migrations** | No new migrations created this evening for CO-OPS-001/GOV; Deal Registry CRUD used existing `enterprise_deals` |
| **Security** | Admin layout roles include `SUPER_ADMIN` + `ADMIN`; Build Information API restricted to those roles |
| **Known issues** | Local git tree Dirty; `enterprise_deals` active count = **0**; Build Information **not** on Preview/Production; two local migration folders exist that are **not** in Pilot DB latest applied list (see §4) |

---

## 4. Platform Health Check

| Check | Local (`.env.local` + scripts) | Production |
|-------|--------------------------------|------------|
| Build passed successfully | **Partial:** targeted `tsc --noEmit` exit 0 for Build Information work; **full `next build` of dirty tree NOT run this evening** | Latest Production deployment status **Ready** (build succeeded for that deploy) |
| Database migrations applied | Connected to Pilot `unpjfzvlokovobxgvazo`. Latest **applied** migration: `20260721230000_co_arch_002_w1_enterprise_deal_registry` (finished `2026-07-21T18:15:16.905Z`). Local folders `20260721240000_go_live_p0_lender_registry_extension` and `20260721250000_co_arch_004_lender_master_foundation` exist but were **not** returned in top finished migrations → **not applied** (or not finished) on this DB | **NOT VERIFIED** against Production DB (no Production DB probe authorized / performed) |
| Authentication functioning | Login page reachable on Production (200). Live login success **NOT re-tested** in this report | Login page HTTP 200 |
| Enterprise Deal Registry | Local Phase 1 readonly: `ok: true`, flags ON under prisma, API/port/consumers ON, **0** active deals. Phase 2 CRUD passed earlier this evening then cleaned up | **NOT VERIFIED** on Production runtime |
| Customer Registry (ECM) | Code present in working tree; **no dedicated ECM smoke executed in this report** | **NOT VERIFIED** |
| Blocking runtime errors | None observed in Vercel latest Production status (Ready). Local app server runtime **not** asserted in this report | Deploy Ready |
| Outstanding P0 / P1 | **P0 (process):** evening’s certified local work not on Preview/Production. **P0 (data):** Deal Registry empty (`enterprise_deals` = 0). **Migration drift:** two local migration dirs not in applied latest set | Build Information missing on Production (404) relative to local CO-OPS-001 |

---

## 5. Release Governance Status (CO-GOV-001)

| Stage | Status for **this evening’s Build Information / governance / Deal cutover local work** |
|-------|----------------------------------------------------------------------------------------|
| 1 Development Complete | ✅ Met (local implementation present) |
| 2 Technical Certification | 🟡 Partial (tsc ok for scoped work; full production build of dirty tree not re-run tonight) |
| 3 Business Certification | ✅ Local Business Certified for **CO-OPS-001** (per Product Owner / Business Reviewer earlier tonight). CO-OPS-001.1 + CO-GOV-001 docs/enhancements implemented after that certification |
| 4 Preview Certification | ❌ **Not started** — no Preview deploy of tonight’s work |
| 5 Internal UAT | ❌ Not started |
| 6 External UAT | ❌ Not started |
| 7 Production Readiness Review | ❌ Not started |
| 8 Production Release | ❌ **Not authorized / not performed** for tonight’s work |

**Ready to progress to next stage?**  
**Yes — Stage 4 Preview Certification**, subject to:

1. Product Owner explicit Preview deploy authorization  
2. Prefer clean commit / milestone of intended release set  
3. Full build validation before Preview deploy  

**Not ready for Production (Stage 8).**

---

## 6. Links

| Item | URL |
|------|-----|
| Latest Vercel Production (alias) | https://catalyst-one-two.vercel.app |
| Latest Vercel Production (deployment) | https://catalyst-hjatdpgyo-rupee-catalyst.vercel.app |
| Latest Vercel Preview Deployment | https://catalyst-5n4q8iwkf-rupee-catalyst.vercel.app |
| Preview branch alias | https://catalyst-one-git-compass-hl03-conversation-first-rupee-catalyst.vercel.app |
| GitHub Commit (local HEAD) | https://github.com/rupeecatalyst-ui/compass/commit/a80dae8e5fd5e757ce90e6f48d7c175bbe80b338 |
| Build Information page (local only) | http://localhost:3000/admin/build-information *(requires local `next dev` + admin login)* |
| Build Information on Production | **Not available** (`/api/admin/build-information` → 404) |

---

## 7. Verification sources used

1. `git` — branch, HEAD SHA, status, log  
2. `npx vercel ls` / `vercel ls --environment preview` / `vercel inspect`  
3. HTTP probes to Production alias  
4. Pilot DB via Prisma: `_prisma_migrations`, `enterprise_deals` counts  
5. `scripts/co-p0-002-readonly-validation.cjs`  
6. Local constants: `src/constants/build-information/*`

---

## 8. Bottom line

| Question | Answer |
|----------|--------|
| What is live on Production right now? | Deployment `dpl_FUoMFoVxwycVoXdiTxai6wyLzu1p`, Ready, created **2026-07-23 18:44:22 IST**, aliased at https://catalyst-one-two.vercel.app |
| Does Production include tonight’s CO-OPS-001 Build Information? | **No** (API 404) |
| Does latest Preview include tonight’s work? | **No** — latest Preview is from **2026-07-21** |
| Where is tonight’s work? | **Local dirty working tree only** |
| CO-GOV-001 next step | **Preview Certification** after Product Owner authorization |
