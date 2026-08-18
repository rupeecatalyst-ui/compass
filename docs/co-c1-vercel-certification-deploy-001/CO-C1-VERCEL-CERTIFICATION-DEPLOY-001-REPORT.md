# CO-C1-VERCEL-CERTIFICATION-DEPLOY-001

**Date:** 2026-08-13  
**Product Owner:** Authorized production deployment of clean certification checkpoint  
**Branch:** `compass-hl03-conversation-first`  

---

## Final status

# VERCEL CERTIFICATION DEPLOYMENT READY FOR PO VALIDATION

| Field | Value |
|-------|--------|
| Production URL | https://catalyst-one-two.vercel.app |
| Deployment URL | https://catalyst-j9m6w2xno-rupee-catalyst.vercel.app |
| Deployment ID | `dpl_C9jQmtc2cChA45W8hCJHy4JKMDpS` |
| Status | **READY** |
| Target | production |
| GitHub source / deployed tip | `269f96c635e85555a261bcad850554c48b88354a` |
| Certification application commit (ancestor) | `3107f20b5e20f1b58fd187db6077c8ec4f239c8f` |
| Also aliased | https://catalyst-one-rupee-catalyst.vercel.app |
| Inspect | https://vercel.com/rupee-catalyst/catalyst-one/C9jQmtc2cChA45W8hCJHy4JKMDpS |

**Stopped after deploy + smoke.** No further feature work.

---

## Pre-deployment confirmation

| Check | Result |
|-------|--------|
| Local HEAD = GitHub remote tip | **YES** — `269f96c635e85555a261bcad850554c48b88354a` |
| Certification commit present (ancestor) | **YES** — `3107f20…` |
| Certification-relevant uncommitted changes | **None** (only excluded C artifacts: remediation logs / probe scripts) |
| Full TSC | **PASS** |
| Production build (local) | **PASS** |
| Consolidated verify | **PASS** |
| Notification verify | **PASS** |
| Marketing activation-002 | **PASS** |
| MKT-13 | **PASS** |
| User Manual | **PASS** |
| Lender 360 / ELD | **PASS** |
| Deals journey | **PASS** |
| Dashboard | **PASS** |
| Contact 360 (via consolidated) | **PASS** |

---

## Deployment method

1. Created **clean git worktree** at exact tip `269f96c…` (no untracked local artifacts).  
2. Deployed with `npx vercel --prod --yes` from that worktree → project `rupee-catalyst/catalyst-one`.  
3. **Did not** deploy prior `dpl_EutmxKNp…` / dirty local tree / earlier commits.

### First attempt (failed) → ops fix (no code change)

| Attempt | ID | Result |
|---------|-----|--------|
| 1 | `dpl_2M95KNf5VgK98cPCG7Yn6kNSdMMr` | **ERROR** — build failed: `[CO-STAB-001] JWT_SECRET is required…` during page data collection |
| Root cause | Vercel Production env listed only `DATABASE_URL`, `DIRECT_URL`, `ENTERPRISE_PERSISTENCE_MODE` — **JWT secrets missing** |
| Fix | Added **Production** env (from local `.env.local`, values not logged): `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE` |
| 2 | `dpl_C9jQmtc2cChA45W8hCJHy4JKMDpS` | **READY** · aliased to production |

**No application code modified** for this deploy. **No migrations run.**

---

## Deployed SHA correspondence

| Claim | Evidence |
|-------|----------|
| Source tree | Clean worktree `WT_HEAD=269f96c635e85555a261bcad850554c48b88354a` before upload |
| GitHub tip | Same SHA on `origin/compass-hl03-conversation-first` |
| Vercel CLI git meta | Not attached on CLI file deploy (expected); provenance = worktree SHA + deploy log |

**GITHUB CERTIFICATION TREE = VERCEL CERTIFICATION TREE** for tip `269f96c…`.

---

## Database / migrations

| Item | Status |
|------|--------|
| Migrations re-run | **No** |
| Production-linked DB | Previously confirmed **45/45** |
| `enterprise_notifications` | Present (prior remediation-002) |
| Business tables | Unchanged by this deploy |

---

## Marketing safety

| Flag | Status |
|------|--------|
| `ENTERPRISE_MARKETING_EXECUTION_ENABLED` | **false** (unchanged in source) |
| `ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED` | **false** (unchanged in source) |
| Live bulk email / WhatsApp | **Not enabled** |
| Marketing UI / controlled test | Available (as designed) |

---

## Post-deployment smoke (HTTP)

Base: https://catalyst-one-two.vercel.app  

| Path | HTTP |
|------|------|
| `/login` | **200** (Sign In · Catalyst One \| COMPASS) |
| `/dashboard` | **200** |
| `/contacts` | **200** |
| `/lenders` | **200** |
| `/my-deals` | **200** |
| `/deals` | **200** |
| `/organization/communication` | **200** |
| `/organization/communication/email` | **200** |
| `/admin` | **200** |
| `/admin/marketing` | **200** |
| `/admin/user-manual` | **200** |
| Deploy URL `/login` | **302** (alias redirect) |

Authenticated deep UI walk (Contact 360, Lender 360, Deal Workspace, Send Email interiors): **not executed** — `CATALYST_BAT_*` credentials are **not configured** in this agent environment (per Enterprise BAT Security Policy: do not request credentials in chat).

No real external campaign messages were sent.

---

## Known limitations

1. Authenticated BAT / interactive PO walkthrough still required for full UX certification of Contact 360, Lender 360, Deal Workspace, Action Center Send Email, etc.  
2. Vercel CLI deploy does not stamp GitHub commit in deployment metadata; provenance is the verified clean worktree SHA `269f96c…`.  
3. Production Vercel env had been missing JWT secrets; restored as part of this deploy ops (document for future env audits).  
4. Marketing live execution remains intentionally OFF.

---

## Exact next step

**Product Owner validation** on https://catalyst-one-two.vercel.app against GitHub tip / deployed tree `269f96c635e85555a261bcad850554c48b88354a` (includes certification commit `3107f20…`).
