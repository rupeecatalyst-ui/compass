# CO-COMPASS Advantage — Configurable Commercial Rule Engine

Status: **Local implementation complete** · Awaiting Product Owner review  
Hostinger production freeze: **unchanged** (CO-CHANAKYA-RELEASE-FREEZE-015)  
`COMPASS_ADVANTAGE_COMMERCIAL_ENABLED` was **not** enabled.  
No Hostinger deploy, no production migrate, no `prisma db push`, no rupeecatalyst.com replacement.

## Architecture

Catalyst One is the sole commercial authority. COMPASS sends requested loan amount and product context, receives an authoritative DTO, and renders it.

```
COMPASS journey
  → pin schedule at Opportunity createdAt (case received)
  → analyze / generate
  → Catalyst One schedule engine (exact decimal)
  → immutable Advantage snapshot (insert-only)
  → CompassAdvantageDto
COMPASS displays DTO only. No local formula, range, percentage, cap, or fallback.
```

Published schedules are immutable. Changes require a new Draft → preview → publish with effective-from. One published version is effective per product per timestamp. Later configuration cannot change a pinned Opportunity.

## Data model

Additive Prisma models (migration `20260831180000_co_compass_advantage_commercial_engine`):

| Table | Role |
|---|---|
| `compass_advantage_schedules` | Versioned product configuration (draft / published / suspended / retired) |
| `compass_advantage_ranges` | Inclusive-from / exclusive-to ranges, percentage rate, active flag |
| `compass_advantage_fixed_benefits` | 0..n fixed components per range |
| `compass_advantage_snapshots` | Insert-only customer Advantage record |
| `compass_advantage_audits` | Immutable configuration / preview / publish audit |

Decimal columns store rates and rupees. Calculation uses BigInt exact decimal, `ROUND_HALF_UP` to whole rupees. IEEE floating-point is not used.

## Catalyst One screen

Super Admin only (`organization/layout.tsx` + API `SUPER_ADMIN` guard):

**Settings → Organization → Product Configuration → COMPASS Advantage Rules**

- Route: `/organization/product-configuration/compass-advantage`
- One product at a time
- Advantage Active, published version, effective-from, status
- Create new version, copy from another product, range table, fixed benefits, preview, version history
- Preview does not create Contact, Opportunity, journey, document, or a customer offer snapshot (admin audit only)

Home Loan and Home Loan Balance Transfer are independent product codes (`HOME_LOAN`, `HOME_LOAN_BT`).

## Files changed

Engine, persistence, admin, gateway, COMPASS render-only, verifiers, additive migration. The retired 50 bps / ₹10,000 min / ₹2,50,000 max source-only formula in `compute.ts` was deleted and must not remain as a fallback.

## Migration details

- Path: `prisma/migrations/20260831180000_co_compass_advantage_commercial_engine/migration.sql`
- Additive `CREATE TYPE` + `CREATE TABLE` + indexes + FKs only
- **Not applied** to Hostinger or any production database
- Local seed (optional, never production): `scripts/co-compass-advantage-seed-local.mjs`
- If tables are missing at runtime, the engine returns `not_available` / `product_not_applicable` and does not block journey start

## Verification

| Gate | Result |
|---|---|
| `scripts/co-compass-advantage-commercial-verify.mjs` | PASS |
| `scripts/co-compass-advantage-boundary-verify.mjs` | PASS |
| `scripts/co-compass-customer-gateway-verify.mjs` | PASS |
| `tsc --noEmit` (8 GB heap) | PASS |
| Next production `npm run build` | **Not run** — build script invokes migrate-on-build |

### Calculation evidence (HOME_LOAN and HOME_LOAN_BT independently)

| Requested amount | Advantage |
|---|---|
| ₹50 lakh | ₹15,000 |
| ₹1 crore | ₹30,000 |
| ₹1.5 crore | ₹45,000 |
| ₹1,99,99,999 | ₹60,000 (percentage only; 59,999.997 → rupee HALF_UP) |
| ₹2 crore | ₹85,000 (Range 2: 0.30% + ₹15,000 + ₹10,000) |
| ₹2.5 crore | ₹1,00,000 |
| ₹5 crore | ₹1,75,000 |
| ₹10 crore | ₹3,25,000 |

Also verified: exactly ₹2 crore matches Range 2 only; below ₹2 crore has no fixed benefits; inactive product / inactive range / uncovered amount produce no Advantage; draft versions are ignored; overlapping active ranges cannot publish; gaps are allowed and shown; a new published version applies only after its effective timestamp; old pins keep the previous version; generated snapshots are not recalculated; other products return `product_not_applicable`; missing HL/HLBT configuration returns `not_available`; COMPASS source has no hardcoded commercial calculation.

## Version-pinning

Case received = Opportunity `createdAt`. `snapshot.compassAdvantagePin` stores schedule id, version, and `noScheduleAtCreate`. Reuse of a draft does not replace an existing pin. A case received with no effective schedule never becomes eligible when a later version is published.

## Immutability

- Published schedules cannot be saved in place (`PUBLISHED_IMMUTABLE`)
- Customer snapshots are insert-only (`opportunityId` unique)
- Analyze returns the existing snapshot if present
- No unrestricted override / undo in this scope

## COMPASS

COMPASS maps and displays the DTO. The calculator, amount, and review wallet render only when the DTO is `ready` with a positive amount. Zero is never shown as an Advantage. COMPASS does not recompute, cap, or invent ranges.

## Controlled deployment sequence (do not execute until PO approves)

1. Product Owner review of this report
2. Isolated-database migrate of `20260831180000_co_compass_advantage_commercial_engine` only
3. Local seed of approved HOME_LOAN + HOME_LOAN_BT v1
4. Super Admin BAT of configuration, preview, publish, pin, snapshot
5. Separate explicit approval for Catalyst One deploy
6. Separate explicit approval for production migrate
7. Separate explicit approval before any COMPASS commercial display cutover
8. Do not set `COMPASS_ADVANTAGE_COMMERCIAL_ENABLED` (published schedule is the gate; the old env flag is retired as a calculation switch)
9. Do not replace rupeecatalyst.com in this sequence unless separately authorised

## Remaining Product Owner decisions

1. Approve isolated-database migrate and local seed
2. Confirm rupee rounding of non-integer percentage results (₹1,99,99,999 → ₹60,000 HALF_UP)
3. Confirm whether Super Admin only is sufficient, or a named Product Owner role must be added
4. Authorise Hostinger migrate / C1 deploy / COMPASS display cutover as separate steps
5. Whether exceptional correction of a generated snapshot is ever allowed (out of this scope)
6. Whether non-HL products should ever expose a COMPASS Advantage journey step after an admin publishes a schedule

**STOP.** Awaiting Product Owner review. No production action taken.
