# CO-ORG-002 — Registry Activation Report

**Sprint:** CO-ORG-002  
**Status:** Activation complete · Ready for Product Owner review (not Certified) · **No deploy**  
**Date:** 2026-08-07

---

## 1. Objective

Activate architecturally present registries that had Prisma models and APIs but still used stub adapters or seed-only dual books in Recovery Center and Product Library surfaces.

No UX layout redesign. No Vercel deployment. No git commit (per PO instruction).

---

## 2. Registry Status (full inventory)

**Baseline:** intended Soft Go-Live with `ENTERPRISE_PERSISTENCE_MODE=prisma`. Without prisma, Prisma-backed registries fail closed.

| # | Registry | Class | Persistence | Notes |
|---|----------|-------|-------------|-------|
| 1 | ECM Contact | PARTIALLY → **ACTIVE*** | Prisma | *when prisma on; demo seed gated |
| 2 | ECM Company | PARTIALLY → **ACTIVE*** | Prisma | *when prisma on |
| 3 | Opportunity Registry | **ACTIVE*** | Prisma | *BLOCKED if mode≠prisma |
| 4 | Deal Registry | **ACTIVE*** | Prisma | Soft Go-Live dual residual |
| 5 | Product Master / Registry | **ACTIVE*** | Prisma | Canonical SSOT |
| 6 | Product Library (legacy) | **INACTIVE** (quarantined) | Seed | CO-ORG-002 emptied under prisma |
| 7 | Lender Registry | **ACTIVE*** | Prisma | Local store Soft Go-Live only |
| 8 | Product Programs | **ACTIVE*** | Prisma | Data quality residual |
| 9 | Product–Lender Matrix | **ACTIVE*** | Prisma | |
| 10 | Document Type Master | **ACTIVE*** | Prisma | |
| 11 | Transaction Document Registry | PARTIALLY | Dual (local + sync) | Browser authoring residual |
| 12 | Reference / Lookup Masters | **ACTIVE*** | Prisma + dual-read | |
| 13 | Region Master | **ACTIVE** | Constants | Frozen 4 regions |
| 14 | City Master | PARTIALLY | Seed + Ref Master | CitySelect residual |
| 15 | Wealth Partner Registry | PARTIALLY | Prisma + Gateway Map | Gateway opportunities stub |
| 16 | Invitation Engine | **ACTIVE*** | Prisma | Delivery residual |
| 17 | Invoice Party Master | **ACTIVE*** | Prisma | Accounting book still mock |
| 18 | Accounting Workspace | **BLOCKED** | Mock | Not a registry; mock ledger |
| 19 | Organization Documents | PARTIALLY → **ACTIVE*** | Prisma | Recovery activated |
| 20 | Organization Workspace MDM | PARTIALLY → **ACTIVE*** | Prisma | CO-ORG-001 |
| 21 | Corporate Compliance Center | PARTIALLY | Prisma | CO-CCC-001 foundation |
| 22 | Soft-Delete Recovery | PARTIALLY → **ACTIVE*** | Prisma | Opp/Deal/OrgDoc live; ETE stubs |
| 23 | Decision Ledger (EDL) | INACTIVE | In-memory | Needs Prisma ports |
| 24 | Task Engine (ETE) | PARTIALLY | In-memory | Needs Prisma ports |
| 25 | User Registry | PARTIALLY | Dual Prisma+EUM | Unify residual |
| 26 | Communication Profiles | PARTIALLY | Prisma | Outbox wire residual |
| 27 | Enterprise Asset Library | INACTIVE | In-memory | |
| 28 | Foundation Libraries | INACTIVE | In-memory | |
| 29 | Workflow Engine Registry | PARTIALLY | Seed/memory | Not pipeline runtime |

\* ACTIVE under prisma cutover; not production-certified without BAT.

---

## 2b. CO-ORG-002 activation focus (this sprint)

| Registry | Prisma model / API | Operational SSOT | Recovery adapter | CO-ORG-002 change |
|----------|-------------------|------------------|------------------|-------------------|
| ECM Contact | `EcmContact` | ✅ Prisma | ✅ Live (prior) | — |
| ECM Company | `EcmCompany` | ✅ Prisma | ✅ Live (prior) | — |
| Enterprise Opportunity | `EnterpriseOpportunity` | ✅ Prisma | ✅ **Activated** | `opportunity.adapter.ts` |
| Enterprise Deal | `EnterpriseDeal` | ✅ Prisma | ✅ **Activated** (`loan_files`) | `deal.adapter.ts` |
| Organization Documents | `OrganizationDocument` | ✅ Prisma | ✅ **Activated** | `organization-document.adapter.ts` |
| Enterprise Product (Master) | `EnterpriseProduct` | ✅ Prisma | N/A | SSOT callout |
| Product Library (seed) | — | ❌ Quarantined | N/A | Empty under prisma |
| Enterprise Lender | `EnterpriseLender` | ✅ Prisma | N/A | Local-store quarantine |
| ETE / Notes / Workflow | — | ❌ | Stub | Deferred |

