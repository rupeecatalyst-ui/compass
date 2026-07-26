# CO-ARCH-003 Phase 2B — Database State Verification (Read-Only)

**Executed:** 2026-07-24 (pre Sprint 3)  
**Organization:** `rupee-catalyst`  
**Mode:** READ-ONLY — no records created, updated, or deleted  

Evidence JSON: `docs/co-arch-003/CO-ARCH-003-PHASE-2B-DB-STATE-READONLY.json`

---

## 1. Opportunities

**Total:** 8 (Active **5** · Soft Deleted **3**)

| Business Ref | Opportunity ID | Customer Name | Status | Created (UTC) | Active / Soft Deleted |
|--------------|----------------|---------------|--------|---------------|------------------------|
| OPP-2026-000001 | `ccf4dc36c3052ddb1f22c7c74` | Phase2A Validation Customer | active | 2026-07-23T19:19:57Z | **Active** (test leftover) |
| OPP-2026-000002 | `c70333cc9d81af8cecae32aa3` | P2B-S1 Invoice Party Contact … | active | 2026-07-23T20:25:21Z | **Active** (test leftover) |
| OPP-2026-000003 | `ca10276f67d615035fa51cbda` | P2B-S1 Invoice Party Contact … | active | 2026-07-23T20:26:02Z | Soft Deleted |
| OPP-2026-000004 | `cb9ff2815d2eae8bb2d23bc91` | P2B Integrity Customer … | active | 2026-07-23T20:55:03Z | Soft Deleted |
| OPP-2026-000005 | `c1a30bd30b054f8901c107df5` | P2B Integrity Customer … | active | 2026-07-23T20:55:46Z | Soft Deleted |
| OPP-2026-000006 | `cmryli0mm0001l404rl7puwiy` | Gaurang Gandhi | active | 2026-07-24T07:04:54Z | **Active** (appears business) |
| OPP-2026-000007 | `cmryli0ya0001jm04e9m40ygm` | Gaurang Gandhi | active | 2026-07-24T07:04:55Z | **Active** (appears business) |
| OPP-2026-000008 | `cmryli3bc0003l4049ptifeei` | P2B-S1 Invoice Party Contact … | active | 2026-07-24T07:04:57Z | **Active** (test-linked) |

---

## 2. Deals

**Total:** 17 (Active **6** · Soft Deleted **11**)

### Active Deals

| Deal Ref | Deal ID | Opportunity | Lender | Stage | Invoice Party | State |
|----------|---------|-------------|--------|-------|---------------|-------|
| DEAL-2026-000001 | `ce23e28977344bede65849939` | OPP-2026-000001 | HDFC | identified | (none) | Active |
| DEAL-2026-000002 | `c9dab5e62d1e1fa8c182f3d88` | OPP-2026-000001 | SBI | identified | (none) | Active |
| DEAL-2026-000003 | `c7bacc240ded85597d17ba4de` | OPP-2026-000001 | ICICI | identified | (none) | Active |
| DEAL-2026-000005 | `c3a5508e798d225e47537f46a` | OPP-2026-000002 | HDFC | logged_in_wip | (none) | Active |
| DEAL-2026-000006 | `c9542bdc87e2c9c480c88ecb6` | OPP-2026-000002 | SBI | logged_in_wip | P2B S1 Validation Invoice Party | Active |
| DEAL-2026-000007 | `cf12b2ef843f876c78e5419d1` | OPP-2026-000002 | ICICI | logged_in_wip | P2B S1 Validation Invoice Party | Active |

### Soft-deleted Deals (summary)

| Deal Refs | Opportunity | Cleanup |
|-----------|-------------|---------|
| DEAL-2026-000008 … 000010 | OPP-2026-000003 | `co-arch-003-p2b-s1-bfv` / `p2b_s1_bfv_cleanup` |
| DEAL-2026-000011 … 000014 | OPP-2026-000004 | `co-arch-003-p2b-integrity` / `p2b_opp_deal_integrity_cleanup` |
| DEAL-2026-000016 … 000019 | OPP-2026-000005 | `co-arch-003-p2b-integrity` / `p2b_opp_deal_integrity_cleanup` |

