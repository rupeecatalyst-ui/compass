# CO-ARCH-002 — Enterprise Context & Session Layer

**Status:** Implemented · Verify PASS · Deployed  
**Date:** 2026-07-25  

## 1. Architecture summary

Enterprise Registries remain the only SSOT.  
`src/lib/enterprise-session/` is a **runtime consumer**:

| Capability | Module |
|------------|--------|
| Opportunity Read / Write / Invalidate / single-flight | `opportunity-runtime-cache.ts` |
| Published lenders session TTL + single-flight | `published-lenders-session.ts` |
| Active session snapshot | `session-context.ts` |

`enterpriseOpportunityApiClient.getOpportunity` is **cache-first** (optional `forceRefresh`).  
Parallel gate + provider share one in-flight network GET.  
Select / Move to Deal / Deal create pass or peek the session Opportunity → **zero re-GETs** when warm.

## 2. Files modified / added

**Added**
- `src/lib/enterprise-session/*`
- `scripts/co-arch-002-session-layer-verify.mjs`
- this report

**Modified**
- `opportunity-api-client.ts`
- `published-directory.ts`
- `ensure-loan-workspace.ts`
- `deal-data-access.ts`
- `move-to-deal.ts`
- `opportunity-context.ts`
- `workspace-life-strategy-board.tsx`
- `opportunity-workspace.tsx` (Move to Deal passes session Opportunity)

## 3. Before vs After API counts (Opportunity GET)

| Step | Before | After (warm session) |
|------|-------:|---------------------:|
| Cold open (first stage) | 2 (gate∥provider) | **1** (single-flight) |
| Next stage navigation | +2 each | **0** (cache) |
| Document Requests remount | +1 | **0** |
| Manual Select | +0–2 | **0** |
| Move to Deal | +1 | **0** |
| Full first journey | ~10 | **1** cold + **0** warm actions |

## 4. Page load timings

Absolute ms require live HAR (Phase 0 of CO-PERF). Architectural expectation: remove ~9 Opportunity RTTs (~1.5–3 s) from a full journey on typical prod latency.

## 5. Confirmation — workflows consume Session Context

✓ Provider binds session on Registry success  
✓ Select passes `registryOpportunity`  
✓ Move to Deal passes / peeks session Opportunity  
✓ `createDealAsync` accepts `opportunity`  
✓ Chanakya sync published list prefers warm session lender snapshot  

## 6. Confirmation — Registries remain sole SSOT

✓ Session cache is invalidated on update/delete/convert and lender-registry-updated  
✓ No duplicate registry stores  
✓ Network refresh only via `forceRefresh` or cold miss  

## Targets met

| Target | Status |
|--------|--------|
| Cold open → one Registry GET | ✅ (single-flight) |
| Warm nav / Select / Move to Deal → zero Opportunity GETs | ✅ |
| Published lenders loaded once per TTL session | ✅ |
| No “Opportunity not found” from repeated validation when session warm | ✅ |