---

## 3. What Was Activated (CO-ORG-002)

### A. Soft-delete adapters (Recovery Center)

| Adapter | Module id | Entity |
|---------|-----------|--------|
| `opportunity.adapter.ts` | `opportunities` | `prisma.enterpriseOpportunity` — isDeleted + archived |
| `deal.adapter.ts` | `loan_files` | `prisma.enterpriseDeal` — isDeleted + archived |
| `organization-document.adapter.ts` | `documents` | `prisma.organizationDocument` — status archived/active |

`soft-delete.service.ts` now imports real adapters for opportunities, loan_files, and documents. Stubs remain for tasks, notes, workflow_instances.

### B. Product Library dual-book quarantine

- SSOT callout on Overview, Registry, Lifecycle pages
- Prisma mode: empty state + CTA → Product Master on Registry and Overview
- Lifecycle: callout + zero seed counts under prisma
- `product-store.ts` header: seed/demo only — do not expand

### C. Lender local-store quarantine

- `local-store.ts` header: Soft Go-Live only when mode ≠ prisma; never operational under prisma

### D. Engineering gate

- `scripts/co-org-002-verify.mjs`
- `npm run verify:co-org-002`

---

## 4. Files Changed

### New

- `server/services/soft-delete/adapters/opportunity.adapter.ts`
- `server/services/soft-delete/adapters/deal.adapter.ts`
- `server/services/soft-delete/adapters/organization-document.adapter.ts`
- `src/components/catalyst-one/product-library/product-library-ssot-callout.tsx`
- `docs/co-org-002/CO-ORG-002-REGISTRY-ACTIVATION-REPORT.md`
- `scripts/co-org-002-verify.mjs`

### Modified

- `server/services/soft-delete/soft-delete.service.ts`
- `server/services/soft-delete/adapters/stub.adapters.ts`
- `src/constants/enterprise-soft-delete/index.ts` — `SOFT_DELETE_LIVE_MODULES`
- `src/lib/product-library/product-store.ts`
- `src/lib/enterprise-lender-registry/local-store.ts`
- `src/components/catalyst-one/product-library/product-registry-view.tsx`
- `src/components/catalyst-one/product-library/product-library-overview-dashboard.tsx`
- `src/components/catalyst-one/product-library/product-lifecycle-view.tsx`
- `package.json` — `verify:co-org-002`

---

## 5. Remaining Gaps

1. **ETE / Notes / Workflow** — Recovery stubs until durable Prisma authoring SSOT exists.
2. **Transaction Document Registry** — still localStorage/IndexedDB authoring + best-effort sync.
3. **EDL / EAF / Foundation Libraries** — in-memory ports; not journey-blocking for registry activation.
4. **City Master** — many pickers still use seed; Reference Master Prisma path not universal.
5. **Wealth Partner Gateway** — registry Prisma OK; partner opportunity store still placeholder Map.
6. **Accounting** — Invoice Party Active; workspace ledger **BLOCKED** (mock).
7. **User Registry** — Prisma list + EUM localStorage dual book.
8. **Organization document Recovery** — uses `status archived`; no deletionReason column on model.
9. **Product Library** — Audit/Detail seed paths remain for non-prisma local; Master is live SSOT under prisma.
10. **Live E2E Recovery** — opportunity/deal/org-doc soft-delete Scenario Pack not yet run (OPEN per CO-QA-001).
11. **Deal permanent delete** — cascades not fully audited; BAT caution.

---

## 6. Certification

| Gate | Status |
|------|--------|
| Static verify (`verify:co-org-002`) | ✅ PASS |
| Build / TypeScript | Pending PO environment |
| E2E Business Scenario | **Not run** — **OPEN** per CO-QA-001 |
| Product Owner acceptance | **Not Certified** |
| Deploy | **Not authorised** |

**Claim:** Ready for Product Owner review — **not** Business Certified.

Recommended PO BAT (after prisma mode): Recovery Center → soft-delete opportunity → list → restore → soft-delete deal → archive org document → restore → confirm Product Library Overview shows CTA to Product Master (no seed inventory).

---

*End of CO-ORG-002 Registry Activation Report*
