# CO-WP-DOC-002 — Wealth Partner Document Inbox

Status: **Implementation complete** · Architecture: CO-DOC-ARCH-001 · **No Vercel deploy**

## Summary

Wealth Partner Document Workspace is now a **Document Inbox**: partners upload documents they have (multi-file) into the existing Enterprise Document SSOT (`uploadSource = wealth_partner`). Pending requirements continue to project from Catalyst One EDIE LOD. Upload does **not** auto-verify or auto-satisfy requirements.

## Behaviour

| Partner surface | Behaviour |
|---|---|
| Upload Customer Documents | Freeform multi-file → `doc:other:*` → ETD |
| Documents Received | All Opportunity documents from SSOT |
| Pending Documents | LOD items still missing / rejected / re-upload |
| Additional Documents | Extra freeform uploads + list of unclassified docs |

## Catalyst One

- `PartnerOpportunityDocumentUploadInput.typeRef` optional; `intakeMode`: inbox \| additional \| requirement
- Freeform stamps unclassified typeRef; still `upsertPartnerOpportunityDocument` with WEALTH_PARTNER map
- LOD match = **exact typeRef only** (no fuzzy title match of inbox files onto checklist)
- Active upload → partner LOD `pending_verification` until C1 verifies (`uploaded` only when verified)

## Non-goals (preserved)

- No WealthPartnerDocument store
- No partner checklist / status engine
- Walk-in Document Center and Direct/COMPASS portal paths untouched

## Verification

- `node scripts/co-wp-doc-002-verify.mjs` (C1)
- `node scripts/co-wp-doc-002-verify.mjs` (WP App)
- TypeScript + build gates (local)

## Manual BAT checklist

1. Partner multi-upload → appears in C1 Document workspace  
2. Source `wealth_partner`  
3. Pending item appears after LOD ready  
4. Pending upload with typeRef → pending_verification, not verified  
5. Additional upload works  
6. Ownership / entitlements unchanged  
