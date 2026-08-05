# CO-LENDER-SSOT-VERIFY-002 — Enterprise Lender Registry Reconciliation

**Status:** Investigation Complete · Awaiting Product Owner Approval  
**Priority:** P0 (Enterprise Architecture)  
**Date:** 2026-08-05  
**Scope:** Full ecosystem reconciliation — **no code · no DB · no deploy · no seed / recreate / ID mutation**

**Related:**  
- `CO-LENDER-SSOT-VERIFY-001` / `CO-LENDER-SSOT-REMEDIATE-001` (selection path)  
- `CO-LENDER-BAT-009` (Jio Financial Services missing)  
- `CO-LENDER-HIERARCHY-SSOT-001` (Hierarchy localStorage)

---

## Executive verdict

| Question | Answer |
|----------|--------|
| Is there ONE intended SSOT for institutions? | **Yes — Enterprise Lender Registry (ELR)** · Prisma `enterprise_lenders` · PK `EnterpriseLender.id` (cuid) |
| Is the whole ecosystem compliant today? | **No** — strong on Deal / Partner / BT / selection; weak on Hierarchy, Policy, Customer 360, name catalogues, Soft Go-Live **writes** |
| Does “Jio Financial Services” exist in ELR? | **No** (only seeded **Jio Payments Bank**) |
| Can Hierarchy placeholders be retired safely? | **Yes** — localStorage / demo / hardcoded ranks hold **no live enterprise data** |

---

## 1. Registry ownership (constitutional)

```
Enterprise Lender Registry (ELR)
  enterprise_lenders  ←── Institution SSOT (Enterprise Lender ID)
        │
        ├── enterprise_lender_programs     (Lending Programs)
        ├── enterprise_lender_contacts     (ELR Contacts — parallel to employees)
        ├── enterprise_lender_documents    (Lender document attachments)
        └── products_supported[]           (Product–Lender matrix input)

Enterprise Contact Registry (ECM)
  ecm_contacts (role = lender_employee)
        └── institution = EnterpriseLender.id   ←── Employee SSOT

Enterprise Product Registry
  enterprise products                       ←── Product Master (not lender SSOT)

Enterprise Deal Registry
  enterprise_deals.lenderId → enterprise_lenders.id
```

**There is no separate “Enterprise Lender Employee” table.** Employees = ECM contacts with role `lender_employee` bound to ELR id.

---

## 2. Module reconciliation matrix

