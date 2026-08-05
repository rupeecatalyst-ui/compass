# CO-ECC-001 — Enterprise Communication Center & Communication Profiles

**Status:** Implementation Complete · Ready for BAT  
**Date:** 2026-07-31  

---

## 1. Communication Center Architecture

```
Module emits communication event
        ↓
ECC event → profile mapping (SSOT)
        ↓
Enterprise Communication Profile (DB / seed)
        ↓
Resolved identity (displayName, senderEmail, replyTo, signature, …)
        ↓
Email template / ENCE dispatch
```

**Rule:** Modules never choose a raw From address. They specify an **event type** (or, rarely, a profile code). ECC resolves the sender.

| Layer | Path |
|---|---|
| Types | `src/types/enterprise-communication-center.ts` |
| Profile seeds | `src/constants/enterprise-communication-center/profiles.ts` |
| Event map | `src/constants/enterprise-communication-center/events.ts` |
| Resolve helpers | `src/lib/enterprise-communication-center/` |
| Prisma | `EnterpriseCommunicationProfile` |
| Service | `server/services/enterprise-communication-center/ecc.service.ts` |
| Admin UI | `/admin/enterprise-communication` |

---

## 2. Communication Profiles Created

| Profile | Display Name | Sender (seed) | Used for |
|---|---|---|---|
| **CHANNEL_PARTNERS** | Rupee Catalyst Champion | champion@rupeecatalyst.com | WP invite/activation, channel/referral partners, announcements |
| **CUSTOMERS** | Rupee Catalyst Connect | connect@rupeecatalyst.com | Customer invite/notify, loan status, document requests |

Seed values are **configuration data**. Admins change them in Communication Center — not in application modules.

---

## 3. Event Mapping

| Event | Profile |
|---|---|
| wealth_partner_invitation | CHANNEL_PARTNERS |
| wealth_partner_activation | CHANNEL_PARTNERS |
| channel_partner_communication | CHANNEL_PARTNERS |
| referral_partner_communication | CHANNEL_PARTNERS |
| partner_announcement | CHANNEL_PARTNERS |
| customer_invitation | CUSTOMERS |
| customer_notification | CUSTOMERS |
| loan_status_update | CUSTOMERS |
| document_request | CUSTOMERS |
| customer_communication | CUSTOMERS |

Example: Wealth Partner Invite → CHANNEL_PARTNERS → configured Champion sender.

---

## 4. Admin Configuration

Screen: **Administration → Enterprise Communication Center**

Editable per profile:

- Display Name · Sender Email · Reply-To  
- SMTP Provider · Host · Port · Username · Password/API key  
- Signature · Footer · Logo URL  
- Active / Inactive  
- Event mapping (read-only view for mapped events)

APIs:

- `GET/POST /api/admin/enterprise-communication/profiles`  
- `PATCH /api/admin/enterprise-communication/profiles/[profileCode]`

---

## 5. Email Template Integration

| Template / flow | Binding |
|---|---|
| Invitation activation (`enterprise_invitation_activation`) | event `wealth_partner_invitation` → CHANNEL_PARTNERS |
| Document request email body | `DOCUMENT_REQUEST_COMMUNICATION_REF` → CUSTOMERS (signature/footer from profile seed / DB) |

Invitation engine `sendInvitation` calls `resolveIdentity({ eventType: "wealth_partner_invitation" })`.

---

## 6. Validation Results

- `npm run verify:co-ecc-001`

---

## 7. Business Acceptance Checklist

- [ ] CHANNEL_PARTNERS + CUSTOMERS profiles visible in admin  
- [ ] Sender / display name / reply-to editable  
- [ ] SMTP fields save without exposing password on reload  
- [ ] WP invitation uses CHANNEL_PARTNERS identity  
- [ ] Document request template references CUSTOMERS profile  
- [ ] No module hardcodes From email  
- [ ] Event mapping table matches approved matrix  

### Manual steps

1. Apply migration `20260731190000_co_ecc_001_communication_profiles`  
2. Ensure `ENTERPRISE_PERSISTENCE_MODE=prisma`  
3. Open `/admin/enterprise-communication` and confirm seeded profiles  
