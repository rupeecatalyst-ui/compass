# CO-BUG-004 — Deleted Contact Duplicate Validation Investigation

**Status:** INVESTIGATION COMPLETE · **FIX BLOCKED** until Product Owner approval  
**Date:** 2026-07-31  
**Incident class:** Soft-delete vs unique-index mismatch (ECM Contacts)  
**Production data:** **Not modified** — read-only code/schema review only  

**Subject contact (reported):** “Shaurya Malwa” — recreate blocked with  
`Unique constraint failed on: (organization_id, mobile_primary)`

---

## Executive verdict

The contact is **soft-deleted** (row still in `ecm_contacts`). Application duplicate checks **correctly ignore** deleted rows, so create is allowed at the service layer. PostgreSQL then rejects the insert because the unique index on `(organization_id, mobile_primary)` is a **full unique index** — it **includes** soft-deleted rows. There is **no** partial unique index.

**Root cause:** Layer mismatch — app says “deleted ≠ duplicate”; database says “mobile unique forever while the row exists.”

Prisma’s raw unique-constraint error is returned (or leaked) to the UI — which violates enterprise UX policy.

---

## 1. Root Cause

```text
User deletes contact (UI / Recovery soft-delete)
        ↓
contactSoftDeleteAdapter.softDelete
  → is_deleted = true
  → status = archived
  → enabled = false
  → mobile_primary UNCHANGED
        ↓
User recreates same person / same mobile
        ↓
ecmContactService.register
  → findByMobile(..., isDeleted: false)  → null  (passes)
        ↓
ecmContactRepository.create → INSERT
        ↓
PostgreSQL UNIQUE INDEX ecm_contacts_org_mobile_key
  ON (organization_id, mobile_primary)   ← includes soft-deleted rows
        ↓
Prisma P2002 → "Unique constraint failed on (organization_id, mobile_primary)"
        ↓
API returns error message to client → user sees DB exception text
```

| Layer | Behaviour toward soft-deleted row | Result |
|---|---|---|
| Soft-delete adapter | Keeps row + mobile | Row still owns mobile |
| `findByMobile` | Excludes `isDeleted: true` | No app-level duplicate |
| Client operational lists | Exclude deleted/archived | User cannot “see” the contact |
| DB unique index | Includes all rows | **Blocks recreate** |

This is **not** a physical-delete bug. It is an incomplete soft-delete uniqueness design.

---

## 2. Soft Delete Review

### Is the contact physically deleted or soft deleted?

**Soft deleted** (default Contact delete path).

Evidence — `server/services/soft-delete/adapters/contact.adapter.ts`:

- Sets `isDeleted: true`, `deletedAt`, `deletedBy`, `deletionReason`
- Also sets `status: "archived"`, `enabled: false`
- **Does not** clear or rewrite `mobilePrimary`
- **Does not** call `prisma.ecmContact.delete` (hard delete)

Hard delete exists only as **permanentDelete** after soft-delete (Recovery Center purge):

```text
softDelete → row remains
permanentDelete → physical DELETE (frees unique key)
restore → isDeleted = false, status = active
```

Prisma model (`EcmContact`):

- `isDeleted` / `deletedAt` / `deletedBy` / `deletionReason` (CO-SPRINT-119)
- `archivedBy` / `archivedAt`
- Soft-delete ledger: `enterprise_soft_delete_records`

**Conclusion for “Shaurya Malwa”:** Almost certainly a soft-deleted row still holding the mobile, invisible in operational Contact Registry / search, but still unique in the database.

*(Investigation did not query production data — no SELECT against live DB was performed, per Production Data Protection.)*

---

## 3. Database Constraint Review

| Question | Answer |
|---|---|
| Unique constraint? | **Yes** — `@@unique([organizationId, mobilePrimary], map: "ecm_contacts_org_mobile_key")` |
| Partial unique index (`WHERE is_deleted = false`)? | **No** |
| Standard unique index? | **Yes** — full unique on all rows |
| Migration evidence | `prisma/migrations/20260721000000_enterprise_baseline_v1_0/migration.sql` — `CREATE UNIQUE INDEX "ecm_contacts_org_mobile_key" ON "ecm_contacts"("organization_id", "mobile_primary");` |
| Soft-deleted rows included? | **Yes** — any row with that org+mobile blocks INSERT |

Contrast: other domains already use **partial** uniques for soft-delete (e.g. Deal primary participant / invoice party migrations with `WHERE is_deleted = false`). **ECM contacts do not.**

---

## 4. Duplicate Validation Review

### Server (Prisma path — production)

`server/services/ecm/contact.service.ts` → `register()`:

1. `findByMobile(organizationId, mobile)`  
2. Repository filters **`isDeleted: false`**  
3. Soft-deleted match → **not found** → create proceeds  
4. DB unique fails

`findByOfficialEmail` likewise excludes deleted.

### Client / memory path

`src/lib/enterprise-contact-master/duplicate-check.ts`:

- Scans `getEcmPorts().contacts.list()`
- Hydration loads via `queryContacts` which also filters **`isDeleted: false`**
- Soft-deleted contacts are **absent** from the session cache → client duplicate dialog does **not** fire for deleted mobiles

### Operational search

`listOperationalContacts` / `isOperationalContact` exclude archived / disabled — soft-deleted contacts are not offered as “Use existing.”

### Pre-create check correctness

| Check | Correct for soft-delete policy? |
|---|---|
| App duplicate ignores deleted | Matches “deleted should not block” intent |
| DB unique includes deleted | **Contradicts** that intent |
| App offers Restore when soft-deleted mobile exists | **Missing** |
| Prisma error mapped to business UX | **Missing / weak** — raw message can surface |