| # | Module | Registry consumed | DB entity | API | Uses ELR ID? | Placeholder / local / demo? | SSOT |
|---|--------|-------------------|-----------|-----|--------------|-------------------------------|------|
| 1 | **Enterprise Lender Registry** | ELR | `enterprise_lenders` (+ cats) | `/api/lender-registry/lenders` | Yes | Soft Go-Live on **create/update** if API fails | **Partial** |
| 2 | **Lending Programs** | ELR programs | `enterprise_lender_programs` | `/api/lender-registry/.../programs` + client query | Yes | sessionStorage compose cache; Soft Go-Live program fallback | **Partial** |
| 3 | **Product Library** | Product Registry | Product tables | `/api/product-registry/*` | N/A (products) | — | **Yes** (products) |
| 4 | **Product Mapping** | ELR `productsSupported` + programs | `enterprise_lenders`, programs | `/api/admin/product-lender-matrix` | Yes | **pageSize 200** hide risk | **Partial** |
| 5 | **Policy Library** | Credit Risk seed store + capped ELR picker | **None** (in-memory/seed) | N/A / local policy store | New picks may use ELR; seeds use `lender_001` | Demo policies / names | **No** |
| 6 | **Policy Mapping** | Placeholder admin page | — | — | No | `CreditRiskSectionPlaceholder` | **No** |
| 7 | **Document Library** (lender) | ELR documents | `enterprise_lender_documents` | `/api/lender-registry/.../documents` | Yes | Soft Go-Live replace fallback | **Partial** |
| 8 | **Document Mapping** | No dedicated ELR×product doc matrix | Doc Registry optional `links.lenderId` | Document APIs | Optional | Org / LOD elsewhere | **N/A / Partial** |
| 9 | **Lender Contacts** | ELR contacts | `enterprise_lender_contacts` | `/api/lender-registry/.../contacts` | Yes | Soft Go-Live fallback | **Partial** |
| 10 | **Lender Employees** | ECM `lender_employee` | `ecm_contacts` (+ `reports_to`) | `/api/ecm/contacts` | Yes (`institution`) | Branch/region cascade still legacy ECM parents | **Partial** |
| 11 | **Lender Hierarchy** | **None (UI local)** | — | **None** | Keys chart by lenderId but **does not load employees** | localStorage + demo + hardcoded ranks | **No** |
| 12 | **Deal Workspace** | ELR → Deal FK | `enterprise_deals.lenderId` | Deal APIs + ELR search | Yes | Soft Go-Live ids blocked for Deal FK | **Yes** |
| 13 | **Customer Workspace** | LoanFile/display strings | N/A | — | Often **name string** | Seed / hardcoded “HDFC Bank” | **No** |
| 14 | **Wealth Partner APIs** | ELR via Partner Gateway | `enterprise_lenders` | `GET /api/partner/masters/lenders` | Yes | No Soft Go-Live | **Yes** |
| 15 | **Wealth Partner App** | Partner masters | — | Partner API | Yes (`lenderId`) | — | **Yes** |
| 16 | **BT Current Lending Institution** | ELR select | Opportunity/Loan BT fields | ELR selection client | Yes | — | **Yes** |
| 17 | **Institution dropdowns** | ELR (`BankerInstitutionSelect`) | ECM profile stores id | Selection API | Yes | ECM `masters.lender` emptied but branch/region legacy | **Partial** |
| 18 | **Other C1 selectors** | Mixed | Mixed | Mixed | Deal/BT/LIFE/canonical = Yes | `LENDERS_BY_PRODUCT` names; policy 200-cap; ELW profile | **Mixed** |

---

## 3. Database entities (lender ecosystem)

| Entity | Table | Owns |
|--------|-------|------|
| `EnterpriseLender` | `enterprise_lenders` | Institution master |
| `EnterpriseLenderProgram` | `enterprise_lender_programs` | Lending programmes |
| `EnterpriseLenderContact` | `enterprise_lender_contacts` | Institution CRM contacts |
| `EnterpriseLenderDocument` | `enterprise_lender_documents` | Lender attachments |
| `EcmContact` | `ecm_contacts` | Lender employees (`lender_employee`) |
| `EcmContactRelationship` | relationships | Reporting (`reports_to`) |
| `EnterpriseDeal` | deals table | `lenderId` FK to ELR |

**Non-DB / non-SSOT stores still present**

| Store | Key / location | Risk |
|-------|----------------|------|
| Soft Go-Live ELR | `compass:enterprise-lender-registry-v1` | Ghost creates (e.g. Jio Financial Services) |
| ELW Hierarchy | `catalyst.elw.hierarchy-assignments.v1` | Vacant Hierarchy tab |
| Policy seed | `policy-seed.ts` / `lenders-seed.ts` | Demo lender ids |
| Name catalogue | `LENDERS_BY_PRODUCT` | Name-only offers |
| ECM `masters.lender` | emptied `[]` | Retired but branch parents still legacy codes |

---

## 4. API / save / read flows (canonical)

### Institution (ELR)

```
UI select / admin
  → searchEnterpriseLendersForSelection | lenderRegistryClient.queryLenders
  → GET /api/lender-registry/lenders
  → lenderRegistryService → Prisma enterprise_lenders
```

**Save (admin create):**

```
new-lender-wizard
  → lenderRegistryClient.createLender
  → POST /api/lender-registry/lenders   ✅ Prisma
  → if API null → Soft Go-Live localStorage  ⚠️ (still present)
```

Prisma-mode **reads** for selection refuse Soft Go-Live; **writes** can still succeed locally → list disappears after refresh.

