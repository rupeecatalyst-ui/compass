# CO-LR-011 — Enterprise Lender Registry Binding Audit

**Status:** Investigation Complete · **No production behaviour changed**  
**Date:** 2026-07-31  
**Trigger:** Banker Role Workspace → Institution (Lender) shows a small subset after CO-LR-010 (275 canonical lenders)

---

## Executive verdict

The Banker Role **Institution (Lender)** dropdown does **not** read the Enterprise Lender Registry (275).

It reads a **hardcoded ECM master seed catalog** of **6 banks + Other**, via `EcmMasterSelect` → `listEcmMasterOptions("lender")`.

No `/api/lender-registry/*` call is made for this control under the default runtime flags.

---

## 1. Current data source

| Layer | Finding |
|---|---|
| **UI control** | `EcmMasterSelect` |
| **Wired by** | Banker Role template field `institution` (`masterDomain: "lender"`) |
| **Option loader** | `listEcmMasterOptions("lender")` in `src/constants/enterprise-contact-master/masters.ts` |
| **Active path (default)** | `listEcmMasterOptionsFromCatalog("lender")` → `ECM_MASTER_CATALOGS.lender` |
| **Catalog contents** | `hdfc`, `sbi`, `icici`, `axis`, `kotak`, `bajaj`, `other` (**7 rows**) |
| **API** | **None** (client-side constants only) |
| **Repository / service** | **Not queried** |
| **Database table** | **Not used** (`EnterpriseLender` unused for this dropdown) |

### Classification

| Candidate | Applies? |
|---|---|
| Enterprise Lender Registry (correct SSOT) | ❌ No (default) |
| Legacy / hardcoded array | ✅ **Yes** — ECM seed catalog |
| Cached Tier-2 lookup | ❌ Only if `TIER2_REGISTRY_PORT_RUNTIME=true` (default **OFF**) |
| BF_* subset | ❌ Not BF_*; different legacy seed IDs |
| Another module list | ❌ Same ECM catalog |

---

## 2. Query used

### Observed Banker Role path (default)

```text
Contact Workspace → Role Workspace (lender_employee)
  → RoleFieldControl (control: "master", masterDomain: "lender")
    → EcmMasterSelect
      → listEcmMasterOptions("lender")
        → listFromReferencePort? → null (not Tier-1 lender)
        → listFromTier2Port? → null when TIER2 flag OFF
        → listEcmMasterOptionsFromCatalog("lender")
          → ECM_MASTER_CATALOGS.lender  // hardcoded
```

**No HTTP query. No Prisma query.**

### Evidence — template binding

```573:586:src/constants/enterprise-contact-master/role-templates.ts
    roleCode: "lender_employee",
    workspaceTabId: "lender_employee",
    fields: [
      {
        key: "institution",
        label: "Institution (Lender)",
        control: "master",
        masterDomain: "lender",
        ...
        owner: "Banker Role",
        helpText: "Lender Master. Org path: Institution → Region → City → Branch.",
```

### Evidence — select implementation

```45:45:src/components/catalyst-one/contacts/ecm-master-select.tsx
  const options = useMemo(() => listEcmMasterOptions(domain, parentId), [domain, parentId]);
```

### Evidence — hardcoded catalog

```231:239:src/constants/enterprise-contact-master/masters.ts
  lender: [
    { id: "hdfc", label: "HDFC Bank", meta: { city: "Mumbai" } },
    { id: "sbi", label: "State Bank of India", meta: { city: "Mumbai" } },
    { id: "icici", label: "ICICI Bank", meta: { city: "Mumbai" } },
    { id: "axis", label: "Axis Bank", meta: { city: "Mumbai" } },
    { id: "kotak", label: "Kotak Mahindra Bank", meta: { city: "Mumbai" } },
    { id: "bajaj", label: "Bajaj Housing Finance", meta: { city: "Pune" } },
    { id: "other", label: "Other" },
  ],
```

### Evidence — Tier-2 port default OFF

```32:38:src/constants/enterprise-master-data/dual-read.ts
/** I6b — Tier 2 picker port swap. Default OFF (constants remain SSOT until explicitly enabled). */
export function isTier2RegistryPortRuntimeActive(): boolean {
  const raw =
    process.env[NEXT_PUBLIC_TIER2_REGISTRY_PORT_RUNTIME_ENV] ??
    process.env[TIER2_REGISTRY_PORT_RUNTIME_ENV];
  return raw === "true" || raw === "1";
}
```

`.env.example` documents both flags as commented `false`.  
ESC production release report recorded Tier-2 runtime as **Not set → defaults false**.

---

## 3. Filters applied

### On the Banker Role dropdown (current / default)

