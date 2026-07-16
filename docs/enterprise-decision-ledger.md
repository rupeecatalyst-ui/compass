# Enterprise Decision Ledger (EDL)

Constitutional memory of Catalyst One. Append-only. Not an audit log.

## Phase 1

- Engine APIs under `src/lib/enterprise-decision-ledger/`
- In-memory ports (Prisma later via `configureEdlPorts`)
- Commercial versioning with `resolveCommercialVersionForDate`
- Emitters: ECG, Product Library, Credit Risk policies, EPDE policies
- Admin browser: `/admin/enterprise-decision-ledger`
- Chanakya: `resolveChanakyaEdlExplanation` — explains, never invents

## Principles

Facts immutable · History never rewritten · Rules & commercials versioned · Historical calculations stay correct.
