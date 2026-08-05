# CO-LENDER-BAT-009 — Missing Lender Investigation: Jio Financial Services

**Status:** Investigation Complete · Awaiting Product Owner BAT  
**Priority:** P0  
**Date:** 2026-08-05  
**Scope:** Read-only investigation — **no data changes · no recreate · no deploy**

---

## Executive verdict

**“Jio Financial Services” does not exist in the Enterprise Lender Registry database.**

It is therefore unavailable in every ELR-backed list and selector — not because of a hidden filter on an existing row, but because **no committed Prisma lender row with that name was found**.

The only Jio-related institution in Postgres is a **different** seeded lender:

| Field | Value |
|-------|--------|
| Display name | **Jio Payments Bank** |
| Code | `JIO_PAYMENTS` |
| Id | `cms8hrfst007dwed8bh36gubf` |
| Created | 2026-07-31 by `system-co-lr-010` (seed) |
| Status | active · enabled · lifecycle active · not deleted |

---

## Direct answers (1–13)

| # | Finding |
|---|--------|
| **1** Exists in DB? | **No** — zero rows for “Jio Financial Services” |
| **2** Table/entity | `EnterpriseLender` → **`enterprise_lenders`** |
| **3** Name present? | **No** (only **Jio Payments Bank**) |
| **4** Active/enabled/archived/deleted? | N/A for Jio Financial Services |
| **5** List API | `GET /api/lender-registry/lenders` |
| **6** API returns Jio Financial Services? | **No** (cannot — row absent) |
| **7** Why not? | Never committed to Prisma (or never created via API) |
| **8** UI filters? | Would hide draft/inactive/disabled — **irrelevant** if row missing |
| **9** Search excluding? | No evidence of exclusion — name not in DB |
| **10** Products/policies linked? | No ELR lender id to link; see notes below |
| **11** Save failure? | **Likely silent Soft Go-Live fallback** on create (see root cause) |
| **12** Transaction committed? | **No Prisma commit** for this lender name |
| **13** Cache? | Session/published-lender cache cannot invent a missing Prisma row; Soft Go-Live localStorage could show a **browser-only** ghost |

---

## Database status

| Query | Result |
|-------|--------|
| `enterprise_lenders` contains “Jio Financial Services” | **0** |
| `enterprise_lenders` contains “Jio” | **1** → Jio Payments Bank (seed) |
| Lenders created on/after 2026-08-01 | **0** |
| Registry audit `action=created` for a Jio **lender** | **0** |
| Recent Aug audits on lender module | Program creates for **Credit Saison** / **Clix Capital** (not Jio lender master) |

**Conclusion:** Enterprise SSOT never received “Jio Financial Services.”

---

## API status

| Surface | Would include Jio Financial Services? |
|---------|----------------------------------------|
| `GET /api/lender-registry/lenders` | **No** |
| Partner `GET /api/partner/masters/lenders` | **No** |
| Published / selection helpers | **No** |

Jio Payments Bank **would** appear (active/enabled/lifecycle active) if searched as “Jio” / “Payments”.

---

## UI status

| Surface | Expected |
|---------|----------|
| Enterprise Lender Registry admin list | Absent |
| Lending Programs (by that lender) | Absent |
| Product mapping / Deal / Opportunity / WP selectors | Absent |
| Soft Go-Live browser store (`compass:enterprise-lender-registry-v1`) | **Possible ghost** if create fell back locally |

Admin create path (`new-lender-wizard.tsx` → `lenderRegistryClient.createLender`):

```text
POST /api/lender-registry/lenders
  → if API success → Prisma ✅
  → if API null/fail → Soft Go-Live localStorage create ⚠️ (still present for createLender)
```

Prisma-mode **list** paths now refuse Soft Go-Live fallback → UI can show “saved” locally while **lists read only Prisma** → lender disappears after refresh / other browsers / selection desks.

---

## Enterprise validation matrix

| Surface | Jio Financial Services |
|---------|------------------------|
| Enterprise Lender Registry | **Not present** |
| Lending Programs | **Not present** (no lender FK) |
| Product Mapping | **Not present** |
| Policy Mapping | **Not present** as ELR lender |
| Employee Mapping | **Not present** |
| Deal Workspace selectors | **Not present** |
| Opportunity Workspace selectors | **Not present** |
| Wealth Partner APIs | **Not present** |

---

## Root cause (most likely)

1. **Primary:** Create did **not** persist to Prisma `enterprise_lenders` under the name “Jio Financial Services.”  
2. **Mechanics:** `lenderRegistryClient.createLender` still **falls back to Soft Go-Live localStorage** when the API returns null — wizard can appear successful while SSOT is untouched.  
3. **Secondary confusion:** Seeded **Jio Payments Bank** exists and may be mistaken for / searched instead of “Jio Financial Services.”  
4. **Not the cause:** Lifecycle/active filters hiding an existing row — **no such row**.

Products/policies the PO configured may have been:

- Attached in Soft Go-Live only, or  
- Created against a **different** lender (e.g. Credit Saison / Clix program audits on 2026-08-03 / 08-05), or  
- Created as Product Master / policy artifacts **without** a durable ELR lender FK.

---

## Recommended fix (do **not** implement until PO authorises)

1. **Fail closed on create** when `ENTERPRISE_PERSISTENCE_MODE=prisma` — never Soft Go-Live fallback for `createLender` / `createProgram` / contacts (same as selection remediation).  
2. **Surface explicit error** in New Lender wizard if API fails (toast + block “success”).  
3. **BAT create** “Jio Financial Services” once via Prisma API (PO-approved recreate — only after confirming Soft Go-Live ghost is discarded).  
4. **Do not rename** Jio Payments Bank into Jio Financial Services without PO decision — they are different institutions.  
5. Re-link products/programs to the new Registry `id` after durable create.  
6. Optional BAT check: browser DevTools → Application → Local Storage → `compass:enterprise-lender-registry-v1` for a local-only “Jio Financial Services” ghost.

---

## Stop

Investigation only. **No data modified. No lender recreated. No deploy.**  
Await Product Owner BAT / remediation approval.
