# CO-WP-DATA-CLEANUP-001 — Certification Test Data Reconciliation Audit

**Mode:** READ-ONLY AUDIT · **Mutations:** NONE  
**Generated:** 2026-08-10T10:01:15.103Z (live Prisma inventory)  
**Authority:** Product Owner — development/audit only  

**STOP — Await Product Owner approval before ANY deletion or archival.**

Full machine inventory:  
`docs/co-wp-data-cleanup-001/CO-WP-DATA-CLEANUP-001-AUDIT-INVENTORY.json`  
Re-run (read-only): `node --import tsx scripts/co-wp-data-cleanup-001-audit.mjs`

---

## A–D. Counts (live registry)

| Code | Metric | Count |
|------|--------|------:|
| **A** | Total Opportunities (`isDeleted=false`) | **36** |
| **B** | Probable certification test Opportunities | **20** |
| **C** | Genuine Opportunities (no ACCESS certify fingerprint) | **16** |
| **D** | Unknown / requires review | **0** |

Classification rule: a row is **CERTIFICATION_TEST_DATA** only with **concrete evidence** from the certify harness — not age or unusualness alone.

---

## Evidence model (concrete fingerprints)

Source script: `scripts/co-wp-access-002-certify.mjs` (`createOwnedOpportunity`)

| Signal | Fixture value |
|--------|----------------|
| Customer name | `{label} Customer` → e.g. `Cert A Referral Customer` |
| Product label | `Cert A Referral` · `Cert A Override Edit` · `Cert A ViewOnly` · `Cert B Solo` |
| Mobile | `90000000001` |
| Snapshot | `snapshot.cert = "CO-WP-ACCESS-002"` |
| Partner codes | `WPACERTA` · `WPACERTB` |
| Partner emails | `wp-access-cert-a@…` · `wp-access-cert-b@…` |
| BAT evidence JSON | Committed opportunity/deal IDs in ACCESS-002/003/004 evidence files |

Each certify run **creates four new Opportunities** (does not reuse). Five runs on 2026-08-09 explain the **20** duplicate-style cert rows.

Committed evidence IDs (subset of live cert rows):

| Sprint evidence | Opportunity IDs |
|-----------------|-----------------|
| ACCESS-002 / 003 | `cmslm0svo…` · `cmslm0tlg…` · `cmslm0u8z…` · `cmslm0uwe…` |
| ACCESS-004 | `cmslmw6tw…` · `cmslmw7h5…` · `cmslmw84w…` · `cmslmw8rd…` |

---

## E. Complete candidate cleanup list (Opportunities)

All **20** classified **CERTIFICATION_TEST_DATA** · confidence **high** · recommended action: candidate soft-archive/delete **after PO approval** (children first).

