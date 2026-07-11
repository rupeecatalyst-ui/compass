# Enterprise Identity & Access Engine (EIAE) — Architecture

**Sprint:** Catalyst One Sprint 3 + Sprint 3A Hardening (CF-S03-001 / CF-S03A-001)  
**Version:** 3.1.0 (Hardening) / 3.0.0 (Foundation API)  
**Status:** Foundation (metadata-only, in-memory)

---

## Purpose

The Enterprise Identity & Access Engine (EIAE) provides the identity model, authentication policy framework, authorization foundation, organizational access framework, and identity lifecycle governance for Catalyst One.

Three responsibilities remain **completely independent**:

| Concern | Module | Sprint 3 Scope |
|---------|--------|----------------|
| **Identity** | `identity-registry.ts` | Who the user is |
| **Authentication** | `authentication-policy.ts` | How identity is proved (policy metadata only) |
| **Authorization** | `authorization-foundation.ts` | What the user may do (roles/permissions metadata) |

---

## Capabilities Delivered

| # | Capability | Implementation |
|---|------------|----------------|
| 1 | Identity Model | 7 identity types, lifecycle governance, no physical deletion |
| 2 | Persona Registry | 12 configurable personas |
| 3 | Authentication Policies | Hierarchical: Global → BU → Persona → Individual |
| 4 | Authorization Foundation | Roles, permissions, groups, templates |
| 5 | Organizational Access (OSV) | Company → BU → Region → State → City → Branch → Team → Individual |
| 6 | Session Foundation | Session, device, login history, MFA placeholders |
| 7 | Identity Lifecycle | Create, activate, deactivate, suspend, archive — deletion prohibited |
| 8 | Deletion Governance | Recycle bin / restore / permanent purge permission foundation |

---

## Folder Structure

```
src/
├── types/
│   ├── enterprise-identity-access-engine.ts
│   └── enterprise-identity-access-engine-ports.ts
├── constants/
│   ├── enterprise-identity-access-engine/
│   │   ├── identity-types.ts
│   │   ├── personas.ts
│   │   ├── authentication.ts
│   │   ├── authorization.ts
│   │   ├── organizational-access.ts
│   │   ├── defaults.ts
│   │   └── index.ts
│   └── enterprise-identity-access-engine-exports.ts
├── lib/
│   └── enterprise-identity-access-engine/
│       ├── composition.ts
│       ├── repositories/in-memory.ts
│       ├── identity-registry.ts
│       ├── persona-registry.ts
│       ├── authentication-policy.ts
│       ├── authorization-foundation.ts
│       ├── organizational-access.ts
│       ├── session-foundation.ts
│       ├── deletion-governance.ts
│       ├── audit-integration.ts
│       ├── registry-snapshot.ts
│       └── index.ts
└── docs/
    └── enterprise-identity-access-engine.md
```

---

## Integration

| Engine | Integration |
|--------|-------------|
| EAF (Sprint 1) | Audit trail via `appendEafAuditEntry()` |
| EME (Sprint 2) | `metadataSchemaRef` on identity records |

Sprint 1 and Sprint 2 source files are **unmodified**.

---

## Governance Rules

- Identity records are **never physically deleted**
- `deleteEiaeIdentity()` throws by design
- Permanent purge authorized for **Super Admin only** (metadata foundation)
- Archived identities cannot be modified

### Sprint 3A — Enterprise Identity ID Governance

| Rule | Enforcement |
|------|-------------|
| **Enterprise Identity ID** | `EID-{uuid}` assigned once at `createEiaeIdentity()` — never changes |
| **Global uniqueness** | Duplicate `enterpriseIdentityId` registration rejected |
| **Immutability** | Attempts to modify `enterpriseIdentityId` or creation metadata rejected |
| **Lifecycle metadata** | `activatedBy/On`, `deactivatedBy/On` tracked on transitions; complements EAF audit |

---

## What Was NOT Built

- Login screens, OTP delivery, password reset, MFA logic
- Recycle bin UI, delete/restore workflows
- API/mobile authentication, SSO
- Runtime policy enforcement

---

## Sprint 4 Recommendations

1. Authentication runtime (OTP delivery, password verification)
2. Session management service
3. OSV visibility enforcement engine
4. Prisma persistence for `EiaePorts`
5. Register `identity_engine` in EAF engine registry
6. ADR for IAAE vs application auth (Supabase)
