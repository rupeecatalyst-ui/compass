# CO-GOV-001 — Compliance Readiness Notes

Companion to the Governance Readiness Report. No policy legal advice — engineering readiness only.

## Audit completeness

- Business actions on wired APIs emit ops audits (CO-OPS-002) and governance entity history.
- Important Deal fields emit field-level Old/New/Changed By/Changed At/Reason.
- Administrative role/permission/feature-flag changes emit EDL entries.

## Data retention

| Store | Durability | Retention note |
|-------|------------|----------------|
| Governance rings | Process-local | Export regularly via governance export API |
| Ops rings | Process-local | Same |
| EDL (Phase 1) | In-memory ports | Prisma adapter recommended |
| Soft-delete audits | Prisma | Durable |
| Registry audits | Prisma | Durable |
| Deal timeline | Prisma | Durable |

## User accountability

Actor user IDs recorded on governance events, ops audits, and EDL. Correlation IDs link API failures to audits.

## Administrative traceability

EDL categories `user_role_changes`, `permission_changes`, `enterprise_engine_configuration` plus existing policy/product/ECG emitters.

## Export

CSV (UTF-8 BOM) for Excel: audit trail, change history, user activity, administrative changes, field audit, full pack.
