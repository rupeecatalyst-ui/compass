# CO-BUG-ERW-NETWORK — Relationship Network Explicit Registry Only

**Status:** Implementation Complete · Ready for BAT  
**Priority:** CRITICAL  
**CO-ARCH-002:** Filtering/rendering only — no relationship rows deleted or mutated

---

## Root cause

`buildContactRelationshipGraph` mixed four incorrect sources into the Contact Relationship Network:

1. **`illustrativeEcosystem`** — when fewer than 4 live satellites, injected hardcoded Bank RM, CA, Builder, Lawyer, Wealth Partner, Spouse, Guarantor nodes (`isIllustrative: true`).
2. **`roleProjectionNodes`** — projected the open contact’s ECM **roles** (builder, CA, lender_employee → Bank RM, partner) as if they were related parties.
3. **`loanStructureLinkNodes`** — inferred participants from Loan Structure / opportunity mapping.
4. Unfiltered ECM org-hierarchy edges (`reports_to` / `managed_by`) could surface Bank RM / employee hierarchy on the customer network.

The Network became a visualisation of “linked records + placeholders”, not the Relationship Registry.

---

## Fix

Relationship Network now projects **only** explicit registry edges:

| Source | Behaviour |
|--------|-----------|
| Company Registry contact↔company links | Included when relation role is ecosystem-eligible |
| ECM Contact Relationship edges | Included when type / `meta.erwRelationshipCode` is ecosystem-eligible |
| Contact roles | **Never** projected |
| Illustrative seed | **Removed** |
| Loan / opportunity inference | **Removed** |

Allowlist / denylist SSOT: `ERW_NETWORK_ECOSYSTEM_CODES` / `ERW_NETWORK_EXCLUDED_CODES` in `relationship-master.ts`.

Empty state: *“No relationships have been defined for this contact.”* + **+ Add Relationship** CTA. No placeholder nodes.

---

## Backward compatibility

- Existing relationship / company-link rows are untouched.
- No deletes, reseeds, or ID resets.
- Commercial contacts remain in their own registries; they appear on this Network only if an explicit ecosystem-eligible edge exists.

---

## Verify

```bash
npm run verify:co-bug-erw-network
```
