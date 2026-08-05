# CO-BUG-LSC-LOOKUP — Lender Sales Contact Registry Lookup

**Status:** Implementation Complete · Ready for BAT  
**Priority:** CRITICAL  
**CO-ARCH-002:** Lookup/binding only — no contact recreate / data reset · **no dummy data**

---

## Root cause (current)

1. UI gated on full ECM hydrate → stuck “Searching…”
2. Lender display name used as API text search (API does not match institution)
3. Live path previously merged memory-only banker cache
4. Product soft-rank required (not hard exclude)
5. Institution not always persisted on Deal for reload display

---

## Fix

| Area | Change |
|------|--------|
| Live pool | `liveListAllEcmContactsByRole("lender_employee")` — paginated ECM REST |
| Type-ahead | Parallel name/mobile/email live search as user types |
| Match | Institution UUID / code / label aliases + fuzzy short name |
| Product | Soft rank via `contactProductPriority` — peers still listed |
| Persist | `contactId` · name · designation · institutionId/Label · mobile · email |
| UX | Focus refresh · 120ms debounce · 12s timeout · no hydrate gate |

---

## SSOT confirmation

Lookup resolves from the **live Enterprise Contact Registry** only. No dummy contacts, no hardcoded results, no memory-only result set on the live search path.

Full RCA: `docs/co-bug-lsc-lookup/CO-BUG-LSC-LOOKUP-RCA.md`

---

## Verify

```bash
npm run verify:co-bug-lsc-lookup
```
