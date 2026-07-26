# Pre-Launch Engineering Policy — Index

**Status:** PRODUCT ARCHITECTURE DIRECTIVE  
**Effective:** Until Catalyst One official production Go-Live (Single Implementation); Constitutional Health Check is permanent  

## Documents

| Artefact | Path |
|----------|------|
| **Enterprise Architecture Baseline Report** | `docs/architecture/ENTERPRISE-ARCHITECTURE-BASELINE-REPORT.md` — **Submitted for Product Architecture Review** |
| Constitutional Health Check (agent-enforced) | `.cursor/rules/constitutional-health-check.mdc` |
| Architecture Impact Report template | `docs/governance/ARCHITECTURE-IMPACT-REPORT-TEMPLATE.md` |
| Single Implementation Rule (agent-enforced) | `.cursor/rules/pre-launch-single-implementation.mdc` |
| Business Capability Ownership | `.cursor/rules/business-capability-ownership.mdc` |
| Replacement Certification template | `docs/governance/REPLACEMENT-CERTIFICATION-TEMPLATE.md` |
| Deal Workspace Identity Assessment (approved) | `docs/co-arch-003/CO-ARCH-DEAL-WORKSPACE-IDENTITY-ASSESSMENT.md` |
| Deal Workspace Identity ADR | `docs/adr/ADR-019-co-arch-004-deal-workspace-identity.md` — **APPROVED · Architecture CERTIFIED · FROZEN** · Implementation **not authorised** by ADR alone |
| **ADR-019 Implementation Programme** | `docs/co-arch-003/CO-ARCH-ADR-019-IMPLEMENTATION-PROGRAMME.md` — **APPROVED · Roadmap CERTIFIED · FROZEN** · Implementation **NOT YET AUTHORISED** · Wave 1 needs separate PO authorisation |
| Implementation Lifecycle (until Go-Live) | `.cursor/rules/implementation-lifecycle-pre-golive.mdc` |
| Enterprise Health Check template | `docs/governance/ENTERPRISE-HEALTH-CHECK-TEMPLATE.md` |

## Standing constraints

- **Constitutional Health Check** before any production code — stop and report on conflict; never silent architectural change.  
- Cite the **Enterprise Architecture Baseline** in future Architecture Reviews and Wave plans.  
- ADR-018 remains **frozen** as certified.  
- ADR-019 architecture is **frozen**; implementation requires a **separate** roadmap + Wave 1 Product Owner approval.  
- No dual active implementations of the same business capability after a “Replace” decision.  
- Future Assessments and ADRs **must** include **Legacy Retirement Impact** and respect **Business Capability Ownership**.
