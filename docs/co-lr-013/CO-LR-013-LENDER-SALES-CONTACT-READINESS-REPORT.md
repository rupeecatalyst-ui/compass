# CO-LR-013 — Mandatory Lender Sales Contact Capture & Disbursal Enrichment

**Status:** Implementation Complete · Ready for Business Acceptance Testing  
**Date:** 2026-07-31  
**Authority:** Product Architecture — progressive Enterprise Contact Registry enrichment

---

## Executive confirmation

Enterprise Contact Registry is enriched **progressively during live business** without interrupting Identify Lender / Pipeline execution:

| Moment | Required | Email |
|---|---|---|
| Identify Lender | Lender + Sales Contact (Name, Mobile, Sales Designation) | **Optional** |
| Disbursed completion | Same linked contact | **Mandatory** (enrich existing — never duplicate) |

Sales hierarchy only. Role = **Banker** (`lender_employee`). Institution = selected Enterprise Lender Registry id.

---

## 1. Updated Workflow

```text
Select Lender (Enterprise Lender Registry)
        ↓
Select Existing Sales Contact  OR  Create New Sales Contact
        ↓
If create: Lender + Name + Mobile + Sales Designation (Email optional)
        ↓
Duplicate check (Mobile / Email / Name+Lender) → “Use Existing Contact”
        ↓
Create/upsert Enterprise Deal with lenderSalesContact* on derived snapshot
        ↓
… Pipeline execution continues …
        ↓
Move to Disbursed → Disbursement dialog
        ↓
If Official Email missing → require Official Email
        ↓
PATCH existing ECM Contact (progressive enrichment) → Complete Disbursement
```

---

## 2. Validation Rules

| Rule | When | Behaviour |
|---|---|---|
| Lender mandatory | Identify | Block without Registry lender |
| Contact Name mandatory | Create Sales Contact | Block create |
| Mobile mandatory (10 digits) | Create Sales Contact | Block create |
| Sales Designation mandatory | Create Sales Contact | Sales hierarchy select only |
| Email optional | Create / Identify | Allowed empty |
| No duplicates | Before create | Mobile · Email · Name+Lender → Use Existing |
| Sales Contact linked | Identify Lender submit | Block without `contactId` |
| Official Email mandatory | Complete Disbursement | Exact prompt; update existing contact |
| Never create at Disbursal | Disbursement | Enrich only |

**Designations (SSOT):** `src/constants/lender-sales-contact.ts`  
Sales Executive · Relationship Executive · Relationship Manager · Senior Relationship Manager · Area Sales Manager · Regional Sales Manager · National Sales Manager · Sales Head  

Credit / Ops / Legal / Technical / Processing are **out of scope**.

---

## 3. UI Screens

| Screen | Change |
|---|---|
| **Identify Lender** dialog | `LenderSalesContactCapture` under lender/program search |
| Capture modes | Search existing · Create New · Use Existing (duplicate panel) |
| **Disbursement Details** | Sales Contact summary + Official Email gate when missing |
| Persistence | Deal derived snapshot fields `lenderSalesContact*` |

Component: `src/components/catalyst-one/execution/lender-sales-contact-capture.tsx`  
Board: `src/components/catalyst-one/execution/lender-pipeline-board.tsx`

---

## 4. Architecture mapping

```text
Enterprise Lender Registry (selected lender)
        ↓
Enterprise Contact (ECM)
        ↓
Role = Banker (lender_employee)
        ↓
roleProfiles.lender_employee.institution = lenderId
```

Helpers: `src/lib/lender-sales-contact/`  
Create/update via `persistRegisterEcmContact` / `persistUpdateEcmContact` (Prisma + memory).  
API: POST `/api/ecm/contacts` now accepts `roleProfiles` (CO-LR-013).

---

## 5. Verification Report

| Check | Result |
|---|---|
| Lender mandatory | ✅ |
| Contact Name mandatory | ✅ |
| Mobile mandatory | ✅ |
| Designation mandatory (Sales only) | ✅ |
| Email optional at creation | ✅ |
| Email mandatory before Disbursal completion | ✅ |
| No duplicate contacts (offer Use Existing) | ✅ |
| Contact linked to Enterprise Lender Registry | ✅ (`institution = lenderId`) |
| Progressive ECM enrichment | ✅ |
| Static verify `npm run verify:co-lr-013` | ✅ |

---

## 6. Files

| Path | Role |
|---|---|
| `src/constants/lender-sales-contact.ts` | Designation + disbursal message SSOT |
| `src/lib/lender-sales-contact/index.ts` | Validate · dedupe · create · enrich |
| `src/components/.../lender-sales-contact-capture.tsx` | Capture UI |
| `src/components/.../lender-pipeline-board.tsx` | Identify + Disbursal gates |
| `src/components/.../deal-workspace-host.tsx` | Pass sales contact into Deal create |
| `src/lib/enterprise-deal/deal-pipeline-runtime.ts` | Persist + project link |
| `src/lib/enterprise-deal/deal-create-from-opportunity.ts` | Snapshot fields |
| `src/types/catalyst-one.ts` · `deal-pipeline-runtime.ts` | Link fields |
| `src/app/api/ecm/contacts/route.ts` | `roleProfiles` on create |
| `src/lib/enterprise-persistence/ecm-persist.ts` | Pass `roleProfiles` |
| `scripts/co-lr-013-verify.mjs` | Static gates |

---

## 7. Manual steps

None required for schema. Existing ECM Contact + Enterprise Deal snapshot JSON carry the link.

---

## Final status

**Ready for Business Acceptance Testing** — progressive Sales Contact capture without interrupting live Identify Lender workflow; Official Email enforced only at Disbursal completion against the **same** ECM contact.
