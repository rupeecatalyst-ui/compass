# CO-WP-INT-001 — Wealth Partner → Catalyst One Opportunity & Deal Operational Integration

**Status:** DEVELOPMENT COMPLETE · Ready for Business Acceptance Testing  
**Deploy:** **NOT performed** (PO directive)  
**Date:** 2026-08-10

---

## Objective

Make Opportunity and Deal workflows genuinely operational between:

```
Wealth Partner App → Partner Gateway → Catalyst One → Enterprise SSOT
```

The Partner App must never create a parallel Opportunity or Deal registry.

---

## Constitutional Health Check

| Principle | Result |
|-----------|--------|
| Opportunity Registry SSOT | GREEN — create/patch/submit write Registry |
| Deal Registry SSOT | GREEN — view/edit/stage/activity via owned Deals |
| No premature Partner Deal create | GREEN — no `createDeal` on Partner Gateway |
| Canonical stages | GREEN — `LenderCaseStage` / `enterpriseDealService.transitionDeal` |
| Entitlements (ACCESS) | GREEN — unchanged; Gateway enforces |
| Parallel Opp/Deal store | GREEN — placeholder Map is UX mirror only; ownership = `sourceWealthPartnerId` |

**CHC: GREEN** — development may proceed / complete under this sprint.

---

## What changed

### Catalyst One (Partner Gateway)

1. **Opportunity create** — ECM provisional contact + `enterpriseOpportunityRepository.createOpportunity` with `sourceWealthPartnerId`, product, amount, snapshot sourcing notes, audit actor.
2. **Opportunity view / pipeline** — `partnerOwnershipService.listOwnedOpportunities` / `requireOwnedOpportunity` (Registry filter); pipeline projects owned rows.
3. **Opportunity edit / submit** — Registry `updateOpportunity` first; snapshot **merged** (`...prevSnap`) so partner fields do not wipe prior snapshot keys; placeholder store mirrors for Connect UX only.
4. **Deal** — Existing ACCESS-001A surfaces remain: list / get / patch / stage / activities. Ownership = Deal → Opportunity.`sourceWealthPartnerId`. Activities fail-closed via Enterprise Business Notes.
5. **Deal create** — Explicitly **not** exposed to partners. Deals exist only after lender identification in Catalyst One (Move-to-Deal / identify lender).

### Wealth Partner App

1. `partnerPatch` helper + typed Deal API clients (`get` / `patch` / `stage` / `activity`).
2. **Deal detail desk** (`DealDetailScreen`) — view, entitled edit, canonical stage change, activity; **reload from Gateway after every mutation**.
3. Deals registry links to detail; App route `deals/:dealId`.
4. Entitlement presentation: `permissionsFromDeal`.

---

## Behaviour matrix

| Action | Path | SSOT |
|--------|------|------|
| Create Opportunity | WP → `POST /api/partner/opportunities` → Registry | Enterprise Opportunity |
| View Opportunity | Ownership + entitlements | Registry `sourceWealthPartnerId` |
| Edit Opportunity | Entitlement `edit` → Registry update | Registry |
| Submit / stage | Entitlement `stage_change` → lifecycle | Registry stages |
| List / view Deal | Owned deals only | Enterprise Deal |
| Edit Deal | Entitlement `edit` + `rowVersion` | Enterprise Deal |
| Stage change | Entitlement `stage_change` + C1 rules | `grossStage` = LenderCaseStage |
| Activity | Entitlement `activity_add` | Enterprise Business Notes |
| Unauthorized / cross-partner | Gateway `403` | Ownership assert |

---

## Verification (development)

```bash
# Catalyst One
npm run verify:co-wp-int-001

# Wealth Partner App
npm run verify:co-wp-int-001
npm run build
```

BAT checklist (manual / staging when authorized):

- [ ] Create Opportunity → reload → same id in C1 Opportunity Registry
- [ ] Edit → reload → Registry reflects change
- [ ] Create Deal **not** available in Partner App (lender ID in C1 only)
- [ ] View Deal (when exists) → stage change → activity → reload shows C1 state
- [ ] Unauthorized action → 403
- [ ] Cross-partner access → 403

---

## Manual / ops

- Requires `ENTERPRISE_PERSISTENCE_MODE=prisma` for durable Registry + Notes.
- No new migration in this sprint (uses ACCESS-001 ownership + existing Deal/Opportunity schema).
- **Do not deploy** until Product Owner authorizes.

---

## Final status

🟡 **Development complete · Not deployed · Ready for BAT when environment available**