### Employees (ECM)

```
saveEldLenderEmployeeEmployment / Contact Workspace
  → PATCH /api/ecm/contacts
  → institution = EnterpriseLender.id
```

### Hierarchy (broken)

```
eld-slide-over Hierarchy tab
  → deriveElwHierarchy(lenderId)  // localStorage only
  → no ECM / no API
```

### Partner / WP

```
PartnerLenderSelect → GET /api/partner/masters/lenders → ELR cuid
```

---

## 5. Enterprise Lender ID integrity

### Compliant (use ELR cuid)

- Deal Workspace binding (`EnterpriseDeal.lenderId`)
- Partner masters + Wealth Partner App
- BT Current Lending Institution
- `EnterpriseLenderRegistrySelect` / selection-client
- Banker Institution field (stores cuid on ECM profile)
- Product–Lender matrix body `lenderId` (when loaded)
- ELR programs / contacts / documents FKs

### Non-compliant or weak

| Pattern | Where | Example |
|---------|-------|---------|
| Soft Go-Live / local UUID | `createLender` fallback | `elend-*`, `local-*`, `uid_*` |
| Demo policy id | Credit Risk seeds | `lender_001`, “Partner Bank Alpha” |
| Lender **name** catalogue | `LENDERS_BY_PRODUCT`, insights match | “HDFC Bank” string keys |
| Seed catalog key as stamp | LIFE / move-to-deal `seedKey` | `piramal_finance` as code |
| Display name only | Customer 360 `file.lender` | No ELR id |
| Legacy ECM parent codes | Region/branch masters | `hdfc`, `sbi` parents |
| Hardcoded demo | Analyze Deal mocks, Customer create | `hdfc` / “HDFC Bank” |

**Rule for remediation:** every operational FK must be `EnterpriseLender.id`. Names/codes are display or remapping aids only.

---

## 6. Jio Financial Services (from CO-LENDER-BAT-009)

| # | Question | Answer |
|---|----------|--------|
| 1 | Exists in ELR? | **No** |
| 2 | Committed successfully? | **No** Prisma commit found |
| 3 | Active? | N/A |
| 4 | Enabled? | N/A |
| 5 | Archived? | N/A |
| 6 | Pending? | N/A |
| 7 | Filtered by lifecycle? | N/A — row absent |
| 8 | Returned by Enterprise APIs? | **No** |
| 9 | Why? | Never landed in `enterprise_lenders`; most likely Soft Go-Live create fallback or failed API with UI success |
| 10 | Products linked? | **No** durable ELR FK |
| 11 | Policies linked? | **No** ELR child linkage |
| 12 | Enterprise Lender ID present? | **No** |
| 13 | Child records correct ID? | **No parent id** |

**Related live row (different institution):** seeded **Jio Payments Bank** (`JIO_PAYMENTS`) — do **not** treat as Jio Financial Services.

Seed catalog also has `jio_payments` only — **no** `jio_financial_services` seed key.

---

## 7. Hierarchy retirement safety

| Placeholder | Storage | Live business data? | Safe to retire? |
|-------------|---------|---------------------|-----------------|
| localStorage hierarchy | `catalyst.elw.hierarchy-assignments.v1` | **No** (browser-only UI) | **Yes** |
| Demo hierarchy seed | `seedForLender` when demo enabled | **No** (synthetic names) | **Yes** |
| Hardcoded ranks | `ELW_HIERARCHY_RANKS` | **No** (UI scaffold) | **Yes** (replace with ECM projection; PO may keep vacant UX slots as UI-only) |
| Static rank cards / Open Contact stub | `elw-hierarchy-chart.tsx` | **No** | **Yes** |

**Target:** Hierarchy becomes a **read projection** of ECM Lender Employees for the open ELR id (`institution` + `reports_to`), not a second store.

Retiring these placeholders **cannot** delete ECM employees, ELR lenders, Deals, or programs.

---

## 8. Compliant vs non-compliant summary

### SSOT compliant (or strong)

