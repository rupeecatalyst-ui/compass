# Catalyst One — Operations Backlog

Living register of non-blocking operations / environment follow-ups.  
These items do **not** reopen certified sprints unless Product Owner elevates them.

---

## Open

### 102A-OPS-01 — Partner JWT mint BAT vs production secret parity

| Field | Value |
|-------|--------|
| **ID** | `102A-OPS-01` |
| **Source** | CO-WP-102A Zero-Trust / Business Acceptance Audit |
| **Opened** | 2026-07-31 |
| **Severity** | Medium (operations / BAT completeness) |
| **Sprint impact** | **None** — Product Owner accepted option **(a)** 2026-07-31; **not** an architectural or CO-WP-102 blocker |
| **Status** | Open — Operations backlog |

**Observation**

Live edge positive-path JWT mint tests against production (`VALID_PARTNER_ME`, UUID spoof → 403, refresh cycle, unmapped → 403) return **401 INVALID_TOKEN** when tokens are signed with the workstation `.env.local` `JWT_SECRET` / `JWT_REFRESH_SECRET`, because those secrets differ from Vercel production.

Fail-closed behaviour (no data leakage) was confirmed. In-process certification against the enterprise database (**11/11 PASS**) validated Zero-Trust binding, ownership, refresh/logout, and employee↔partner segregation.

**Does not invalidate**

- Zero-Trust architecture  
- Partner UUID binding  
- Ownership enforcement  
- Session architecture  
- Prototype retirement  
- Enterprise Companion / presentation-only model  
- Employee vs Partner API security segregation  

**Recommended future work (ops)**

1. Document a controlled BAT procedure that uses a **Partner login** on production (not workstation mint), **or**  
2. Provide a **read-only / BAT-only** secret-alignment path for mint-based edge validation (never commit secrets), **or**  
3. Add a CI/ops smoke that runs partner login → `/me` → refresh → logout against production with vaulted BAT credentials.

**Related**

- `docs/co-wp-102a/CO-WP-102A-BUSINESS-ACCEPTANCE-ZERO-TRUST-CERTIFICATION.md`  
- `docs/co-wp-102/CO-WP-102-SESSION-SECURITY-FOUNDATION-REPORT.md`  
- Scripts: `scripts/co-wp-102a-inprocess-audit.mjs`, `scripts/co-wp-102a-security-audit.mjs`

---

## Closed

_(none yet)_
