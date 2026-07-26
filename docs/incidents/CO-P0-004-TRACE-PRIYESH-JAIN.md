# CO-P0-004 — Trace Business Case: Priyesh Jain

**Date:** 2026-07-23  
**Database:** Pilot Supabase project `unpjfzvlokovobxgvazo` (via `.env.local`)  
**Script:** `scripts/co-p0-004-trace-priyesh-jain.cjs`  
**Method:** Direct Prisma queries — no inference from UI/deployments

---

## 1. Does Contact "Priyesh Jain" exist?

**Yes.**

Exact match in `ecm_contacts`:

| Field | Value |
|-------|--------|
| id | `cmrxevs0b0001l704lyfsj88k` |
| name | Priyesh Jain |
| organizationId | `cmrtlilr60001weys1xv2uu5t` |
| mobilePrimary | 9769458444 |
| primaryRole | customer |
| status | provisional |
| enabled | true |
| isDeleted | **false** |
| createdAt | 2026-07-23T11:11:54.252Z |

## 2. Contact ID

`cmrxevs0b0001l704lyfsj88k`

## 3. Enterprise Deal linked?

**No.**

| Lookup | Count |
|--------|-------|
| `enterprise_deals.primary_contact_id = contactId` | **0** |
| `enterprise_deals.primary_contact_name` ILIKE Priyesh | **0** |
| `enterprise_deal_participants.ecm_contact_id` | **0** |
| `enterprise_deals` total rows (all orgs) | **0** |
| `enterprise_deals` active | **0** |

## 4. Deal details

N/A — no Deal row.

## 5. Uploaded documents linked to Deal?

**No** — no Deal ID to attach; `enterprise_deal_document_links` for this case = none.

## 6. Lender Workspace record linked?

**No** — no `enterprise_deal_counterparty_assignments` for this case.

## 7. Where did the transaction fail?

**Verified locus:** Contact **was saved**; Deal **was not persisted** to the Enterprise Deal Registry on this Pilot database.

| Hypothesis | Evidence |
|------------|----------|
| Contact saved | ✅ Row in `ecm_contacts` |
| Deal creation failed / never wrote to Postgres | ✅ `enterprise_deals` count = 0 globally; 0 links by contact id/name/participant |
| Deal saved to wrong table | ❌ No Deal found under Enterprise Deal tables queried; registry empty |
| Wrong tenant | ❌ Contact is on org `cmrtlilr60001weys1xv2uu5t`; entire `enterprise_deals` table empty (not a single-tenant miss) |
| Wrong project | ❌ Contact found on Pilot `unpjfzvlokovobxgvazo` — same DB under investigation |
| Query filtering | ❌ Lookups did not require active-only filters to find zero by contact id |
| Soft deleted | ❌ Contact `isDeleted=false`; no soft-deleted Deal rows exist for this name/id |
| Other | Create path still writes LoanFile to **browser `localStorage`** (`compass:loan-files-data`) first; dual-write to `/api/enterprise-deals` only when Deal Registry dual-write is enabled and API succeeds — consistent with Contact in Postgres + Deal absent from Postgres |

**Conclusion (evidence-based):** Priyesh Jain Contact succeeded on Pilot. Associated Deal(s) observed in some UIs are **not** in `enterprise_deals` on Pilot. Failure point = **Deal not written to Enterprise Deal Registry** (local/legacy path and/or dual-write not completed), not Contact failure, soft-delete, or wrong-project Contact storage.
