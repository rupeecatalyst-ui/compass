# CO-WP-DATA-CLEANUP-003 — Certification User / Partner Deactivation Report

**Authorization:** Product Owner (after CLEANUP-002 accepted)  
**Mode:** DEACTIVATE ONLY · records preserved · reactivatable  
**Deploy:** NOT performed · **Application code:** unchanged  

Inventory: `docs/co-wp-data-cleanup-003/CO-WP-DATA-CLEANUP-003-EXECUTION-INVENTORY.json`  
Executor: `scripts/co-wp-data-cleanup-003-execute.mjs`

**Status: SUCCESS**

---

## Safety check (pre-mutation)

| Check | Result |
|-------|--------|
| Active Opportunities owned by WPACERTA/B | **0** |
| Active Deals on cert-owned Opportunities | **0** |
| Partner IDs/codes match CLEANUP-001 | ✅ |
| User emails exact cert set only | ✅ |
| Frozen Business Certification Admin not in target set | ✅ |

No genuine dependency found → proceeded.

---

## Actions applied

### Users (`isActive = false`) + refresh tokens revoked

| Email | Role | Result |
|-------|------|--------|
| wp-access-cert-a@rupeecatalyst.com | VIEWER | Deactivated |
| wp-access-cert-b@rupeecatalyst.com | VIEWER | Deactivated |
| wp-access-cert-admin@rupeecatalyst.com | SUPER_ADMIN | Deactivated (confirmed cert-only in CLEANUP-001) |

Refresh tokens revoked: **5**

### Partners (not deleted)

| Code | ID | lifecycleStatus | operationalStatus | enabled | status | isDeleted |
|------|-----|-----------------|-------------------|---------|--------|-----------|
| WPACERTA | cmsljyws50005weeka0js9u4t | **suspended** | **inactive** | **false** | **inactive** | **false** |
| WPACERTB | cmsljyzhu0009weekfeq2rsv9 | **suspended** | **inactive** | **false** | **inactive** | **false** |

`lifecycleStatus=suspended` is the Partner Gateway binding gate (`PARTNER_SUSPENDED`).  
`profileJson.cleanup003` stamped with deactivation metadata (`reactivatable: true`); activation / batIsolation retained.

---

## A. Users deactivated

1. `wp-access-cert-a@rupeecatalyst.com` → `isActive: false`  
2. `wp-access-cert-b@rupeecatalyst.com` → `isActive: false`  
3. `wp-access-cert-admin@rupeecatalyst.com` → `isActive: false`  

---

## B. Partners deactivated

1. **WPACERTA** — suspended / inactive / disabled  
2. **WPACERTB** — suspended / inactive / disabled  

---

## C. Users / partners preserved

| Preserved | Status |
|-----------|--------|
| User rows | Not deleted |
| Partner rows | `isDeleted: false` |
| Entitlement profiles | Retained (count unchanged for cert partners) |
| Contact links / activation mapping | Retained in `profileJson` |
| Historical Opportunities/Deals | Soft-archived rows from CLEANUP-002 retained |

Reactivation path: set user `isActive=true`; set partner `lifecycleStatus=active`, `operationalStatus=active`, `enabled=true`, `status=active`.

---

## D. Audit records preserved

| Metric | Value |
|--------|------:|
| PartnerEntitlementAudit before | 28 |
| PartnerEntitlementAudit after | **28** |
| Delta | **0** |

---

## E. Before / after active counts

| Metric | Before | After |
|--------|-------:|------:|
| Cert users active | 3 | **0** |
| Cert partners operationally active | 2 | **0** |
| Platform active users | 9 | 6 (−3 cert) |
| Other active Wealth Partners | — | **2** (unaffected) |

---

## F. Authentication verification

| Check | Result |
|-------|--------|
| Partner login wp-access-cert-a | **Blocked** · `INVALID_CREDENTIALS` 401 (`isActive=false`) |
| Partner login wp-access-cert-b | **Blocked** · `INVALID_CREDENTIALS` 401 |
| Binding resolve for cert users | **Blocked** · Access denied / inactive user path |
| Partner Gateway with suspended partner | Gate: `lifecycleStatus=suspended` → `PARTNER_SUSPENDED` |

---

## G. Genuine-data integrity verification

| Check | Result |
|-------|--------|
| Active Opportunities | **16** unchanged |
| Genuine Opportunity fingerprint | ✅ match |
| Genuine Deal fingerprint | ✅ match |
| Entitlement audits intact | ✅ |
| Other active Wealth Partners | ✅ remain |
| Platform production admin | `admin@rupeecatalyst.com` SUPER_ADMIN **still active** (this environment’s admin identity; `admin@compass.com` not present in this DB) |
| Application code changes | None |
| Database reset | None |
| Vercel deploy | None |

---

## Exceptions / notes

- Script initially flagged missing `admin@compass.com` (frozen credential from Business Certification rules). In this database the active SUPER_ADMIN is `admin@rupeecatalyst.com`, which was **not** modified. Cleanup itself completed correctly.

---

## Final status

✅ **Certification identities deactivated and preserved for future regression reactivation.**  
**STOP · No deployment.**
