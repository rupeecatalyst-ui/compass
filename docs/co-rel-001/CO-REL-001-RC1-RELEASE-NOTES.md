# Catalyst One — Release Candidate 1 Notes

**Version:** `v1.0.0-rc1`  
**Programme:** CO-REL-001 — Repository Hygiene & Release Candidate Preparation  
**Date:** 2026-07-26  
**Branch:** `compass-hl03-conversation-first`

---

## Summary

Catalyst One RC-1 packages the **Enterprise Foundation** and the first **Business Capability** programme into a controlled release candidate. The repository is cleaned of scratch/one-off patch artifacts, organized into milestone commits, certified with the Production Certification Toolkit, and tagged for controlled production rollout.

This release does **not** introduce new business features beyond work already completed and certified in prior sprints.

---

## Platform capabilities

| Capability | Notes |
|------------|--------|
| Enterprise Deal Registry | Durable deal identity, DAL consumers, cutover / dual-write / shadow-read controls |
| Enterprise Opportunity Registry | Opportunity SSOT identity and API surface |
| Master registries | Reference masters · Product · Document · Lender (Tier-1 / Tier-2 seed paths) |
| Persistence | Prisma / Postgres enterprise persistence mode |
| Auth & organization | Login, password flows, organization registration, invitation accept |
| Navigation architecture | Loan Board removed; My Deals / My Opportunities / journey navigation |
| Document Requests / Customer upload | Tokenized secure portal (CO-DOC) into Document Registry |
| Observability (CO-OPS-002) | Structured ops logging, correlation IDs, ops-health API |
| Governance (CO-GOV-001) | Entity change history / governance admin surfaces |
| Certification toolkit (CO-CERT-005) | `cert:env` · `cert:routes` · `cert:integrity` · `cert:migrations` · `cert:production` |

---

## Business capabilities

| Capability | Sprint | Notes |
|------------|--------|--------|
| Enterprise Task Engine (ETE) work management | CO-BIZ-001 | Entity-bound tasks, My Work, reports, auto-generation foundation |
| Enterprise Business Intelligence (EBI) | CO-BIZ-003 | Compose-only KPIs / health / Chanakya insights — no duplicate formulas |
| Enterprise Customer Engagement (ECE) | CO-BIZ-004 | Token portal projection of Deal · ETE · Documents · EDC · CX score |

---

## Architectural highlights

- **Deal-centric transactional SSOT** — Deal / Opportunity registries as durable ownership; Loan File as projection where applicable  
- **Single metric implementation** — EBI and Radar consumers share derive engines  
- **ETE sole task ownership** — My Work / Reports / notifications consume ETE; no parallel task engines  
- **ECE is a projection** — customer portal does not invent a second workflow or status SSOT  
- **Server/client boundary hardening** — prior CO-ARCH / CO-STAB work retained  
- **Constitutional cursor rules** frozen for ETE, EBI, ECE, workspace UX, and navigation  

---

## Known observations

1. Customer engagement remains **token-scoped** (no full customer login identity / COMPASS auth yet).  
2. Some Deal Registry consumer flags may remain idle until controlled cutover (see Wave-6 idle flag matrix — booleans only).  
3. Certification admin password on production may be rotated; toolkit uses env-based verification, never hardcoded live secrets.  
4. Binary certification screenshots are large; retained for RC evidence.  
5. Process-local ops rings are in-memory where noted — not a distributed observability mesh.  

---

## Deferred enhancements

- COMPASS / customer OTP identity for ECE  
- RM inbox UI for customer engagement messages  
- Broader ETE lifecycle auto-generation stages (Login → Disbursed / Lost / Hold)  
- Manager / RM / Branch dedicated BI dashboard pages (providers ready)  
- Durable ECE message adapter (beyond client projection store)  
- Full GitHub milestone push policy remains operator-controlled  

---

## Certification (CO-REL-001)

Run against the RC candidate:

```bash
npm run build
npx tsc --noEmit -p tsconfig.json
npm run lint
npm run cert:env
npm run cert:routes
npm run cert:integrity
npm run cert:migrations
npm run ece:verify
npm run biz:verify
npm run ops:verify
npm run gov:verify
```

Results are recorded in the CO-REL-001 certification section of the Implementation Report after execution.

---

## Rollout stance

**Ready for controlled production rollout** after:

1. Milestone commits landed  
2. Tag `v1.0.0-rc1` applied  
3. Certification toolkit green (or documented waivers)  
4. Ops confirmation of production env presence (JWT secrets, persistence mode) — values never pasted into git  

---

## Hygiene performed

- Removed scratch `status.txt`  
- Removed obsolete one-off Document Center / ELW patch-apply scripts and fragments  
- Confirmed idle flag matrix contains no credentials  