**Answer to “Is the application checking duplicates correctly before create()?”**  
It checks **active-only** duplicates correctly, then calls `create()` and relies on the DB. It does **not** look up soft-deleted rows to offer restore. That gap is the functional defect relative to expected enterprise behaviour.

---

## 5. Enterprise Policy Review — Option A vs Option B

### Option A — Ignore deleted for uniqueness (allow recreate)

- Soft-deleted mobiles may be reused on a **new** contact id  
- Requires **partial unique index**: unique `(organization_id, mobile_primary) WHERE is_deleted = false`  
- Pros: Matches stated “Deleted should NOT block recreation”; simple for testers / re-onboarding  
- Cons: Orphan soft-deleted identity retains historical Deal/Opportunity/relationship links under the **old** id; new contact is a **second identity** for the same mobile; audit continuity weakens unless merge/restore later  

### Option B — Deleted remain unique; offer Restore

- Soft-deleted row keeps mobile exclusivity  
- Create path finds soft-deleted by mobile (includeDeleted) → UX: **“Restore existing deleted contact”** (Recovery Center / inline restore)  
- Pros: Aligns with **already-built** soft-delete + Recovery Center (`restore: true` on contact adapter); preserves history, links, audit; no identity fork  
- Cons: User cannot “start fresh” without restore or permanent purge; recreate of intentionally discarded test contacts needs Recovery Center  

### Recommendation — **Option B (primary), with controlled Option A only after permanent purge**

| Situation | Policy |
|---|---|
| Soft-deleted contact with same mobile | **Do not create** — offer **Restore** (Option B) |
| Soft-deleted then **permanently** purged | Mobile free — create new (natural Option A after hard delete) |
| Active contact same mobile | Block / open existing (current) |

**Why B over pure A for Catalyst One:**

1. CO-SPRINT-119 already invested in soft-delete + restore + Recovery Center for Contacts.  
2. Contacts are identity SSOT for Opportunities, Deals, participants, relationships — forking identity on recreate is high enterprise risk.  
3. Progressive Contact Creation and journey continuity prefer **one person = one Contact id**.  
4. Pure Option A (partial unique alone) without restore still leaves a silent soft-deleted twin — worse for BAT and production cleanup.

**Optional enhancement (if PO insists on recreate without restore):**  
Partial unique (Option A) **plus** mandatory soft-deleted detection UX: “A deleted contact exists — Restore recommended” with secondary action “Create new anyway” (explicit exception, audited). That is a **hybrid** and needs PO approval (identity fork risk).

---

## 6. Recommended Fix (design only — **do not implement yet**)

### F1 — Detect soft-deleted mobile before create (application)

- Add `findByMobile(..., { includeDeleted: true })` or dedicated `findDeletedByMobile`  
- In `register()`: if soft-deleted match → throw typed business error e.g. `ECM_MOBILE_SOFT_DELETED` with contact id/name — **never** proceed to INSERT  

### F2 — Business UX (never show Prisma)

- Map `ECM_MOBILE_SOFT_DELETED` / P2002 to:  
  **“A deleted contact with this mobile already exists.”**  
  Actions: **Restore Contact** · **Open Recovery Center** · Cancel  
- Catch Prisma `P2002` at API boundary as defense-in-depth; never return raw “Unique constraint failed…”  

### F3 — Database (only if PO chooses Option A or Hybrid recreate)

- Replace full unique with **partial unique**:  
  `UNIQUE (organization_id, mobile_primary) WHERE is_deleted = false`  
- Migration carefully; resolve any existing duplicate active rows first  
- **Not required** for Option B-only  

### F4 — Option B default path

- Wire Restore via existing `contactSoftDeleteAdapter.restore` / soft-delete API  
- After restore, open Contact Workspace (do not create a second row)  

### F5 — Test / BAT cases

1. Soft-delete contact → recreate same mobile → Restore offer, no Prisma text  
2. Restore → contact active with same id  
3. Soft-delete → permanent delete → recreate succeeds  
4. Active duplicate → existing “already exists” dialog  

### Out of scope until PO approval

- No production record delete/restore/update  
- No schema change  
- No constraint disable  

---

## 7. Answers to investigation questions (checklist)

| # | Question | Answer |
|---|---|---|
| 1 | Physically deleted or soft deleted? | **Soft deleted** (row retained; `is_deleted = true`) |
| 2 | Does duplicate validation include deleted? | **No** (app intentionally excludes them) |
| 3 | Does Prisma unique include deleted? | **Yes** (full unique index) |
| 4 | Partial or standard unique? | **Standard** full unique — **not** partial |
| 5 | App check correct before create()? | Active-only check is consistent with itself, but **incomplete** vs soft-delete enterprise UX — missing deleted lookup → Restore; then DB fails |

---

## 8. Deliverable summary

| Item | Result |
|---|---|
| **Root Cause** | Soft-deleted row retains `mobile_primary`; app ignores it; DB unique does not |
| **Database Constraint Review** | Full unique `(organization_id, mobile_primary)` — no partial filter |
| **Duplicate Validation Review** | Server/client both exclude `isDeleted`; no Restore path |
| **Soft Delete Review** | CO-SPRINT-119 soft-delete + restore + permanent purge exist |
| **Enterprise Recommendation** | **Option B** — Restore soft-deleted; free mobile only after permanent delete |
| **Recommended Fix** | Detect soft-deleted mobile → Restore UX; map P2002; schema change only if PO picks A/Hybrid |

---

**Implementation remains BLOCKED pending Product Owner approval of Option B (recommended) or A/Hybrid.**
