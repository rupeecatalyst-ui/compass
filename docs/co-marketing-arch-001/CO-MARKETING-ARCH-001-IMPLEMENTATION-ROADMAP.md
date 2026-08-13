# CO-MARKETING-ARCH-001 — Implementation Roadmap

**Status:** PROPOSED (architecture only)  
**Rule:** No phase is authorised for coding until Product Owner approves this architecture package **and** issues a separate implementation wave prompt.

---

## 1. Roadmap principle

Build **vertical safety** before **channel blast radius**:

1. Isolate module + lifecycle + versioning  
2. Read external audience without mirroring  
3. Idempotent execution dry-run  
4. One channel (Email) with guardrails  
5. Qualification handoff into existing SSOTs  
6. Then WhatsApp / Digital / advanced ROI  

Preserve existing Catalyst One architecture, routing, navigation contracts, SSOTs, permissions, and APIs at every phase. Marketing remains **additive**.

---

## 2. Recommended sequence (adjusted)

PO suggested Phases 0–10. Engineering recommends a **reordered** sequence so Opportunity handoff is not deferred behind WhatsApp/Digital, and so dry-run execution precedes live email.

| Phase | Name | Intent | Adjust vs PO draft |
|-------|------|--------|--------------------|
| **0** | Architecture | This package; PO certify ADR | Same |
| **1** | Module foundation | EME skeleton, permissions, admin nav, Campaign CRUD + lifecycle (no send) | Added — missing from PO list but required |
| **2** | Data Source Port + Google Sheets adapter | Discover files/tabs; sample schema; bind sources | Was PO Phase 1 |
| **3** | Audience Engine | Filters, fingerprint strategy, eligibility compose, capped sample preview | Was PO Phase 2 |
| **4** | Content + Assets + Builder + Preview | Block editor, DAM, templates, Test Send UI (no prod send) | Was PO Phase 3 |
| **5** | Scheduling + Batch + Ledger (dry-run) | Async jobs, leases, ledger, SKIP simulation against Sheets | Was PO Phase 4; **dry-run first** |
| **6** | Email Adapter + Deliverability + Test/Prod send | ESP port, webhooks, guard, domain isolation runbook | Was PO Phase 5 |
| **7** | Engagement + Marketing Analytics (acquisition) | Events, funnel, campaign compare | Was PO Phase 6 |
| **8** | Qualification + Routing + Opportunity handoff + ENE | Frozen boundary; attribution stamps (D1) | Was PO Phase 9 — **pulled forward** |
| **9** | WhatsApp channel | Provider-neutral WA adapter | Was PO Phase 7 |
| **10** | Digital campaigns | Ads adapters | Was PO Phase 8 |
| **11** | Attribution depth + ROI + advanced analytics | Deal/revenue joins, ROI | Was PO Phase 10 |

### Why reorder?

- **Foundation (Phase 1)** prevents UI/API sprawl without lifecycle SSOT.  
- **Dry-run batch (Phase 5)** proves idempotency before paying ESP risk.  
- **Handoff (Phase 8) before WhatsApp/Digital** delivers business value (Opportunities) on email alone and hardens the constitutional boundary early.  
- WhatsApp/Digital are channel expansions on a proven core.

---

## 3. Phase detail

### Phase 0 — Architecture (CURRENT)

**Deliverables:** ADR, Logical Model, Data Flow, Integration Matrix, UI/UX, Roadmap.  
**Exit:** PO Architecture Approval / Certification.  
**Forbidden:** code, schema, providers, deploy.

### Phase 1 — Module foundation

- Package layout, types, constants, admin routes (empty shells OK)  
- Campaign + CampaignVersion logical persistence (**schema only when PO authorises implementation**)  
- Lifecycle state machine + audit  
- RBAC keys + Administration entry  
**Exit:** Create/save/clone campaign; transitions without send.  
**Dependencies:** D3 nav, D4 RBAC.

### Phase 2 — Google Sheets Data Source Adapter

- Data Source Port interface  
- Google adapter: auth, discover tabs, header schema, health  
- **No** full import  
**Exit:** Operator binds “Marketing Master Database” and selects a tab dynamically.

### Phase 3 — Audience Engine