*(No DEAL-2026-000004 / 000015 present in current inventory.)*

---

## 3. Test data created during validation

### Soft-deleted successfully

| Artifact | Soft-deleted? | Process |
|----------|---------------|---------|
| Integrity Opportunities OPP-000004, OPP-000005 | **Yes** | `scripts/co-arch-003-p2b-opp-deal-integrity.mjs` → actor `co-arch-003-p2b-integrity`, reason `p2b_opp_deal_integrity_cleanup` |
| Integrity Deals DEAL-000011–000014, 000016–000019 | **Yes** | same |
| Integrity Invoice Parties (8) | **Yes** | same |
| Integrity Contacts (10) | **Yes** | same |
| P2B S1 Opportunity OPP-000003 + 3 Deals | **Yes** | `scripts/co-arch-003-p2b-s1-bfv-validate.mjs` → actor `co-arch-003-p2b-s1-bfv`, reason `p2b_s1_bfv_cleanup` |
| Related S1 Invoice Parties (2) + Contacts (2) + Company (1) from that run | **Yes** | same |

### Still ACTIVE (not cleaned)

| Type | Record | Notes |
|------|--------|-------|
| Opportunity | **OPP-2026-000001** | Phase 2A E2E (`co-arch-003-p2a-e2e`) — script did not soft-delete |
| Deal ×3 | **DEAL-2026-000001…000003** | Children of OPP-000001 |
| Opportunity | **OPP-2026-000002** | Earlier P2B S1 BFV run (not the cleaned run) |
| Deal ×3 | **DEAL-2026-000005…000007** | Children of OPP-000002 |
| Opportunity | **OPP-2026-000008** | Linked to P2B-S1 test contact name (created 2026-07-24) |
| Invoice Party | `P2B S1 Validation Invoice Party` (`c259f348713ee62567dcdf5cc`) | Still active |
| Invoice Party | `P2B-S1 Invoice Party Co 1784838320134` (`c6096e686b64cdcc05916ece0`) | Still active |
| Contact | Phase2A Validation Customer | Still active |
| Contact | P2B-S1 Invoice Party Contact 1784838320134 | Still active |
| Contact | P2B-S1 Non-Party Contact 1784838320134 | Still active |
| Company | P2B-S1 Invoice Party Co 1784838320134 | Still active |

**Count of remaining active test-linked artifacts:** 15

---

## 4. Database integrity counts

| Metric | Count |
|--------|------:|
| Active Opportunities | **5** |
| Soft Deleted Opportunities | **3** |
| Active Deals | **6** |
| Soft Deleted Deals | **11** |
| Active Invoice Parties | **2** |
| Soft Deleted Invoice Parties | **10** |

Note: Both currently **active** Invoice Party Master rows are validation/test parties.

---

## 5. Final summary

| Item | Value |
|------|------:|
| Active Opportunities | 5 |
| Active Deals | 6 |
| Soft Deleted Opportunities | 3 |
| Soft Deleted Deals | 11 |
| Remaining active test data | **Yes — 15 artifacts** |
| Database clean for Sprint 3? | **NO** |

### Recommendation

Sprint 3 can proceed **technically**, but the database is **not fully clean** of BFV/E2E leftovers:

1. Phase 2A E2E cluster: OPP-000001 + DEAL-000001…000003 + Phase2A Contact  
2. Incomplete P2B S1 cleanup: OPP-000002 + DEAL-000005…000007 + S1 Invoice Parties / Contacts / Company  
3. OPP-000008 appears derived from the leftover S1 contact  

Business-looking records (**Gaurang Gandhi** → OPP-000006, OPP-000007) are active and should be preserved.

**No cleanup was performed in this verification.** Explicit instruction is required before soft-deleting remaining test clusters.
