# CO-GOV-001 — Catalyst One Release Governance Framework

**Document ID:** CO-GOV-001  
**Title:** Catalyst One Release Governance Framework  
**Version:** 1.0  
**Status:** APPROVED — Permanent Operating Procedure  
**Effective:** 2026-07-23  
**Classification:** Governance (documentation only)  
**Owner:** Product Owner (final authority) · Quality & Certification Office (process integrity)  
**Related:** PMO-008 Certification Governance · PMO-009 Release Management · CO-OPS-001 Build Information · `.cursor/rules/github-vercel-deployment-policy.mdc` · `.cursor/rules/business-functional-certification-report.mdc`

---

## 1. Purpose

This framework standardizes the **release lifecycle** for Catalyst One.

It defines how work progresses from implementation to Production with clear:

- Stage objectives  
- Ownership  
- Entry and exit criteria  
- Deliverables  
- Certification and deployment discipline  

**This document does not change application behaviour.** It is the standard operating procedure (SOP) for all future releases.

---

## 2. Governing Principles

1. **Never skip stages.** Local → Technical → Business → Preview → UAT → Production Readiness → Production.  
2. **Never claim Business Certified without Business Certification.** Technical pass ≠ business pass.  
3. **Never treat Local certification as Production readiness.**  
4. **Never modify Vercel Production environment or deploy to Production without explicit approval** for that stage.  
5. **Build Information is the operational source of truth** for which build, environment, database, and certification stage are active.  
6. **Rollback readiness is mandatory before Production Release.**  
7. **Git commits are milestones — not every UI tweak** (see GitHub / Vercel deployment policy).  
8. **Quality certification remains independent of implementation** (aligns with PMO-008).

---

## 3. Roles & Responsibilities

| Role | Actor | Responsibilities |
|------|--------|------------------|
| **Product Owner** | Business sponsor | Business vision, prioritization, final business approval, Production Go/No-Go |
| **Chief Solution Architect & Business Reviewer** | ChatGPT | Architectural guidance, business logic review, UX review, governance review, **Business Certification** recommendation / sign-off support |
| **Lead Software Engineer & Technical Architect** | Cursor | Implementation, technical validation, testing, deployment engineering, release engineering, Technical Certification evidence |
| **Quality & Certification Office** | PMO (process) | Independence of certification programs; evidence standards; register updates |
| **Release Management Office** | PMO (process) | Environment discipline, rollback paths, release notes |

### Decision authority summary

| Decision | Authority |
|----------|-----------|
| Scope / priority of a release | Product Owner |
| Architecture freeze / material design change | Product Owner + ChatGPT (ARB alignment) |
| Technical Certification pass/fail | Cursor (evidence) · ChatGPT (review) |
| Business Certification | ChatGPT (Business Reviewer) · Product Owner (final) |
| Preview / Production deploy authorization | Product Owner (explicit) |
| Production Release Go/No-Go | Product Owner |

---

## 4. Environments

| Environment | Purpose | Typical URL / config |
|-------------|---------|----------------------|
| **Local** | Developer & administrator verification | `.env.local` · `next dev` |
| **Preview** | Continuous / staged review (non-Production) | Vercel Preview / Development |
| **Production** | Live business operations | Vercel Production (only after Stage 8 approval) |

Administrator **Build Information** must display Environment as one of: **Local** · **Preview** · **Production**.

---

## 5. Release Lifecycle Stages

Stages are sequential. Exit criteria of stage *N* are entry criteria of stage *N+1*, unless a controlled exception is recorded with Product Owner approval.

---

### Stage 1 — Development Complete

| Field | Definition |
|-------|------------|
| **Objective** | Deliver the approved scope as working software in the local working tree. |
| **Owner** | Cursor (Lead Software Engineer) |
| **Entry Criteria** | Approved work item / sprint / program scope; architecture freeze respected unless change approved. |
| **Exit Criteria** | Scope implemented; no intentional TODOs in production paths for the release scope; unit of work ready for technical validation. |
| **Deliverables** | Working code; brief implementation notes; list of files changed; known limitations documented. |