| Filter | Applied? | Detail |
|---|---|---|
| Hardcoded seed list | ✅ | Only 6 institutions + Other |
| `enabled !== false` | ✅ | Soft-enable filter on catalog rows |
| Append “Other” | ✅ | `withOtherLast` |
| Parent cascade | ❌ | Institution has no parent |
| Published / Active lifecycle | ❌ | N/A — not reading Registry |
| Role-specific lender filter | ❌ | Template does not filter lenders by role beyond choosing domain `lender` |
| Partner-specific | ❌ | |
| Search limit / pagination | ❌ | All catalog rows rendered; UI `max-h-40` scroll only |
| Category filter | ❌ | |
| BF_* | ❌ | |

### Alternate path (only if Tier-2 runtime were ON)

If `NEXT_PUBLIC_TIER2_REGISTRY_PORT_RUNTIME=true`:

1. `listFromTier2Port("lender")` → `getLenderRegistryPort().listLenders()`
2. Dual-read port uses **in-memory cache** hydrated from:
   - `GET /api/lender-registry/lenders?page=1&pageSize=5000&status=active&enabled=true`
3. Service/repo: `lenderRegistryService.queryLenders` → Prisma `EnterpriseLender`
4. Additional client filters: `enabled !== false`; CO-LR-008 presentation dedupe
5. Contact Workspace does **not** itself call `ensureTier2RegistryPortsHydrated` — hydration depends on global enterprise registry hydrate when the flag is on

**This path is not the observed default Banker Role behaviour.**

---

## 4. Root cause

1. **Wrong SSOT binding:** Banker Role Institution uses ECM **Lender Master seed** (`EcmMasterSelect` / `listEcmMasterOptions`), not `EnterpriseLenderSearch` / Enterprise Lender Registry.
2. **Tier-2 registry port swap is off by default**, so the ECM path never delegates to DB-backed lenders.
3. **CO-LR-010** correctly completed the **Enterprise Lender Registry** table (275). It did **not** rebind ECM Banker Role Institution to that registry — so the dropdown still shows the 6-row seed.

Contrast (correct pattern already used elsewhere):

- `EnterpriseLenderSearch` → `searchActiveLenders` → `/api/lender-registry/lenders` → `lenderRegistryService` → `EnterpriseLender`

---

## 5. Impacted screens

| Screen / control | Binding | Impact |
|---|---|---|
| **Contact → Banker Role Workspace → Institution (Lender)** | `EcmMasterSelect` / ECM catalog | **Primary defect** — subset only |
| Cascading **Region / Branch** under Institution | ECM `region` / `branch` seeds keyed to `hdfc`/`sbi`/… | Tied to same legacy IDs — will not cascade against Registry UUIDs/codes without redesign |
| Any other `listEcmMasterOptions("lender")` consumer | Same catalog | Same subset unless Tier-2 ON + hydrated |
| Deal / Pipeline / Edit Deal lender pickers | `EnterpriseLenderSearch` | **Not this bug** — already Registry-backed |
| Balance Transfer “Existing Lender” | `EnterpriseLenderSearch` (or equivalent Registry search) | Approved exception for free-text institutions remains separate |

`masterDomain: "lender"` appears **only** on Banker Role template in role-templates (single constitutional wiring point for this label).

---

## 6. Recommendation (do not implement until approved)

**Preferred (aligns with enterprise rule):**

1. Replace Banker Role Institution control with **Enterprise Lender Registry** selection (reuse `EnterpriseLenderSearch` or a thin Registry-backed master select).
2. Persist Registry lender **id** (and display name) on banker role profile — migrate any existing `hdfc`/`sbi`/… seed IDs carefully.
3. Revisit Region/Branch cascade: either Registry-backed org structure, or keep local branch masters keyed by Registry lender id (not seed ids).
4. Keep Balance Transfer as the **only** approved free-text institution exception.
5. Do **not** rely solely on flipping `TIER2_REGISTRY_PORT_RUNTIME=true` without:
   - verifying Contact Workspace hydration,
   - verifying ID compatibility with existing banker profiles,
   - verifying Region/Branch cascade,
   - BAT that Banker Role shows ~275 (minus presentation dedupe / active filters).

**Not recommended as the sole fix:** expanding `ECM_MASTER_CATALOGS.lender` to 275 — that recreates a parallel list and violates Single Implementation / Registry SSOT.

---

## Production data protection

- This audit made **no code, schema, API, or data changes**.
- CO-LR-010 Registry inventory is unchanged by this investigation.

---

## Evidence checklist

- [x] Dropdown component identified (`EcmMasterSelect`)
- [x] Option SSOT identified (ECM hardcoded catalog)
- [x] Confirmed no Registry API under default flags
- [x] Confirmed Tier-2 runtime default OFF
- [x] Contrasted with correct Registry picker (`EnterpriseLenderSearch`)
- [x] Filters documented
- [x] Recommendation framed; **fix deferred pending Product Owner approval**