| # | Opportunity ID | Number | Customer | Product | sourceWealthPartnerId | Created (UTC) | Related Deal | Docs | Notes |
|--:|----------------|--------|----------|---------|----------------------|---------------|--------------|-----:|------:|
| 1 | `cmsljz1ep000bweekeln9ikg7` | OPP-2026-000061 | Cert A Referral Customer | Cert A Referral | WPACERTA `cmsljyws…` | 2026-08-09 08:40:52 | DEAL-2026-000085 | 0 | 0 |
| 2 | `cmsljz25h000dweekzqxd1223` | OPP-2026-000062 | Cert A Override Edit Customer | Cert A Override Edit | WPACERTA | 08:40:53 | — | 0 | 0 |
| 3 | `cmsljz2vh000fweek0rzpd2qj` | OPP-2026-000063 | Cert A ViewOnly Customer | Cert A ViewOnly | WPACERTA | 08:40:54 | — | 0 | 0 |
| 4 | `cmsljz3l8000hweeklhv65sg4` | OPP-2026-000064 | Cert B Solo Customer | Cert B Solo | WPACERTB `cmsljyzh…` | 08:40:55 | DEAL-2026-000086 | 0 | 0 |
| 5 | `cmslkuflz0001wez4el74xaym` | OPP-2026-000065 | Cert A Referral Customer | Cert A Referral | WPACERTA | 09:05:17 | DEAL-2026-000087 | 0 | 2 |
| 6 | `cmslkugod0003wez48oa4pt5x` | OPP-2026-000066 | Cert A Override Edit Customer | Cert A Override Edit | WPACERTA | 09:05:18 | — | 0 | 0 |
| 7 | `cmslkuhgs0005wez48r5c7xbs` | OPP-2026-000067 | Cert A ViewOnly Customer | Cert A ViewOnly | WPACERTA | 09:05:19 | — | 0 | 0 |
| 8 | `cmslkuib70007wez493u9c0uf` | OPP-2026-000068 | Cert B Solo Customer | Cert B Solo | WPACERTB | 09:05:20 | DEAL-2026-000088 | 0 | 0 |
| 9 | `cmslm0svo0001wedsvmh3chmz` ★ | OPP-2026-000069 | Cert A Referral Customer | Cert A Referral | WPACERTA | 09:38:14 | DEAL-2026-000089 | 0 | 0 |
| 10 | `cmslm0tlg0003wedsm35w17xy` ★ | OPP-2026-000070 | Cert A Override Edit Customer | Cert A Override Edit | WPACERTA | 09:38:15 | — | 0 | 0 |
| 11 | `cmslm0u8z0005wedsrp8vcvph` ★ | OPP-2026-000071 | Cert A ViewOnly Customer | Cert A ViewOnly | WPACERTA | 09:38:15 | — | 0 | 0 |
| 12 | `cmslm0uwe0007wedstm3wsuct` ★ | OPP-2026-000072 | Cert B Solo Customer | Cert B Solo | WPACERTB | 09:38:16 | DEAL-2026-000090 | 0 | 0 |
| 13 | `cmslmi70n0001wem8pdysew0w` | OPP-2026-000073 | Cert A Referral Customer | Cert A Referral | WPACERTA | 09:51:45 | DEAL-2026-000091 | 0 | 2 |
| 14 | `cmslmi7tr0003wem8cwf3jo32` | OPP-2026-000074 | Cert A Override Edit Customer | Cert A Override Edit | WPACERTA | 09:51:46 | — | 0 | 0 |
| 15 | `cmslmi8ha0005wem8vr0r2up1` | OPP-2026-000075 | Cert A ViewOnly Customer | Cert A ViewOnly | WPACERTA | 09:51:47 | — | 0 | 0 |
| 16 | `cmslmi9ca0007wem8wwx4zgig` | OPP-2026-000076 | Cert B Solo Customer | Cert B Solo | WPACERTB | 09:51:48 | DEAL-2026-000092 | 0 | 0 |
| 17 | `cmslmw6tw0001wedstfh9lyit` ★ | OPP-2026-000077 | Cert A Referral Customer | Cert A Referral | WPACERTA | 10:02:38 | DEAL-2026-000093 | 0 | 2 |
| 18 | `cmslmw7h50003wedsia9d68u6` ★ | OPP-2026-000078 | Cert A Override Edit Customer | Cert A Override Edit | WPACERTA | 10:02:39 | — | 0 | 0 |
| 19 | `cmslmw84w0005wedsr5mf7sde` ★ | OPP-2026-000079 | Cert A ViewOnly Customer | Cert A ViewOnly | WPACERTA | 10:02:40 | — | 0 | 0 |
| 20 | `cmslmw8rd0007wedsfl10u7j2` ★ | OPP-2026-000080 | Cert B Solo Customer | Cert B Solo | WPACERTB | 10:02:41 | DEAL-2026-000094 | 0 | 0 |

★ = also listed in committed BAT evidence JSON.

**Source (all rows):** `wealth_partner` · **Customer IDs:** `null` on these fixtures (name-only provisional fields from certify script) · **CreatedBy:** `cmrtliln30000weys6c2ljzy8` (certify actor / org SUPER_ADMIN path).

Per-row evidence, deal IDs, and note IDs: see inventory JSON `detailedCandidates` / `candidateCleanupList`.

---

## F. Evidence supporting each classification

### CERTIFICATION_TEST_DATA (20)

Every row matches **all** of:

1. Fixture customer name pattern from certify script  
2. Fixture product label  
3. Mobile `90000000001`  
4. `sourceWealthPartnerId` ∈ {WPACERTA, WPACERTB}  
5. `snapshot.cert = CO-WP-ACCESS-002`  