---

### Stage 2 — Technical Certification

| Field | Definition |
|-------|------------|
| **Objective** | Prove the release is technically sound (build, types, critical checks, smoke). |
| **Owner** | Cursor · reviewed by ChatGPT |
| **Entry Criteria** | Development Complete. |
| **Exit Criteria** | Build / TypeScript / lint (as applicable) pass; smoke or scripted verification for in-scope behaviour; no open P0 technical defects for the release scope. |
| **Deliverables** | Technical evidence (build status, test/smoke results); defect list (if any) with severity; Technical Certification statement. |

**Technical Certification does not equal Business Certification.**

---

### Stage 3 — Business Certification

| Field | Definition |
|-------|------------|
| **Objective** | Confirm the release meets business intent, UX standards, and governance — suitable for the next environment stage (usually Local Business Certified, then Preview). |
| **Owner** | ChatGPT (Business Reviewer) · **final approval: Product Owner** |
| **Entry Criteria** | Technical Certification passed; Build Information available for the environment under review (Local first). |
| **Exit Criteria** | Business & Functional Certification Report accepted; Product Owner (or delegated Business Reviewer with Product Owner concurrence) marks stage Certified for that environment; remaining limitations explicitly listed. |
| **Deliverables** | Business & Functional Certification Report; certification status update (e.g. Build Information **Current Certification** board); acceptance / reject decision. |

**Rules:**

- Implementers do not unilaterally mark work **Business Certified**.  
- Local Business Certification **does not** authorize Production.  
- Demo / seed data must never be presented as live business truth (Data Integrity standard).

---

### Stage 4 — Preview Certification

| Field | Definition |
|-------|------------|
| **Objective** | Validate the same build on Preview (or Development) with Preview configuration — deployment, env, and runtime parity checks. |
| **Owner** | Cursor (deploy & verify) · ChatGPT (business/ops review) · Product Owner (authorize Preview deploy) |
| **Entry Criteria** | Local Business Certification for the release; Product Owner authorizes Preview deployment; Preview env vars reviewed (no Production mutation). |
| **Exit Criteria** | Preview deployment live; Build Information on Preview shows correct Environment, commit, database target (if applicable), Release Health acceptable; smoke of in-scope journeys passes on Preview. |
| **Deliverables** | Preview URL; Preview Build Information snapshot (Copy Build Information); Preview Certification report / sign-off; Update **Preview Certification** on certification board. |

**Forbidden:** Changing Vercel Production env or deploying Production during this stage.

---

### Stage 5 — Internal UAT

| Field | Definition |
|-------|------------|
| **Objective** | Internal users (administrators / operators) exercise real workflows on Preview (or designated UAT target). |
| **Owner** | Product Owner (UAT sponsor) · Cursor (defect triage) · ChatGPT (severity & severity guidance) |
| **Entry Criteria** | Preview Certification passed; UAT script / scenarios agreed; test accounts available. |
| **Exit Criteria** | Agreed UAT scenarios executed; P0/P1 defects resolved or formally deferred by Product Owner; Internal UAT sign-off recorded. |
| **Deliverables** | UAT results log; defect register updates; Internal UAT sign-off. |

---

### Stage 6 — External UAT

| Field | Definition |
|-------|------------|
| **Objective** | External or extended stakeholders validate business fitness before Production readiness. |
| **Owner** | Product Owner · ChatGPT (review feedback) · Cursor (fixes under change control) |
| **Entry Criteria** | Internal UAT passed; Product Owner authorizes external access; data sensitivity controls confirmed (Pilot / non-Production customer data rules). |
| **Exit Criteria** | External feedback addressed or deferred with Product Owner approval; no unresolved P0 blocking Production intent. |
| **Deliverables** | External UAT summary; deferred item list; External UAT sign-off. |

**Note:** External UAT must not use Production unless Product Owner explicitly authorizes a Production pilot — default is Preview / Pilot.

---

### Stage 7 — Production Readiness Review

