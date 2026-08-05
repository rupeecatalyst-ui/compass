# CO-WP-BAT-004 — Opportunity Workspace Resolution

Status: **DEPLOYED** · Await Product Owner BAT  
Priority: **CRITICAL**  
Deploy record: `docs/co-wp-bat/CO-WP-BAT-004-DEPLOYED.md`

## Root Cause

**Vercel serverless in-memory placeholder store.**

Partner Business opportunities lived in a module-level `Map` (`partner-business.service.ts`). On Vercel:

1. Business Pipeline / Customer Workspace list hydrated one serverless isolate and returned opportunity IDs.
2. Opening Opportunity Workspace called `GET /api/partner/opportunities/:id` on a **different cold isolate**.
3. That isolate had an empty Map (or missing created rows) → `NOT_FOUND` → UI showed **"Opportunity not found"**.

Not a React route-param bug. Navigation deep links (`/app/opportunities/:opportunityId`) were correct.

## Fix Applied

### Catalyst One
- Persist placeholder store under Wealth Partner `profileJson.partnerBusinessPlaceholder`
- Hydrate on every `ensureStore` (memory + Prisma + deterministic seeds)
- Reconstruct seed opportunities on miss (`tryReconstructSeedOpportunity`)
- Persist after list pipeline/hub touch and after create / patch / submit / upload
- Decode opportunity IDs in API route

### Wealth Partner App
- Premium `OpportunityRecoveryScreen` (Return to My Business · Search · Retry)
- `not_found` load state — never bare "Opportunity not found" card only

## Live (post PO approval)

- WP: https://wealth-partner-app.vercel.app · `0.9.1` · `dpl_7dqF3G6LAwid8pLqJZ8xTAVeGy1c`
- C1: https://catalyst-one-two.vercel.app · `dpl_BVfT8N4ZBK5jDw74qLi7rMFQfrqg`

## Stop

No further feature development. Await Product Owner BAT.
