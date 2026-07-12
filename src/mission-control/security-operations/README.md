# Security Operations Center (SOC)

Executive security workspace inside Mission Control.

**Not** an admin settings page. **Not** live auth / MFA / audit execution.

## Route

`/mission-control/security-operations`

## Layout

Security Summary · Security Health · Domain Grid · Threat Timeline · Identity · Sessions · Compliance · Alerts · Quick Actions

## Domains

Identity · Authentication · Authorization · MFA · Sessions · Permissions · Break Glass · Audit · Compliance · Threat Detection

## Providers (placeholders)

SecurityProvider · ThreatProvider · ComplianceProvider · IdentityProvider

SOC providers project from the Enterprise Security Framework (`shared/enterprise-security-framework`).

## Future TODOs

- [ ] Bind identity / session signals to live providers
- [ ] Wire Alert Framework projections into SOC alerts
- [ ] Permission-aware break-glass readiness views
- [ ] Audit trail deep-links (no execution here)
- [ ] Auth / MFA / authorization engines (explicitly deferred)