| Field | Definition |
|-------|------------|
| **Objective** | Formal Go/No-Go assessment before Production Release. |
| **Owner** | Product Owner (decision) · ChatGPT (readiness review) · Cursor (ops evidence) |
| **Entry Criteria** | Internal UAT passed; External UAT passed or waived in writing by Product Owner; rollback plan documented; migrations / env changes listed. |
| **Exit Criteria** | Written Production Readiness approval (Go) or No-Go with remediation plan; checklist in §6 complete. |
| **Deliverables** | Production Readiness Review record; mandatory checklist completed; rollback runbook; env/migration plan; risk statement. |

---

### Stage 8 — Production Release

| Field | Definition |
|-------|------------|
| **Objective** | Deploy and verify the certified build on Vercel Production. |
| **Owner** | Cursor (execute) · Product Owner (authorize) · ChatGPT (post-release business verification support) |
| **Entry Criteria** | Explicit Product Owner approval for **this** Production deploy; Stage 7 Go; no open P0 blockers. |
| **Exit Criteria** | Production deploy successful; Build Information on Production shows Environment = Production and expected commit; smoke of critical paths; Production Certification board updated; release notes published. |
| **Deliverables** | Production URL; Production Build Information snapshot; post-deploy smoke report; release notes (`docs/releases/` as applicable); Change Register entry; Production Certification status update. |

**After Production Release:** monitor Release Health; retain rollback path for the release window defined in the readiness review.

---

## 6. Mandatory Release Checklist

Complete before **Stage 7 Go** and re-confirm at **Stage 8** execute time.

### A. Scope & governance

- [ ] Release scope documented (sprint / program / ticket IDs)  
- [ ] Architecture freeze respected (or approved exceptions recorded)  
- [ ] No unauthorized workflow / routing / SSOT changes  

### B. Technical

- [ ] Build passed  
- [ ] TypeScript / critical lint passed (as applicable)  
- [ ] In-scope smoke / verification scripts passed  
- [ ] Manual ops steps listed (migrations, env vars, feature flags)  

### C. Business & certification

- [ ] Technical Certification recorded  
- [ ] Business Certification recorded for Local (minimum)  
- [ ] Preview Certification recorded (before Production)  
- [ ] UAT outcomes recorded (or Product Owner waiver)  
- [ ] Remaining limitations published  

### D. Build Information (CO-OPS-001)

- [ ] Version / build number updated for the release  
- [ ] What’s New updated  
- [ ] Certification board updated for stages achieved  
- [ ] Administrator can Copy Build Information and attach to release / support records  

### E. Deployment & rollback

- [ ] Target environment explicitly named (Preview vs Production)  
- [ ] Production changes **not** performed without Stage 8 approval  
- [ ] Rollback path identified (prior Vercel deployment / flag rollback / migration reverse plan)  
- [ ] Database write risk assessed (shared Pilot / Production SSOT rules)  

### F. Documentation

- [ ] Certification / completion report  
- [ ] Release notes (if REL / customer-facing milestone)  
- [ ] Registers updated (Program Backlog, Change Register as required)

---

## 7. Build Information Update Requirements

**SSOT panel:** Admin Console → System → Build Information (`/admin/build-information`)  
**Ops reference:** `docs/ops/CO-OPS-001-BUILD-INFORMATION.md`

| When | Required update |
|------|-----------------|
| Every certified release | `package.json` / `NEXT_PUBLIC_APP_VERSION` as applicable; build number; What’s New |
| Local Business Certified | Certification board: Local = Certified |
| Preview Certified | Certification board: Preview = Certified |
| Production Released | Certification board: Production = Certified; confirm Production Environment label |
| Emergency rollback | Note prior commit / deployment in What’s New or release notes; re-verify Build Information |

Administrators must be able to answer within seconds:

- Which build is running?  
- Which environment?  
- Which database / project?  
- Is Release Health acceptable?  
- Which certification stage has been reached?

---

## 8. Certification Rules

1. **Labels**
   - **Ready for Business Certification** — technical + evidence complete; awaiting business sign-off  
   - **Business Certified (Local | Preview | Production)** — business sign-off for that environment only  
   - **Requires Further Development** — gaps remain  
   - **Not Certified** — failed or audit-only  

