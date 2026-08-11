# CO-ORG-006 — Cross-Cutting Capability Scorecard

**Sprint:** CO-ORG-006  
**Date:** 2026-08-07  
**Method:** Architecture + static engineering gates (not live BAT)

## Scorecard

| # | Capability | Grade | Summary |
|---|------------|-------|---------|
| 1 | Activity (EAR) | **PARTIAL** | Dual-write + readers wired; needs prisma + BAT; Document Registry → EAR still gap |
| 2 | Documents | **PARTIAL** | Document Center is authoring SSOT; storage is localStorage/IndexedDB |
| 3 | Dialogue | **PARTIAL** | EDC projects + hydrates from EAR; EDC itself not Prisma-durable |
| 4 | Tasks (ETE) | **PARTIAL** | Universal Create Task + My Work; in-memory ports (no Prisma ETE) |
| 5 | Timeline | **PARTIAL** | Domain ledgers + EAR coexist; Loan FileTimeline ≠ EAR reader |
| 6 | Audit | **PARTIAL** | Org audit durable; EDL in-memory; Business Notes history with prisma |
| 7 | Enterprise AI | **PARTIAL** | Chanakya advisory OPERATIONAL; Orchestrator cutover **NOT READY** |

## Detail

### 1. Activity — Enterprise Activity Registry

- Model: `EnterpriseActivityEvent`
- API: `GET/POST /api/enterprise-activity`
- Dual-write: EDC, Deal Timeline, Org MDM, ECIE, Business Notes (`business_notes`)
- Readers: Dashboard Activity Timeline, Org Recent Activity, Dialogue hydrate, Situation Room provider
- Gap: Document uploads do not emit EAR; historical backfill missing
- Gate: `npm run verify:co-org-003` ✅

### 2. Documents

- Authoring: Opportunity Document Center only
- Deal Documents: read-only customer projection (+ lender-scoped upload exception)
- Store: `src/lib/document-registry/store.ts` (localStorage metadata + IndexedDB binaries)
- Gap: not Postgres document SSOT; no EAR emit on upload

### 3. Dialogue

- Compose: `src/lib/enterprise-dialogue-center/`
- EAR dual-write on append; hydrate from EAR into OW Dialogue / Dialogue Center
- Gap: EDC in-memory projection; demo seed path when demo seeds enabled

### 4. Tasks

- SSOT: Enterprise Task Engine (`src/lib/enterprise-task-engine/`)
- Surfaces: `/tasks`, Create Task in OW / Deal / Customer / Document Center / Dashboard
- Gap: no Prisma ETE ports; soft-delete task adapter stubbed

### 5. Timeline

- EAR = universal chronology
- Deal Timeline = domain ledger (dual-writes EAR)
- FileTimeline = LoanFile-shaped UI in Deal/Loan workspace
- OW Dialogue timeline = EAR-hydrated projection
- Gap: no single unified timeline UI across all desks

### 6. Audit

| Slice | Status |
|-------|--------|
| Organization audit (`OrganizationAuditEntry`) | OPERATIONAL with prisma |
| Enterprise Decision Ledger | PARTIAL — in-memory Phase 1 |
| Soft-delete Recovery | PARTIAL — real adapters for contact/company/opp/deal; stubs for tasks/notes/workflow |
| Business Notes modification history | PARTIAL → near OPERATIONAL with prisma (CO-UX-021) |

### 7. Enterprise AI

| Surface | Status |
|---------|--------|
| CHANAKYA Radar | OPERATIONAL (advisory) |
| Live Intelligence (Layer 1) | OPERATIONAL (advisory) |
| Workspace Intelligence Ribbon (Layer 2) | OPERATIONAL (advisory) |
| Chanakya Guide | OPERATIONAL (advisory) |
| SARATHI | PARTIAL (stub/voice ports) |
| Enterprise AI Orchestrator production cutover | **NOT READY** (ADR-022) |

Constitutional: Chanakya never hard-blocks workflow.

## Related programme gates

| Gate | Result (2026-08-07) |
|------|---------------------|
| `verify:co-org-001` | PASS (engineering) |
| `verify:co-org-002` | PASS (engineering) |
| `verify:co-org-003` | PASS (engineering) |
| `verify:co-org-004` | PASS (engineering) |
| `verify:co-ux-021` | PASS (engineering) |
| `verify:co-org-006` | See package script |

**Engineering Pass ≠ Business Certification.**
