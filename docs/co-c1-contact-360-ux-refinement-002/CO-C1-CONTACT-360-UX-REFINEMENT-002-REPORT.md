# CO-C1-CONTACT-360-UX-REFINEMENT-002 — Implementation Report

**Status:** Local implementation complete · Awaiting Product Owner review  
**Date:** 2026-08-12  
**Deploy:** Not performed (PO instruction)

---

## 1. Before state (PO inspection)

Contact 360° was technically partially complete but UX-incomplete:

- Opened as legacy **ECM Contact Workspace** (`ContactWorkspaceModal`) with a “Contact 360°” badge
- Snapshot KPIs existed on Overview only, above a dominant **Role Dashboard**
- Auto-derived relationships were a flat strip, not a high-density relationship intelligence surface
- Empty drill-down tabs used large centred empty states that filled the modal
- Role tabs (e.g. Banker) interleaved before Activity / drill-downs
- Opportunities / Loans / Documents / Communication tabs were mostly empty shells

---

## 2. UX changes delivered

| Area | Change |
|------|--------|
| Primary surface | Overview (`360°` tab) is now `Contact360IntelligencePanel` — Business Snapshot + Relationship Intelligence + Recent Activity |
| Role workspaces | Role Dashboard moved into a **collapsed secondary** `<details>` block on 360° |
| Header | Compact identity row retains Score, Roles, Mobile, Email, Location, Owner, Created, Updated; **Company** added from snapshot |
| Empty states | Compact left-aligned empties — no full-viewport centred voids |
| Tab order | `360°` → `Activity` → Relationships / Companies / Opportunities / Loans / Investments / Documents / Communication → **role tabs last** |
| Drill-downs | Opportunities, Loans/Deals, Documents, Communication, Companies populated from `composeContact360Snapshot` when data exists |
| Add Relationship | Preserved; after save refreshes 360° and returns to Overview; used for explicit/non-derivable links |

---

## 3. Data sources / SSOTs (unchanged ownership)

| Concern | SSOT |
|---------|------|
| Contact identity | ECM / Contact Registry |
| Contact Score | `computeEcmContactScore` / persisted `contact.contactScore` |
| Chronology | EAR via `listEnterpriseActivity({ contactId })` + `TransactionActivityTimeline` |
| Opportunities | Opportunity Registry API (`primaryContactId`) |
| Deals | Deal Registry (filtered by contact / opportunity linkage) |
| Companies | Company Registry links + Opportunity company fields |
| Tasks | ETE `listTasksForEntity({ contactId })` |
| Documents | Document Registry `listDocumentsForOpportunityRuntime` |
| Explicit relationships | Existing ECM relationship store + `AddExplicitRelationshipDialog` |

**Not created:** new Contact DB, activity store, timeline, scoring engine, or relationship graph store.

---

## 4. Relationship derivation

`composeContact360Snapshot` now groups `relationshipSections`:

Companies · Opportunities · Deals · Loans/Disbursed · Lenders · Wealth Partners · Co-applicants · Guarantors · Referrers · Documents · Tasks · Communication · Explicit

Participant projection reads Opportunity/Deal `lendingExtension` participants / co-applicant / guarantor fields and Deal snapshot partner / referral fields when present. Nothing is invented when fields are absent.

---

## 5. Activity / EAR

- Full Activity tab remains EAR-backed, contact-scoped, newest-first
- 360° Overview shows a compact **Recent Activity** strip (same EAR payload)
- Missing `contactId` stamps are not fabricated

---

## 6. Files touched

- `src/lib/enterprise-contact-master/compose-contact-360.ts` — extended compose + sections
- `src/components/catalyst-one/contacts/contact-360-intelligence-panel.tsx` — **new** primary UI
- `src/components/catalyst-one/contacts/contact-workspace-modal.tsx` — wire 360 primary, header company, compact empties, drill-downs
- `src/constants/enterprise-contact-master/lifecycle.ts` — tab labels / Activity before roles
- `src/lib/enterprise-contact-master/workspace-tabs.ts` — role tabs last

---

## 7. Verification

| Gate | Result |
|------|--------|
| Full `tsc --noEmit --skipLibCheck` (8GB heap) | ✅ Exit 0 — no errors on Contact 360 paths |
| IDE diagnostics (touched files) | ✅ No linter errors reported |
| Targeted ESLint (360 compose / panel / tabs) | ✅ Exit 0 |
| Deploy | **Skipped** per PO |
| Migration | **None** |

### Manual BAT matrix (for PO)

- Contact with multiple Opportunities / Deals
- Contact linked to Lender / Wealth Partner / Company
- Contact without Company / Opportunities / Deals
- Contact with / without Activity
- Multiple transaction participants (co-applicant / guarantor when data exists)
- Compact empty states
- Role-neutral primary view (Role Dashboard collapsed)
- Add Relationship persists and appears under Explicit on 360°

---

## 8. Remaining limitations

1. Deal search still uses name/opportunity linkage heuristics when `primaryContactId` is sparse — may under/over-include until Deal contact stamps are complete.
2. Co-applicant / guarantor / WP derivation depends on Opportunity/Deal extension fields being populated; sparse historical records will show compact empties.
3. Activity coverage remains limited where EAR events lack `contactId`.
4. Investments tab remains a compact empty (no investment SSOT projection in this sprint).
5. Contact photos: no ECM photo field — avatar fallback retained (no invented assets).
6. Production `next build` not re-run in this session — recommend before live BAT if required by certification policy.

---

## 9. Final status

**Local UX correction implemented.** Contact 360° is now the primary relationship-intelligence experience; role workspaces are secondary; existing SSOTs preserved.

**STOP — awaiting Product Owner review. No deploy.**
