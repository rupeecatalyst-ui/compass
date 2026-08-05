# CO-LW-001A — Enterprise Lending Programs Workspace Architecture Review

**Status:** ARCHITECTURE REVIEW COMPLETE · **IMPLEMENTATION BLOCKED** until Product Owner approval  
**Date:** 2026-07-31 (Rev 2 — full workspace layout + rename)  
**Authority:** Product Architecture  
**Constitutional Health Check:** **GREEN** for review-only · **RED for implementation** until PO + Sprint Approval  
**Scope:** Architecture review only — **no code, no routes, no schema**

---

## Verdict

**Approve the orchestration concept** — rename primary nav **Lenders → Lending Programs**, two tabs (Lender View · Product View), same compose layer, no new SSOT.

**Condition:** Correct three false registry names before design freeze, keep Admin as the only program **write** path, and treat the nightly snapshot as **reference cache only**.

---

## 1. Architecture Review

### 1.1 Nature — APPROVED

| Proposal | Assessment |
|---|---|
| Orchestration workspace (not a registry) | ✅ |
| Rename Lenders → Lending Programs | ✅ Prefer **evolve `/lenders`** (same route, new chrome) under Replacement Certification |
| Two tabs, same enterprise data | ✅ Mandatory single compose provider |
| Primary RM operational desk | ✅ Fits Workspace category (CO-UX-020) — not Dashboard, not Admin |
| Never introduce new SSOT | ✅ Mandatory |

### 1.2 Rename & navigation

| Today | Proposed | Architecture ruling |
|---|---|---|
| Nav title **Lenders** → `/lenders` | **Lending Programs** | ✅ Rename label; keep route `/lenders` (or alias redirect) to avoid dual capability |
| Comparison directory | Lender View + Product View tabs | ✅ Replaces comparison as **ops orchestration**; do not leave a second active Lenders desk |
| `/lenders/[lenderId]/workspace` | Opened from either tab | ✅ Preserve as deep-link Lender Workspace |
| `/admin/lender-registry` · Product Programs · Matrix | Unchanged | ✅ Configuration only |

**Single Implementation:** One primary ops capability — Lending Programs. Document Legacy Retirement Impact for the current `/lenders` comparison UX.

### 1.3 Frozen program layers (CO-ARCH-005) — do not collapse

1. Enterprise Lender Registry — identity  
2. Supported Products — capability (`productsSupported`)  
3. Commercial Programs — `EnterpriseLenderProgram`  
4. Published Programs — only layer for RM comparison / recommendations  

### 1.4 Lender View layout — REVIEW

| Region | Proposed | Ruling |
|---|---|---|
| **Left** | Active lenders · default last 180 days · Search · Product · Region | ✅ Scan panel. “Active” must be **defined** (e.g. Deal/Opportunity activity in window OR published programs + recent engagement) — derive from Deal/Opportunity SSOTs, never a new “active lender” store |
| **Centre** | Selected lender · Products · Relationship Score · Coverage · Pipeline · Opportunities · Disbursements · Programme Summary · Relationship Team · Documents · Activities · Timeline | ✅ Progressive disclosure — compact identity + programme summary above fold; expand live sections. Avoid permanently mounting all panels (workspace hierarchy ~80% work) |
| **Right** | CHANAKYA · Quick Actions (Call, WhatsApp, Open Contact, Create Opportunity, Schedule Meeting) | ✅ Chanakya advisory only (non-blocking). Quick Actions must call existing ECE/outbox / journey / ECM paths — no parallel action engine |

**Centre field SSOT notes:**

| UI block | Must consume |
|---|---|
| Products / Coverage / Programme Summary | Lender Registry + published programs + Product Registry |
| Relationship Score | Existing score engine only (Contact/Partner/EBI/Radar — **do not invent** LP-local formula) |
| Pipeline / Disbursements | **Enterprise Deal Registry** (grossStage / pipeline cards) |
| Current Opportunities | Opportunity Registry filtered by lender linkage / deals |
| Relationship Team | ECM `lender_employee` + hierarchy / ERW **projection** |
| Documents | Document Registry (read/open; authoring = Document Center) |
| Activities | ECIE |
| Timeline | EDC |

### 1.5 Product View layout — REVIEW

| Region | Proposed | Ruling |
|---|---|---|
| **Left** | Product list (HL, BT, LAP, BL, WC, CF, PL, …) | ✅ Must load from **Product Registry / Product Master options** — not a hard-coded enum long-term (seed list OK only as display order hint mapped to registry codes) |
| **Centre** | Selected product → Supported Lenders → Comparison Matrix (ROI, Fee, LTV, FOIR, Tenure, TAT, Relationship Score, Pipeline, Active RM) | ✅ Matrix rows = **published programs** for that product. Commercial fields from program records; Pipeline/RM **live** |
| Click lender | Opens same Lender Workspace | ✅ Context preserve (`lenderId`); switch to Lender View with selection preferred |

**Comparison matrix:** Only **Published** programs (Layer 4). Draft/admin programs stay in Administration.

