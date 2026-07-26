# CO-REL-001 — Commit Strategy (RC-1)

**Branch:** `compass-hl03-conversation-first`  
**Release candidate tag (after commits):** `v1.0.0-rc1`  
**Constraint:** Hygiene + history only — no functional product changes in this sprint.

---

## Phase 1 hygiene completed

| Action | Result |
|--------|--------|
| Remove `status.txt` | Deleted (scratch) |
| Remove one-off patch/apply/fix/replace/verify-dc scripts + fragments | Deleted (13 files) |
| Secrets in docs | Idle flag matrix = boolean flags only (safe). Frozen cert identity strings in architecture docs are certification convention (not live production secrets). No `.env` / `.env.local` in tree. |
| Certification PNGs | Retained as evidence for RC milestone |
| Layout HTML fixture | Retained under `scripts/fixtures/` |

---

## Recommended milestone commits (order)

1. **Enterprise Deal Registry (CO-ARCH-002)** — schema/migrations, deal DAL/API, deal workspace, cutover helpers  
2. **Enterprise master registries (CO-ARCH-001 / 004 / 005)** — reference / product / document / lender registries + admin  
3. **Enterprise Opportunity Registry & session (CO-ARCH-003)** — opportunity APIs, sync, identity  
4. **Platform operations & governance (CO-OPS-002 / CO-GOV-001 / CO-CERT-005 / CO-STAB)** — ops lib, governance, cert scripts  
5. **Business capabilities (CO-BIZ-001 / 003 / 004)** — ETE extensions, EBI, ECE portal  
6. **Navigation, journey & Loan Board retirement** — My Deals / My Opportunities / journey chrome / deletions  
7. **Auth & organization onboarding** — invite / register / password UX  
8. **Workspace & commercial surfaces** — accounting/payee, document center, credit/ERW extras  
9. **Documentation, ADRs, PMO, certification evidence**  
10. **Tooling & package scripts** — `package.json` / lockfile / `next.config` / `.env.example` / `.gitignore` (last so scripts land with features)

Where path overlap is unavoidable (`package.json`, shared navigation), files land in the **latest** logical commit that depends on them, or tooling commit last.

---

## Tag

```bash
git tag -a v1.0.0-rc1 -m "Catalyst One Release Candidate 1"
```

Create only after commits complete and certification passes.
