# CO-ORG-007 — Remaining Gaps (Navigation)

**Date:** 2026-08-07  
**Navigation Certification grade:** 🟡 **PARTIAL**

## Blocking for full Navigation PASS

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| Investments primary entry is **Soon** / Coming soon | **HIGH** (product policy) | Keep intentional with badge **or** remove from primary until product line ships |
| Mission Control rail lists multiple **enabled scaffold** modules | **HIGH** | Hide scaffolds from rail (`featureFlag` / status) **or** finish modules before claiming MC nav certified |
| ADMIN can open Admin Console Organization tiles but `/organization/*` is SUPER_ADMIN-only | **HIGH** | Align: allow ADMIN on Org layout **or** hide Org tiles from ADMIN in console |
| Command palette admin/org groups SUPER_ADMIN-only while sidebar Administration includes ADMIN | **MEDIUM** | Align command palette roles with sidebar + `/admin` layout |

## Non-blocking / hygiene

| Gap | Severity | Notes |
|-----|----------|--------|
| `administrationChildren` vs Administration Console tile drift | LOW | Console is operational SSOT; children list is command-palette legacy — document or sync |
| Settings Preferences / Notifications stub copy | LOW | Anchors resolve; content incomplete |
| Journey orphans (Credit Bench, Dialogue, SARATHI, etc.) | INFO | Expected — reachable via journey / palette, not primary nav |
| Accounting route live but commercial SSOT unbound | INFO | Navigation OK; business SSOT is CO-ORG-006 / Accounting programme |

## Explicitly not dead navigation

- `/pipeline`, `/documents`, `/loan-files`, `/ai-assistant`, `/deals` → intentional redirects  
- Settings `href: "#"` folder → context panel pattern (Architecture Freeze)  
- Planned MC modules with `preview`/`disabled` flags — not shown in enabled rail  

## No deployment

Gaps are certification findings only. No production code change required for this report sprint unless PO authorises remediation.