- AudienceDefinition, filters, fingerprint policy (per PO D9/D10)  
- Eligibility estimate (approx counts via sampling/metadata — not full materialization unless PO accepts bounded jobs)  
**Exit:** Campaign can attach reusable audience definition.

### Phase 4 — Campaign Builder + Content + Assets

- Block document model, templates, blocks  
- Marketing Asset Library + storage (D5)  
- Desktop/mobile preview  
- Test Send path stubbed or allowlisted once Phase 6 adapter exists (UI in 4, live test in 6)  
**Exit:** Rich draft content versioned.

### Phase 5 — Scheduling + Batch + Ledger (dry-run)

- BatchPolicy, cron workers, leases  
- RecipientExecutionLedger unique constraints  
- Mode: `DRY_RUN` claims + SKIP/WOULD_SEND without provider  
**Exit:** 100k-scale pacing proven idempotent on resume/retry.  
**Dependencies:** D6 jobs.

### Phase 6 — Email + Deliverability

- Email adapter + webhook ingest  
- Suppression writes from bounce/complaint/unsub  
- Deliverability Guard  
- Domain isolation runbook (ops) — config outside app code as needed  
- Test Send vs production separation enforced  
**Exit:** Controlled production email campaign with pause/resume.  
**PO:** ESP vendor selection.

### Phase 7 — Engagement + Analytics

- EngagementEvent explorer  
- Command Center funnel for marketing stages  
**Exit:** Operators trust sent/delivered/open/click/responded metrics.

### Phase 8 — Qualification + Routing + Handoff

- QualificationRecord + rules  
- RoutingPolicy (Single/RR/Pool) durable  
- ECM resolve/create + Opportunity create  
- ENE notify (D2)  
- Attribution fields (D1)  
**Exit:** Qualified response → Contact → Opportunity without Lead; ops ownership intact.  
**Dependencies:** D1, D2, D7 optional.

### Phase 9 — WhatsApp

- WA port + consent/opt-out + templates  
**Exit:** WA campaign channel parity for send/engage/qualify hooks.

### Phase 10 — Digital

- Digital ads port; conversion → engagement/qualification  
**Exit:** At least one adapter without hard-coding platform into engine core.

### Phase 11 — Attribution + ROI

- Full chain reporting; Deal/disbursement/revenue via existing SSOTs  
- Campaign/audience/channel/product comparison  
**Exit:** Executive-ready ROI without metric formula duplication.

---

## 4. Cross-cutting gates (every implementation wave)

1. Constitutional Health Check = GREEN  
2. No raw audience mirror table  
3. No Lead entity  
4. No extension of Partner Marketing / public site marketing into EME  
5. No ENCE-as-ESP  
6. No Document Registry creatives  
7. SAVE ≠ SEND  
8. Test Send ≠ production ledger  
9. Extensions D1–D10 only with explicit PO approval  
10. Verify scripts + BAT + certification report per wave  
11. Deploy only when PO authorises that wave’s deploy  
12. Git commit only per org policy / PO request  

---

## 5. Suggested first implementation prompt (after PO approval)

**CO-MARKETING-IMPL-001 — Phase 1 Module Foundation** only:

- Scaffold EME module boundaries  
- Campaign lifecycle persistence  
- Admin Command Center shell + campaign registry/builder shells  
- Permissions + nav  
- **Still no** Google connect, ESP, WhatsApp, or send workers  

Do **not** jump to Sheets + Email in one wave.

---

## 6. Open PO decisions blocking freeze

From Alignment §14 / Integration D-list — must resolve before or during early phases:

1. Nav: Administration vs primary  
2. Fingerprint strategy (external key required?)  
3. Ledger PII retention  
4. Structured Opportunity attribution fields (D1)  
5. Approve dual-control?  
6. ESP / WA shortlist timing  
7. Marketing subdomain final name  
8. Deliverability numeric thresholds  
9. Job tech: cron+lease vs external queue  
10. WP acquisition entity path  

---

## 7. Final stop

Roadmap is a **plan**, not authorisation to build.

```text
NO CODE · NO SCHEMA · NO MIGRATION · NO EXTERNAL CONNECTION · NO DEPLOY
```

**WAIT FOR PRODUCT OWNER REVIEW AND APPROVAL** before any implementation prompt is executed.