### 1.6 Design principles — coverage

| RM question | Answered by |
|---|---|
| Which lenders support this product? | Capability + published programs (snapshot + live filter) |
| Who is my Sales Manager? | ECM Banker / hierarchy (live) |
| Which programmes are available? | Published `EnterpriseLenderProgram` |
| Which lender is most active? | Live Deal/Opportunity activity (not snapshot) |
| Pipeline with this lender? | Enterprise Deal Registry |
| Live opportunities? | Opportunity Registry |
| CHANAKYA recommend? | Chanakya compose over above SSOTs |

---

## 2. SSOT Mapping

**Code names win over proposal names.**

| UI / Domain | Proposal name | **Correct Catalyst One SSOT** | Repo / Service / API (anchor) | Ownership |
|---|---|---|---|---|
| Lenders | Enterprise Lender Registry | **Enterprise Lender Registry** | `server/repositories/lender-registry` · `/api/lender-registry` | Master |
| Products | Enterprise Product Registry | **Product Registry** (+ Product Master options) | `product-registry` · `/api/product-registry` · `enterprise-product-master` | Master (CO-ADMIN-005) |
| Published programmes | “Programme Registry” | **`EnterpriseLenderProgram` nested under Lender Registry** — **no Programme Registry** | `/api/lender-registry/programs` · `program-architecture.ts` | Commercial layer |
| Capability / Product↔Lender matrix | — | Derived from `productsSupported` + programs + Product Registry | `/api/admin/product-lender-matrix` (admin write); LP **read** | Masters |
| Banker contacts | Enterprise Contact Registry | **ECM** · role **`lender_employee`** (Banker = UX label) | `/api/ecm/contacts` | Contact SSOT |
| Lender relationships | “Enterprise Relationship Registry” | **Does not exist** — ECM relationships + ERW projection | ECM / `enterprise-relationship-workspace` | Projection only |
| Live opportunities | Opportunity Registry | **Opportunity Registry** | `/api/enterprise-opportunities` | Opportunity |
| Pipeline | “Loan Registry” | **Enterprise Deal Registry** (My Deals) — **no Loan Registry** | `/api/enterprise-deals` | Deal |
| Activities | ECIE | **ECIE** Activity Registry | `/api/enterprise-conversation-activities` | ECIE |
| Timeline | EDC | **EDC** | Dialogue Center / timeline ports | EDC |
| Tasks | ETE | **Enterprise Task Engine** | ETE lib/ports | ETE |
| Documents | Document Registry | **Document Registry** (+ Document Center authoring) | document APIs | Documents |
| Insights | CHANAKYA | **CHANAKYA** (advisory; consume metrics SSOTs) | `chanakya-*` libs | Advisory |

### Mandatory vocabulary freeze (before sprint)

| Do not say | Say |
|---|---|
| Programme Registry | Published Lender Programs (`EnterpriseLenderProgram`) |
| Loan Registry | Enterprise Deal Registry |
| Relationship Registry | ECM relationships / ERW projection |
| Banker role code | `lender_employee` |

---

## 3. Data Ownership Matrix

| Data | Owner | Lending Programs may | Must never |
|---|---|---|---|
| Lender / Product / Program masters | Admin Masters + Registries | Read · filter · navigate · deep-link Admin | Become CRUD SSOT |
| Snapshot indexes / matrix | Technical read-model | Cache · Refresh Snapshot | Write back as master |
| Bankers / team | ECM | Search · open · progressive create via ECM | Local contact DB |
| Opportunities / Deals / Tasks / ECIE / EDC / Docs | Respective registries | Live query · open journey | Duplicate stores |
| Relationship Score / pipeline KPIs | Existing metric engines | Display via shared derive | Local LP formulas |
| Chanakya copy | Guide / compose | Advise | Block workflow / invent numbers |

### No new SSOT — confirmed

| Artefact | Introduced? |
|---|---|
| New Registry | ❌ No |
| New Contact / Product / Lender / Timeline / Notes store | ❌ No |
| Duplicated master data | ❌ No |
| Orchestration compose + optional snapshot cache | ✅ Allowed (not SSOT) |

---

## 4. Performance Review

### 4.1 Nightly snapshot (02:00) — CONDITIONALLY APPROVED

| Include | Verdict |
|---|---|
| Lender Registry reference | ✅ |
| Product Registry reference | ✅ |
| Published programs (not “Programme Registry”) | ✅ |
| Capability + Product↔Lender matrix | ✅ |
| Search / region / active-lender **candidate** indexes | ✅ (active list must be rebuildable from live rules or marked approximate) |
| Opportunities · Pipeline · Activities · Timeline · Tasks · CHANAKYA | ❌ **Never** |

**Conditions:** Regenerable cache; version + `generatedAt`; invalidate on Admin master publish; timezone documented (Vercel cron UTC); prefer extend EME Category A pattern or dedicated LP cron **after PO schedule approval** — avoid colliding with existing EME `30 20 * * *` UTC without ops review.

### 4.2 Live domains — confirmed