Plus, for 8 rows: explicit BAT evidence JSON IDs.

### GENUINE_BUSINESS_DATA (16)

Remaining Opportunities in the registry that **do not** match the ACCESS certify fingerprint set. **Not listed for cleanup.**

### UNKNOWN / REQUIRES_REVIEW (0)

No partial-fingerprint rows found in this audit pass.

---

## G. Related test-data dependencies

### Test partners (Wealth Partner Registry)

| Code | ID | Display name | Email |
|------|-----|--------------|-------|
| WPACERTA | `cmsljyws50005weeka0js9u4t` | WP Access Cert Partner A | wp-access-cert-a@rupeecatalyst.com |
| WPACERTB | `cmsljyzhu0009weekfeq2rsv9` | WP Access Cert Partner B | wp-access-cert-b@rupeecatalyst.com |

Partner ECM contacts: `cmsljyvi20003weeky9he935i` (A) · `cmsljyxlm0007weekgxvzvy80` (B).

### Test users

| Email | Role | Active |
|-------|------|--------|
| wp-access-cert-a@rupeecatalyst.com | VIEWER | yes |
| wp-access-cert-b@rupeecatalyst.com | VIEWER | yes |
| wp-access-cert-admin@rupeecatalyst.com | SUPER_ADMIN | yes |

Do **not** touch frozen Business Certification Admin `admin@compass.com`.

### Test customers (Opportunity-level)

No durable `primaryContactId` on cert Opportunities. “Customers” are **name strings** on the Opportunity row (`Cert A … Customer` / `Cert B Solo Customer`). Partner contacts above are partner identity, not borrower customers.

### Test Deals (10) — exclusively linked to cert Opportunities

| Deal number | Product label | Linked cert Opportunity run |
|-------------|---------------|-----------------------------|
| DEAL-2026-000085 … 000094 | Cert Deal A / Cert Deal B | Paired Referral / Solo fixtures across five runs |

Evidence JSON deal IDs (subset):  
`cmslm0vud…` · `cmslm0wta…` · `cmslmw9oj…` · `cmslmwam6…`  
Full deal id list: inventory `relatedTestDependencies.deals`.

### Test Documents

**0** `EnterpriseTransactionDocument` rows linked to the 20 cert Opportunities in this audit.

### Test Activities / Business Notes

Notes found only on some **Cert A Referral** Opportunities (counts 2+2+2 on OPP-065 / 073 / 077). Authors include cert partner user `cmsljys0w0000weekptm7a73d`. Full note IDs in inventory.

### Test entitlement records

**25** `PartnerEntitlementAudit` rows matching cert partners / “Certification” / `CO-WP-ACCESS` reasons (sample in inventory). Profiles/templates for WPACERTA/B were configured by the certify harness — **system templates must be retained**; only partner-specific cert profile/overrides are cleanup candidates after PO approval.

---

## H. Recommended safe cleanup sequence

**Do nothing until Product Owner approves this report and the candidate ID list.**

1. PO approve inventory + classification  
2. Soft-delete / archive **Business Notes** linked only to the 20 cert Opportunity IDs  
3. Soft-delete / archive any **Documents** linked only to those IDs (none found now; re-check at execution)  
4. Soft-delete / archive the **10 Cert Deal** rows (and deal children: tasks/activities/snapshots if any)  
5. Soft-delete / archive the **20 cert Opportunities**  
6. Review entitlement **profiles/overrides** for WPACERTA/B — keep system templates; optionally reset cert partner profiles  
7. Optionally deactivate cert users (`wp-access-cert-*`) — never `admin@compass.com`  
8. Optionally archive WPACERTA/B partners **only after** confirming zero remaining Opportunities with those `sourceWealthPartnerId` values that are not also genuine  
9. Re-run `scripts/co-wp-data-cleanup-001-audit.mjs` — expect B → 0  
10. **Never** production-reset, truncate, or bulk-delete genuine Opportunities  

---

## What was NOT done

- No DELETE / ARCHIVE / TRUNCATE / RESET  
- No production data modification  
- No business logic or ACCESS architecture changes  
- No deploy  

---

## Final status

🟡 **Audit complete · Cleanup blocked pending Product Owner approval · STOP**
