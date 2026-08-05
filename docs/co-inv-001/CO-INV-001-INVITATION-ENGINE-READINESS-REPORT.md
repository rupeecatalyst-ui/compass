# CO-INV-001 — Enterprise Invitation Engine (Wealth Partner Activation Phase 1)

**User request label:** CO-WP-002 Wealth Partner Activation Engine  
**Implementation sprint ID:** **CO-INV-001** (reusable engine; avoids collision with existing CO-WP-002 creation-remediation docs)

**Status:** Implementation Complete · Ready for BAT  
**Date:** 2026-07-31  

---

## 1. Implementation Summary

Reusable **Enterprise Invitation Engine** with Wealth Partner as the first invitee adapter.

From Wealth Partner Workspace → Overview → **Partner Activation**:

- Generate Activation Link  
- Send / Resend Invitation  
- Copy Activation Link  
- Cancel Invitation (before activation)  
- Prominent invitation status + audit trail  

Public landing: `/activate/[token]` → password · Terms · profile → activate → redirect to Catalyst Connect.

---

## 2. Invitation Engine Components

| Layer | Path |
|---|---|
| Types | `src/types/enterprise-invitation-engine.ts` |
| Constants | `src/constants/enterprise-invitation-engine/` |
| Security / email template | `src/lib/enterprise-invitation-engine/` |
| Communication sender resolve | `src/lib/enterprise-communication/resolve-sender.ts` |
| Prisma | `EnterpriseInvitation`, `EnterpriseInvitationAudit`, `EnterpriseCommunicationConfig` |
| Service | `server/services/invitation-engine/` |
| WP adapter | `wealth-partner-adapter.ts` |
| APIs | `/api/enterprise-invitations`, `/api/activate/[token]`, `/api/admin/enterprise-communication/sender` |
| UI | Activation panel + public activate form |

Future invitee kinds (employees, customers, lender users, channel / referral partners) register adapters — **no Wealth Partner-specific logic in the engine core**.

---

## 3. Email Configuration

| Source order | Description |
|---|---|
| 1. Org `EnterpriseCommunicationConfig` | Admin-editable via PATCH API |
| 2. Env | `ENTERPRISE_TRANSACTIONAL_FROM_EMAIL` / `_FROM_NAME` |
| 3. Configuration seed | `ENTERPRISE_COMMUNICATION_SENDER_SEED` |

Seed defaults (configuration data, not UI hardcoding):

- Display Name: **Rupee Catalyst**  
- Sender: **champion@rupeecatalyst.com**  

Phase 1 delivery is **simulated** via ENCE (external SMTP still disabled platform-wide). Invitation status still advances to **Invite Sent** with audit `from champion@… (simulated)` once seed/config resolves.

---

## 4. Activation Flow

1. Operator generates / sends invite from WP Workspace  
2. Secure `einvtok_…` token · TTL default 7 days · single-use  
3. Regeneration **cancels** previous active invite  
4. Partner opens `/activate/[token]`  
5. Create password · accept Terms · complete profile  
6. User provisioned or existing email reused (**no duplicate identity**)  
7. WP lifecycle → `active` · contact linked when present  
8. Redirect → `NEXT_PUBLIC_CATALYST_CONNECT_URL` or `/login?portal=catalyst-connect`

---

## 5. Audit Integration

`EnterpriseInvitationAudit` events: `link_generated` · `invite_sent` · `resent` · `activated` · `cancelled` · `expired`  
Each row: actor label · user id · timestamp · detail.

---

## 6. Validation Results

- `npm run verify:co-inv-001`  
- Manual BAT requires: migration applied + `ENTERPRISE_PERSISTENCE_MODE=prisma`

---

## 7. Screenshots

BAT on production:

1. WP Overview — Partner Activation panel + status badge  
2. Generate / Send / Copy link  
3. Public `/activate/[token]` form  
4. Audit list after send  

---

## 8. Business Acceptance Checklist

- [ ] Activation link generated  
- [ ] Invitation marked Invite Sent (sender = configured `champion@…` via Communication config)  
- [ ] Link expires correctly  
- [ ] Regeneration invalidates previous link  
- [ ] Activation succeeds (password + terms + profile)  
- [ ] Redirect to Catalyst Connect target  
- [ ] Audit trail visible  
- [ ] No duplicate partner / user identities for same email  

### Manual steps required

1. Apply migration `20260731180000_co_inv_001_enterprise_invitation_engine`  
2. Set `NEXT_PUBLIC_CATALYST_CONNECT_URL` when Connect URL is known  
3. Optional: set `ENTERPRISE_TRANSACTIONAL_FROM_*` or PATCH communication sender  
4. When ENCE live delivery is enabled in a future sprint, wire SMTP provider behind the same sender config  
