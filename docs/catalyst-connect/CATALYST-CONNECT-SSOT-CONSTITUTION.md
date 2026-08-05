# Catalyst Connect — Product Owner Directives (Constitution)

**Status:** FROZEN · Product Owner Direction  
**Surfaces:** Wealth Partner App (Catalyst Connect) · Catalyst One (SSOT)

## Final Product Principle

Catalyst Connect must never duplicate business logic, customer onboarding flows, product configuration or document rules. It is a simplified presentation layer that inherits all product definitions, validations, recommendations and document requirements directly from Catalyst One. The only difference between the two platforms is permissions—not process.

## Directives

1. **SSOT** — Dynamic consumption of Catalyst One configuration for every product / borrower category.
2. **No independent fields** — No hardcoded Connect-only fields.
3. **Journey synchronization** — Identical acquisition journey until Opportunity creation; internal modules stay in Catalyst One.
4. **Document upload** — Catalyst One LOD only; simple Upload + status.
5. **Automatic Source Attribution (Frozen)** — Never editable; never shown; stamped from authenticated Wealth Partner.
6. **System-derived information** — Partner never re-enters platform-known identity / org / commercial context.
7. **Digital Visiting Card** — Primary header Card icon beside Profile; content from Catalyst One.
8. **Enterprise design** — Connect = acquisition UI; One = enterprise OS.

## Implementation rule

`.cursor/rules/catalyst-connect-ssot-constitution.mdc`
