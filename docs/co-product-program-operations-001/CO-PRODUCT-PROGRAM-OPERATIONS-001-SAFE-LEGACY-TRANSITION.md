# CO-PRODUCT-PROGRAM-OPERATIONS-001 — Safe Legacy Transition Recertification

Status: **engineering recertification** (not Product Owner Business Certification)  
Authority: Product Owner Option 1 (2026-09-07)  
Base commit: `212672f` (not amended)

## Decision

Complete active legacy programmes remain visible in Product Programmes, Lender Registry and Lender 360, labelled exactly `Legacy programme — review required`. `is_live_published` stays `false`. They are excluded from CHANAKYA, Opportunity Compass, proposals, LOD citations and Marketing claims until structured completion, maker-checker approval and explicit republication.

Archived programmes stay archived (complete and incomplete). Deleted rows are unchanged. Existing Deal programme stamps are not rewritten.

## Migration correction

Folders `20260906180000_co_product_program_operations_001` and `20260906184500_co_product_program_operations_001_strict_publication` were corrected in place because they have never been applied to production.

- Incomplete UPDATE now excludes archived lifecycle/status.
- Complete-active UPDATE no longer sets `is_live_published = true`.
- 184500 unpublished residual live rows without drafting complete-active or archived programmes.

## Hostinger / Supabase

This recertification used disposable local PostgreSQL only.

- No Supabase connection
- No production migration
- No push
- Hostinger unchanged