2. **Environment binding** — Certification is always bound to an environment. “Certified” without Local/Preview/Production qualifier is invalid for release decisions.

3. **Independence** — Cursor produces evidence; ChatGPT performs business/architecture review; Product Owner gives final business and Production approval. Cursor does not self-certify Business Certification.

4. **Evidence** — Prefer Build Information copy, certification reports, screenshots under `docs/certification-screenshots/`, and script outputs under `scripts/`.

5. **PMO-008 alignment** — Certification programs (`CO-CERTIFICATION-*`) remain independent workstreams where applicable.

---

## 9. Rollback Readiness

Before Production Release, document:

| Element | Requirement |
|---------|-------------|
| **Prior good deployment** | Vercel deployment ID / URL of last known-good Production |
| **Feature flags** | Emergency `=false` paths (e.g. Deal Registry operational flags) if used |
| **Data / migrations** | Forward-only vs reversible; never silent destructive ops without approval |
| **Communication** | Who is notified on rollback (Product Owner + operators) |
| **Re-verification** | Smoke after rollback; update Build Information / Change Register |

Rollback of Production requires Product Owner awareness (and approval when business-impacting).

---

## 10. Deployment Discipline

| Rule | Practice |
|------|----------|
| **Sequence** | Local validation → Preview → Production |
| **Vercel Production** | No env changes and no Production deploy until Stage 8 explicit approval |
| **Preview** | Allowed after Local Business Certification and Product Owner Preview authorization |
| **Git** | Commit/push on milestones / end-of-day / explicit request — not every UI tweak |
| **GitHub vs Vercel** | Independent workflows (deployment policy) |
| **Secrets** | Never commit `.env` / credentials; never paste connection strings into Build Information or tickets |
| **Shared Pilot DB** | No unauthorized writes; Phase 2-style CRUD only with explicit approval |

Authoritative engineering policy: `.cursor/rules/github-vercel-deployment-policy.mdc`.

---

## 11. Release Approval Process

```text
Development Complete (Cursor)
        ↓
Technical Certification (Cursor → ChatGPT review)
        ↓
Business Certification Local (ChatGPT → Product Owner)
        ↓
[Product Owner] Authorize Preview deploy
        ↓
Preview Certification (Cursor verify → ChatGPT / Product Owner)
        ↓
Internal UAT → External UAT (Product Owner sponsor)
        ↓
Production Readiness Review (Checklist §6) → Product Owner Go/No-Go
        ↓
[Product Owner] Authorize Production deploy
        ↓
Production Release (Cursor) → Post-deploy verify → Certification board + release notes
```

### Approval artifacts

| Stage gate | Minimum artifact |
|------------|------------------|
| Technical Certification | Build/smoke evidence |
| Business Certification | Business & Functional Certification Report |
| Preview / Production deploy | Explicit Product Owner approval in chat or Change Register |
| Production Release complete | Build Information snapshot + smoke + release notes |

---

## 12. Relationship to Existing PMO Standards

| Document | Relationship |
|----------|----------------|
| PMO-008 Certification Governance | Defines independence and evidence; CO-GOV-001 defines the **release stage sequence** |
| PMO-009 Release Management | Environments and rollback basics; CO-GOV-001 is the **end-to-end SOP** |
| PMO-005 Change Control | Material changes during release require change control |
| CO-OPS-001 Build Information | Operational instrumentation for stages and health |
| Business Functional Certification Report rule | Mandatory report shape for business gates |

If conflict arises, **Product Owner** resolves; Architecture Review Board is engaged for architectural conflicts.

---

## 13. Document Control

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-07-23 | Initial permanent Release Governance Framework |

**Review cadence:** On major platform release or when Product Owner requests governance revision.  
**Amendments:** Require Product Owner approval. ChatGPT may draft; Cursor may file documentation PRs only when requested.

---

## 14. Adoption Statement

Effective immediately, **all Catalyst One releases** shall follow CO-GOV-001 v1.0 unless the Product Owner records a documented exception.

This framework is permanent Catalyst One governance documentation.
