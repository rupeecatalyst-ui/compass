# CO-CHANAKYA-007 — Live Enterprise Intelligence Only

**Status:** Implementation Complete — Ready for Business Acceptance Testing  
**Date:** 2026-07-30  
**Production Data Protection:** Read-path only — no deletes, resets, or mutations of live business data

---

## Objective

CHANAKYA must advise only from the current Enterprise System of Record. Deleted deals/documents, demo seeds, cached local fallbacks, and stale AI/mock context must never influence operational advice.

---

## Root cause (pre-fix)

| Surface | Contamination |
|---|---|
| Live Intelligence Bar | Sync `loadRadarDealFilesSync()` before Deal hydrate → `local_fallback` / stale LoanFile / demo ids |
| Active filter | Only `!archived && stage !== won` — no demo/fixture / soft-delete markers |
| Opportunity ticker | Reused Deal Radar rows as “opportunities” |
| Documents ticker | LoanFile checklist only; ignored Document Registry deleted filter |
| Briefing dashboard | `MOCK_PRIORITY_ITEMS` / hardcoded dashboard KPIs |
| Intelligence service | Always `ChanakyaMockIntelligenceService` |
| Workspace resolve | `my_deals` unreachable (matched as `loan_files` first) |

---

## Implementation (read-path)

1. **`live-ssot.ts`** — `filterLiveActiveLoanFiles`, demo/fixture identity rejection, `resolveLiveDealPortfolio` trust gate (suppress `local_fallback` when Deal Registry operational), Opportunity Registry hydrate + planning-active filter, entity scoping helpers.
2. **`radar-deal-source.ts`** — Active list delegates to live-active filter.
3. **`build-messages.ts`** — Trust gate + honest empty copy; Opportunity messages from Opportunity Registry; Document messages prefer Document Registry (`status === "active"`).
4. **`bar.tsx`** — Hydrates Deal + Opportunity registries; subscribes to Deal DAL / opportunity sync (not raw LoanFile-only).
5. **`resolve-workspace.ts`** — Correct `my_deals` / `MY_OPPORTUNITIES` mapping; entity id from `/deals/:id` + query.
6. **`derive-briefing.ts`** — Rewritten onto EBI + ETE + ECM (no mock-data).
7. **`chanakya.service.ts`** — `ChanakyaLiveIntelligenceService` default when demo seeds off; mock only when `isDemoSeedEnabled()`.
8. **`ebi/snapshot.ts`** — Applies the same live trust gate so Mission Control / loading signals stay consistent.

---

## Validation

```bash
npm run verify:co-chanakya-007
```

Expected BAT checks:

- [ ] Deleted deals never appear in CHANAKYA ticker / briefing
- [ ] Deleted documents never appear (registry `deleted` excluded)
- [ ] Demo / `lf-00x` seed identities never appear when demo seeds off
- [ ] Dashboard / Mission Control counters match live Deal Registry after hydrate
- [ ] Opportunity workspace ticker cites Opportunity Registry counts only
- [ ] Deal workspace ticker scopes to open Deal when `/deals/:id`
- [ ] Empty live book → clear “No relevant live enterprise information…” copy

---

## Manual / ops

None. No migration. No env required beyond existing Enterprise Deal Registry / prisma operational flags.

---

## Certification

Not Product Owner certified until live BAT on the review deployment.

**Final engineering status:** Ready for Business Certification (pending PO BAT)
