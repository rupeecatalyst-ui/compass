# CO-WP-001 — Wealth Partner Conversion & Registry Integrity

**Status:** Root Cause Identified · Fix Implemented · Ready for BAT  
**Date:** 2026-07-31  
**Production data:** No live Wealth Partner / Contact records were read, modified, deleted, or reset during investigation.

---

## 1. Root Cause Analysis

### Symptom (production)

```text
Contact already converted into a Wealth Partner (or a duplicate Wealth Partner code exists).
```

### Exact root cause

**Case B + Case D conflation in production error mapping (primary for the reported string).**

On the **certified / deployed** codebase (`co-deploy-001-certified`), `mapRouteError` maps **any** Prisma `P2002` unique-constraint failure to that single combined message:

```ts
// production (pre-fix)
"Contact already converted into a Wealth Partner (or a duplicate Wealth Partner code exists)."
```

The unique index that typically fires is `(organizationId, code)` — i.e. a **Wealth Partner code collision** (Case D / concurrent allocate), **not** proof that the selected Contact already has a WP relationship (Case A).

So the UI can report “already converted” when the Contact has **no** Wealth Partner (Case B false positive via Case D).

### Secondary production defect (Case A UX)

When the Contact **does** already have a non-deleted WP (true Case A), production throws:

```text
Contact already converted into a Wealth Partner (WPT######).
```

as a plain validation toast — **no** Status / Code / Type / Created / Open Wealth Partner panel. Combined with Registry list filters / silent list errors (documented in CO-WP-006 RCA), RMs cannot open the existing partner.

### Case matrix

| Case | Occurring in production? | Notes |
|------|--------------------------|-------|
| **A** Contact already has active WP | Yes (legitimate blocks) | Message imprecise; no guided Open UX |
| **B** No WP but validation says yes | **Yes via P2002 mapping** | Code collision mislabelled as “already converted” |
| **C** Duplicate WP codes in DB | Unlikely as steady state (unique index) | Would surface as P2002 |
| **D** Code generator race | **Yes (contributing)** | Sequential `max(code)+1` without pre-check + combined P2002 message |
| **E** Soft-deleted treated as active | No for block | Soft-deleted correctly excluded from `findActiveByIdentity`; fix path **reactivates** instead of duplicating |
| **F** Wrong entity lookup | No | Same Prisma `EnterpriseWealthPartner` SSOT for create + list |

**Verdict:** The reported generic string is **Case B (false “already converted”) caused by Case D (code collision) being mis-mapped**, with Case A also poorly handled in UX.

---

## 2. Architecture Review

Unchanged and confirmed:

```text
Enterprise Contact / Company Registry  →  identity SSOT
Enterprise Wealth Partner Registry     →  commercial relationship only
One Contact/Company → at most one non-deleted WP relationship
```

- No new registries / storage.
- Soft-deleted WP → **reactivate** (do not create a second relationship).
- Inactive lifecycle statuses still count as an existing relationship (block convert; show Status in UI).

---

## 3. Validation Flow (implemented)

1. Contact/Company exists? → else `"Selected Contact not found."` / `"Selected Company not found."`
2. Non-deleted WP for that identity? → `409 WEALTH_PARTNER_ALREADY_REGISTERED` + structured summary + `"This Contact is already an active Wealth Partner."`
3. Soft-deleted WP for that identity? → restore (no duplicate create)
4. Allocate unique `WPT######` with existence check + collision retry
5. Create WP relationship; P2002 on code → retry; exhausted → `"Unable to generate a unique Wealth Partner code."`

---

## 4. Code Generator Review

| Requirement | Status |
|-------------|--------|
| Guaranteed uniqueness | `allocateUniqueWealthPartnerCode` + P2002 retry |
| Collision retry | Up to 12 existence checks + 8 create retries |
| No manual intervention | Automatic |
| Preserve existing codes | Never renumbers |
| Soft-deleted codes reserved | Included in max(code) scan |

---

## 5. Implementation Report

| Area | Change |
|------|--------|
| Service | Validation order; precise messages; structured already-exists |
| Codes | Unique allocator with collision retries |
| Repository | Uses unique allocator; activity note on collision recovery |
| Route utils | Split `WEALTH_PARTNER_ALREADY_REGISTERED` vs `WEALTH_PARTNER_CODE_COLLISION`; **removed** combined P2002 string |
| Wizard | Status · Code · Type · Created · Open Wealth Partner |
| Soft delete | Reactivate existing relationship |

**Prior note:** CO-WP-006 implemented much of this in the main working tree but was **never deployed** to the certified production branch — that is why production still showed the old message.

---

## 6. BAT Results

| Scenario | Expected | Static verify |
|----------|----------|---------------|
| New Contact | Creates WP + opens workspace | Covered by success path |
| Existing WP | Panel + Open (no generic P2002 string) | `verify:co-wp-006` |
| Duplicate code simulation | Retry / collision message ≠ already converted | Allocator + route mapping |
| Inactive lifecycle WP | Blocks convert; shows Status | `findActiveByIdentity` |
| Soft-deleted WP | Restores; no second row | restore path |
| Company conversion | Same rules with Company copy | Service branches |
| Contact conversion | Same | Service branches |

Manual BAT on deployed URL required for live mic/DB confirmation.

```bash
npm run verify:co-wp-006
npm run verify:co-wp-002
```

---

## 7. Production data attestation

| Action | Done? |
|--------|-------|
| Deleted Wealth Partners | No |
| Deleted Contacts | No |
| Reset / renumbered codes | No |
| Truncated tables | No |
| Recreated registries | No |
| Modified historical relationships during investigation | No |
| Investigation method | Code-path / certified-vs-main comparison only |

---

*End of CO-WP-001 report*
