# CO-WP-DATA-CLEANUP-002 — Certification Test Data Cleanup Execution Report

**Authorization:** Product Owner (CLEANUP-001 accepted)  
**Mode:** Soft-archive (`isDeleted` + `archived`) · Exact audited IDs only  
**Generated:** 2026-08-10 (live execution)  
**Deploy:** NOT performed · **Application code:** unchanged · **Entitlement architecture:** unchanged  

Machine inventory: `docs/co-wp-data-cleanup-002/CO-WP-DATA-CLEANUP-002-EXECUTION-INVENTORY.json`  
Executor: `scripts/co-wp-data-cleanup-002-execute.mjs`

**Status: SUCCESS** · Exceptions: **0**

---

## Pre-cleanup safety

Re-queried live DB before mutation:

| Check | Result |
|-------|--------|
| Exactly 20 target Opportunity IDs present | ✅ Match CLEANUP-001 |
| Exactly 10 target Deal IDs present | ✅ Match CLEANUP-001 |
| Fingerprints (`Cert * Customer`, labels, WPACERTA/B, `snapshot.cert=CO-WP-ACCESS-002`) | ✅ All 20 |
| Deals linked only to target Opportunities + Cert Deal A/B labels | ✅ |
| Inventory mismatch → STOP | Not triggered |

---

## A. Target IDs before cleanup

### Opportunities (20)

`cmsljz1ep000bweekeln9ikg7` · `cmsljz25h000dweekzqxd1223` · `cmsljz2vh000fweek0rzpd2qj` · `cmsljz3l8000hweeklhv65sg4` · `cmslkuflz0001wez4el74xaym` · `cmslkugod0003wez48oa4pt5x` · `cmslkuhgs0005wez48r5c7xbs` · `cmslkuib70007wez493u9c0uf` · `cmslm0svo0001wedsvmh3chmz` · `cmslm0tlg0003wedsm35w17xy` · `cmslm0u8z0005wedsrp8vcvph` · `cmslm0uwe0007wedstm3wsuct` · `cmslmi70n0001wem8pdysew0w` · `cmslmi7tr0003wem8cwf3jo32` · `cmslmi8ha0005wem8vr0r2up1` · `cmslmi9ca0007wem8wwx4zgig` · `cmslmw6tw0001wedstfh9lyit` · `cmslmw7h50003wedsia9d68u6` · `cmslmw84w0005wedsr5mf7sde` · `cmslmw8rd0007wedsfl10u7j2`

### Deals (10)

`cmsljz4jm000jweekoky7s9p0` · `cmsljz5wv000lweek9wghsq92` · `cmslkujir0009wez4pmtj0zn4` · `cmslkuksr000bwez41a1l3ost` · `cmslm0vud0009wedsqzpr6qaw` · `cmslm0wta000bwedsjbqstus1` · `cmslmiagj0009wem8x5w1av2q` · `cmslmiblg000bwem8jtx8ub42` · `cmslmw9oj0009wedsy9l1hwgs` · `cmslmwam6000bwedswbic0i8x`

---

## B. Records actually removed / archived

| Entity | Action | Count |
|--------|--------|------:|
| EnterpriseBusinessNote | Soft-deleted | **6** |
| EnterpriseTransactionDocument | — | **0** (none found) |
| EnterpriseDeal | Soft-deleted + archived | **10** |
| EnterpriseOpportunity | Soft-deleted + archived | **20** |

Deletion reason stamped:  
`CO-WP-DATA-CLEANUP-002: soft-archive ACCESS certification test fixture`  
`deletedBy` / `archivedBy`: `co-wp-data-cleanup-002`

Note IDs archived:  
`cmslkvku20001weu82tjymnvi` · `cmslkwq8v0005weu8edqm8xkj` · `cmslmkkw90007l804ke3kacer` · `cmslmnhly000bl8049nxbu5ch` · `cmslmylio0005l204l7qqwskw` · `cmsln1m2r0009l204r34pm6mt`

---

## C. Records preserved

- **16** genuine Opportunities (IDs unchanged; fingerprint match)  
- **14** remaining active Deals (genuine set fingerprint match; active deal count 24→14 = −10 cert)  
- Partner Entitlement Audit rows (see E)  
- Cert users / WPACERTA / WPACERTB (see F — not mutated)  
- ACCESS entitlement architecture / Partner Gateway / application code  

---

## D. Dependent records handled

| Dependency | Found at re-check | Handled |
|------------|------------------:|---------|
| Business Notes on target Opp/Deal | 6 | Soft-deleted (Step 1) |
| Documents on target Opp | 0 | N/A |
| Deal tasks / activities / notes children | Checked | Soft-deleted where `isDeleted` supported (none requiring separate count beyond parent Deals) |

No unexpected new document dependencies.

---

## E. Audit records preserved

| Metric | Value |
|--------|------:|
| PartnerEntitlementAudit before | 28 |
| PartnerEntitlementAudit after | 28 |
| Delta | **0** |
| Deleted | **false** |

Certification entitlement audit evidence retained.

---

## F. User / partner review — STOP for Product Owner

**No deactivation or deletion performed.**

| Entity | Status | Active Opportunities owned |
|--------|--------|----------------------------|
| WPACERTA `cmsljyws50005weeka0js9u4t` | active / not deleted | **0** |
| WPACERTB `cmsljyzhu0009weekfeq2rsv9` | active / not deleted | **0** |
| wp-access-cert-a@… | VIEWER · isActive | — |
| wp-access-cert-b@… | VIEWER · isActive | — |
| wp-access-cert-admin@… | SUPER_ADMIN · isActive | — |

**Genuine business data on cert partners:** none remaining.

**Recommendation:** Safe to deactivate or retain for future ACCESS regression — **Product Owner decision required**. Not mutated by CLEANUP-002.

---

## G. Before / after counts

| Metric | Before | After | Expected |
|--------|-------:|------:|----------|
| Active Opportunities | 36 | **16** | 16 |
| Target Opps still active | 20 | **0** | 0 |
| Cert name fingerprint still active | — | **0** | 0 |
| Active Deals | 24 | **14** | 24−10 |
| Target Deals still active | 10 | **0** | 0 |

---

## H. Integrity verification

| Check | Result |
|-------|--------|
| All 20 target Opportunities soft-deleted + archived | ✅ |
| All 10 target Deals soft-deleted + archived | ✅ |
| Opportunity Registry healthy (16 active) | ✅ |
| Deal Registry healthy (targets inactive) | ✅ |
| No FK orphan from hard-delete | ✅ (soft-archive only) |

---

## I. Genuine data protection verification

| Check | Result |
|-------|--------|
| Genuine Opportunity count 16→16 | ✅ |
| Genuine Opportunity ID set unchanged | ✅ |
| Genuine Opportunity updatedAt fingerprint match | ✅ |
| Genuine Deal fingerprint match | ✅ |
| Entitlement audits not decreased | ✅ |
| No bulk delete by partner ID / source / date | ✅ |

---

## J. Exceptions

**None.**

---

## What was not done

- No Vercel deploy  
- No application code changes  
- No entitlement architecture changes  
- No database reset / truncate / migrate reset  
- No cert user/partner deactivation  
- No PartnerEntitlementAudit deletion  

---

## Final status

✅ **Cleanup complete for confirmed certification test business data.**  
⏸️ **Cert users/partners retained — awaiting Product Owner decision (Section F).**  
**STOP.**
