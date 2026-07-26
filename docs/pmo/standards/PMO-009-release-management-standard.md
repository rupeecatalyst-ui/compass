# PMO-009 — Release Management Standard

**Document ID:** PMO-009  
**Status:** APPROVED  
**Owner:** Release Management Office

---

## 1. Environments

| Environment | Purpose | Authority |
|-------------|---------|-----------|
| **Local** | Developer verification | Developer |
| **Vercel Preview** | Continuous review | Release (automated) |
| **Vercel Production** | Business certification target | Release + Quality |
| **Supabase PostgreSQL** | Persistence | Infrastructure + Release |

Production URL (current): `https://catalyst-one-two.vercel.app`

---

## 2. Deployment Policy

Per `.cursor/rules/github-vercel-deployment-policy.mdc`:

- Deploy to Vercel after approved implementation (review platform)
- Git commit at milestone / end-of-day—not every UI tweak
- GitHub and Vercel workflows remain independent

---

## 3. Release Requirements

Before production release claim:

- [ ] Classified as `REL` or part of certified program close-out
- [ ] Build passed
- [ ] Manual ops steps documented (migrations, env vars)
- [ ] Rollback path identified
- [ ] Release notes drafted (`docs/releases/`)
- [ ] Quality sign-off if certification scope

---

## 4. Version Management

| Type | Pattern | Location |
|------|---------|----------|
| Internal release | `vX.Y.Z-internal` | `docs/releases/` |
| Governance milestone | Program ID completion | Program Backlog Register |

Semantic versioning for customer-facing releases (future).

---

## 5. Rollback

1. Identify last known-good Vercel deployment  
2. Document in Change Register  
3. Notify ESC if certification-affecting  
4. Quality re-verification if data migration involved  

---

## 6. Related Documents

- **CO-GOV-001 — Catalyst One Release Governance Framework** (`docs/governance/CO-GOV-001-RELEASE-GOVERNANCE-FRAMEWORK.md`) — **primary release lifecycle SOP**
- PMO-005 Change Control Policy  
- PMO-008 Certification Governance Standard  
- `docs/deployment.md`  
- `docs/ops/CO-OPS-001-BUILD-INFORMATION.md`  
- `.cursor/rules/github-vercel-deployment-policy.mdc`