- Deal Workspace lender binding  
- Wealth Partner APIs + App  
- BT Current Lending Institution  
- Primary institution selectors (post REMEDIATE-001)  
- Product Master (own registry)

### Not compliant

- Lender Hierarchy (localStorage)  
- Policy Library / Policy Mapping  
- Customer Workspace / 360 lender fields  
- Name-based product offer catalogue (`LENDERS_BY_PRODUCT`)  
- Soft Go-Live **write** path on lender create/update/programs/contacts/docs  

### Partial

- ELR admin itself (reads Prisma; writes may local-fallback)  
- Lending Programs / Documents / ELR Contacts  
- Product–Lender matrix (FK correct; pageSize 200)  
- Lender Employees (institution OK; org cascade legacy)  
- Institution dropdowns (institution OK; branch/region legacy)

---

## 9. Root causes (platform)

1. **Dual persistence:** Soft Go-Live localStorage still accepts successful-looking creates when Prisma API fails → ghost lenders (Jio Financial Services pattern).  
2. **Projection debt:** Hierarchy never wired to ECM employees.  
3. **Parallel masters:** Policy demo store, name catalogues, Customer display strings, ELR Contacts vs ECM Employees.  
4. **Incomplete REMEDIATE-001:** Selection reads fixed; **writes** and some list caps (200) remain.  
5. **Legacy ECM geography:** Branch/region still keyed to old lender codes after institution moved to ELR id.

---

## 10. Recommended remediation sequence (await PO approval)

| Phase | Work | Effort | Risk to live data |
|-------|------|--------|-------------------|
| **P0-A** | Fail-closed `createLender` / `updateLender` / programs / contacts / docs when prisma mode (no Soft Go-Live write) + wizard error UI | **S** (0.5–1 day) | None (stops ghost writes) |
| **P0-B** | After PO BAT: properly create **Jio Financial Services** via Prisma only; link products/programs | **S** (ops + QA) | Controlled create only — no delete/reset |
| **P0-C** | Hierarchy → ECM projection; retire localStorage/demo/hardcoded occupancy; wire Open/Assign to Employee Workspace | **M** (2–4 days) | None if projection-only |
| **P1** | Raise/remove `pageSize: 200` on matrix, policy picker, program portal | **S** (0.5 day) | None |
| **P1** | Unify Lender Workspace Contacts with ECM employee API load path | **S–M** (1–2 days) | None |
| **P2** | Policy Library: bind policies to ELR id; retire `lender_001` demo as operational truth | **L** (1–2 weeks) | Migrate carefully; no silent delete |
| **P2** | Policy Mapping real workspace (replace placeholder) | **L** | New capability |
| **P2** | Retire `LENDERS_BY_PRODUCT` name catalogue → ELR programs / Product Master | **M–L** (3–7 days) | Display remap only |
| **P3** | Customer 360 / create: store ELR id, not name-only | **M** (2–4 days) | Dual-read during cutover |
| **P3** | ECM branch/region cascade keyed to ELR id | **M–L** | Master data remap |
| **P3** | Document Mapping (if PO requires product×lender LOD matrix) | **L** | Architecture decision first |

**Effort legend:** S ≤ 1 day · M 2–5 days · L > 1 week (engineering + BAT).

---

## 11. Live data protection statement

This investigation:

- Did **not** delete, recreate, reset, reseed, or modify IDs  
- Did **not** remove mappings  
- Did **not** deploy  

All Enterprise data treated as **live business data**.

---

## 12. Deliverable checklist

| Section | Status |
|---------|--------|
| Registry ownership | Done |
| Database entities | Done |
| API / save / read flows | Done |
| Enterprise Lender ID integrity | Done |
| Modules compliant / non-compliant | Done |
| Placeholder implementations | Done |
| Root causes | Done |
| Remediation sequence + effort | Done |
| Jio Financial Services | Done (absent from ELR) |
| Hierarchy retirement safety | Done (safe) |

---

## STOP

**No implementation. No deployment.**  
Await Product Owner approval before any remediation phase begins.
