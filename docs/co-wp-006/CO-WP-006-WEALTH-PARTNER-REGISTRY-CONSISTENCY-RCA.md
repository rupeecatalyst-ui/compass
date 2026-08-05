# CO-WP-006 — Wealth Partner Registry Consistency Investigation

**Status:** Investigation Complete · **Implementation delivered in** `CO-WP-006-WEALTH-PARTNER-CONVERSION-INTEGRITY-REPORT.md` · **No migrate** · **No deploy**  
**Date:** 2026-07-29  
**Scope:** RCA complete; fix implemented under CO-WP-006 change control (no migrate / no deploy)

---

## Symptom

The system reports that a Contact has already been converted into a Wealth Partner,  
but the Wealth Partner Registry does not display that Wealth Partner.

---

## Same SSOT?

**YES — create, duplicate check, and registry list all use the same Enterprise SSOT.**

| Concern | Path |
|---------|------|
| Model | `EnterpriseWealthPartner` (`enterprise_wealth_partners`) |
| Repository | `wealthPartnerRegistryRepository` |
| Service | `wealthPartnerRegistryService` |
| Org | `resolvePilotOrganizationId()` |

There is **no** Soft Go-Live / localStorage Wealth Partner store on the convert path.  
Persistence is Prisma-only (`wealthPartnerPersistenceGuard`).

The inconsistency is **not dual SSOT**. It is **query asymmetry + UI hide/fail behaviour + incomplete duplicate UX**.

---

## Conversion lifecycle (traced)

```text
Create Wealth Partner Wizard
  → POST /api/wealth-partner-registry/partners
  → wealthPartnerRegistryService.createPartner
      → assert identity + type
      → findActiveByIdentity(contactId|companyId)   ← DUPLICATE CHECK
      → load ECM Contact/Company (isDeleted=false)
      → repository.createPartner (allocate WPT###### + insert)
  → Registry list refresh
      → GET /api/wealth-partner-registry/partners
      → queryPartners(search, partnerType, page=1, pageSize=100)  ← LIST
```

Network members (`EnterpriseWealthPartnerNetworkMember`) do **not** create a Wealth Partner and do **not** alone trigger “already converted.”

---

## Duplicate check vs Registry list

### Duplicate check — `findActiveByIdentity`

Filters:

- `organizationId`
- `isDeleted = false`
- `contactId` **or** `companyId`

**Does not filter:** lifecycle, operational status, registry status, enabled, partnerType.

Message (identity hit):

```text
Contact already converted into a Wealth Partner (WPT######).
```

### Registry list — `queryPartners` + UI

Filters applied by UI:

- `organizationId`
- `isDeleted = false`
- optional `partnerType` (chip; default `all`)
- optional `search`
- pagination page 1 / pageSize 100

**Does not filter:** lifecycle / operational status (so `onboarding` partners **are** listable when filters are clear).

### Critical UI failure mode

`wealth-partner-registry-view.tsx` `refresh`:

```ts
} catch {
  setItems([]);
  setTotal(0);
}
```

Any list GET failure clears the table **silently** (no toast). Convert/duplicate POST can still succeed against the same DB.

---

## Root cause

### Primary

**Visibility gap:** duplicate detection finds any non-deleted `EnterpriseWealthPartner` for the Contact, while the Registry UI can hide that same row via:

1. Active **partner type** chip ≠ partner’s type  
2. Non-matching **search** text  
3. **Silent list error** → empty table  

Users then re-attempt Convert and receive “already converted” with no way to open the existing partner.

### Contributing

1. **Dead-end UX:** duplicate is `toast.error` only. Code may appear in the toast for identity hits; **Status / Lifecycle / Open Wealth Partner** are absent.  
2. **Misleading P2002 mapping:** unique constraint is `(organizationId, code)` only. Code-allocation race maps to  
   “Contact already converted… (or a duplicate Wealth Partner code exists)” even when that Contact has **no** WP.  
3. **`findActiveByIdentity` naming:** “Active” means not soft-deleted — not lifecycle/operational Active.  
4. Soft-deleted partners: correctly excluded from **both** duplicate and list (not this symptom).

---

## Impacted modules

- Wealth Partner Registry UI (`/wealth-partners`, `/admin/wealth-partner-registry`)
- Create / Convert Wealth Partner wizard
- WP Registry API / service / repository
- Error mapping (`mapRouteError` P2002)
- BAT convert scenarios / operator trust

---

## Recommended fix (do not implement until approved)

1. **Structured duplicate response** with `partnerId`, `code`, `displayName`, `status`, `lifecycleStatus`, `operationalStatus`.  
2. **Duplicate UX panel** (never toast-only dead-end):  
   - Wealth Partner Code  
   - Current Status  
   - Current Lifecycle Stage  
   - **Open Wealth Partner** button  
3. On duplicate / after create: reset list to `partnerType=all`, clear search, or navigate to existing partner.  
4. Surface list errors (toast); never silent empty-on-error.  
5. Split P2002 messaging (code collision ≠ contact converted); allocate code inside a locked transaction.  
6. Optional: `GET /partners?contactId=` for pre-convert lookup.

---

## Regression risk

| Change | Risk |
|--------|------|
| Duplicate payload / UX | Low–medium — update verify scripts (`co-wp-*`) that assert message strings |
| List error toast | Low |
| Filter reset on create | Low — sticky type chip behaviour changes |
| Unique index on contactId | Medium — encodes “one non-deleted WP per contact”; aligns with current app check |
| Code allocation locking | Low — prevents false “converted” on race |

No Opportunity / Deal / Document transactional impact if changes stay in the Wealth Partner module.

---

## BAT validation checklist (after fix approval)

1. Convert Contact → WP created → appears under **All**.  
2. Narrow type chip away from partner → list hides; Convert → shows Code + Open (not dead-end).  
3. Clear filters / Open → partner visible in workspace.  
4. Soft-deleted WP → Convert allowed again (if product policy keeps that rule).  
5. Concurrent create → code collision message distinct from contact-converted.  
6. List API failure → error toast, not empty silent registry.

---

## Conclusion

Create and list share one SSOT (`EnterpriseWealthPartner`).  
The reported inconsistency is explained by **list UI/query hiding (or silent empty)** while **identity duplicate check still finds the row**, compounded by **toast-only duplicate UX** without Open / Status / Lifecycle.