Opportunities · Deal Pipeline · Activities · Timeline · Tasks · CHANAKYA · Relationship Team → **always live** (query on select / Manual Refresh live pass).

### 4.3 Refresh Snapshot button — ALIGNED

| Behaviour | Ruling |
|---|---|
| Button on both tabs | ✅ Same action (shared compose) |
| Rebuilds reference snapshot / session cache | ✅ |
| Also refreshes live domains for current selection | ✅ Recommended (label: **Refresh** with optional “Snapshot only” vs “All”) |
| Recalculates private KPIs | ❌ Forbidden |

### 4.4 Runtime tactics

- Lazy-load Activities / Timeline / Documents / Tasks until section open  
- Page Deal/Opportunity queries by `lenderId` / product  
- Matrix from snapshot; overlay live pipeline counts  
- Enterprise Search Autocomplete patterns for left-rail search  

---

## 5. Risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Invent Programme / Loan / Relationship Registry | Critical | Vocabulary freeze §2 |
| R2 | Dual-run old `/lenders` comparison + new desk | High | Evolve in place + Replacement Certification |
| R3 | Hard-coded product left rail diverges from Product Master | High | Registry-driven list |
| R4 | Snapshot includes “active” / pipeline → stale ops | Critical | Live-only for ops metrics |
| R5 | New Relationship Score formula | Critical | Metric Single Implementation |
| R6 | Right-rail Quick Actions invent comms/task engines | High | Reuse Action Center / ECIE / ETE / journey |
| R7 | Centre becomes permanent KPI dashboard | Medium | Progressive disclosure · CO-UX-020 |
| R8 | Chanakya blocks Create Opportunity | High | Non-blocking constitution |
| R9 | Admin matrix write from ops desk | High | Read-only matrix in LP |
| R10 | 180-day “active” undefined | Medium | Document derivation rule in Sprint Spec |

---

## 6. Recommendations

1. **Approve** rename + two-tab orchestration on `/lenders` (evolved).  
2. **Freeze SSOT vocabulary** (no Programme/Loan/Relationship Registry).  
3. **One compose provider** — `composeLendingProgramsWorkspace({ view, lenderId?, productId? })` returning snapshot slice + live handles.  
4. **Admin-only writes** for programs/matrix.  
5. **Option B contact policy** for bankers (align CO-BUG-004): restore soft-deleted; don’t fork identity.  
6. **Relationship Score** — PO names which existing engine; no LP-local score.  
7. **Replacement Certification** for retiring comparison-only UX.  
8. Implementation **BLOCKED** until PO signs this review.

---

## 7. Suggested Improvements

1. Shared **Published Program Projection DTO** for both tabs + matrix.  
2. Pivot contract: `lenderId` ↔ `productCode` ↔ `programId`.  
3. Snapshot schema version + source hashes (lender/product/program).  
4. Left-rail “Active (180d)” = documented Deal/Opportunity activity rule.  
5. Product View matrix columns = program commercial fields SSOT; blank = Not Specified (CAD-2026-001).  
6. Deep-link: `?view=lender|product&lenderId=&productId=` for shareable RM state.  
7. CHANAKYA right panel consumes compose output only.  
8. Align Quick Actions with Action Center primitives.

---

## 8. Final Proposed Architecture

```text
PRIMARY NAV
  Lending Programs  →  /lenders   (evolved; Replacement Certification)

┌─────────────────────────────────────────────────────────────────────────┐
│  [ Lender View ]  [ Product View ]              [ Refresh Snapshot ]   │
└─────────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
     Lending Programs Compose Provider (read-only)
              │
     ┌────────┴────────┐
     ▼                 ▼
 SNAPSHOT (nightly +   LIVE (on select / refresh)
 refresh)              Opportunities · Deals · ECIE ·
 Lenders · Products ·  EDC · ETE · Docs · ECM team ·
 Published Programs ·  CHANAKYA compose
 Capability/Matrix ·
 Search/Region indexes
              │
              ▼
     NO new registry / store
              │
     Admin Masters remain write SSOT:
     Lender Registry · Product Registry ·
     Product–Lender Matrix · Program Portal
```

### Tab behaviour

| Tab | Left | Centre | Right |
|---|---|---|---|
| **Lender View** | Active lenders (180d default) + search/filters | Selected lender orchestration panels | CHANAKYA + Quick Actions |
| **Product View** | Product Master list | Supported lenders + published comparison matrix | Same CHANAKYA/actions scoped to selection |
| Cross-link | — | Click lender → Lender Workspace / Lender View selection | — |

### Data flow principle

> **One compose · two navigations · zero new SSOTs.**  
> Snapshot accelerates masters; live domains never sleep in the snapshot.

---

## Implementation gate

| Gate | Status |
|---|---|
| Architecture Review (this document) | ✅ Complete |
| Product Owner approval | ⏳ Required |
| Sprint Approval | ⏳ Required |
| Production code | ⛔ **Blocked** |

---

**End of CO-LW-001A Rev 2 — wait for Product Owner approval before any implementation.**
