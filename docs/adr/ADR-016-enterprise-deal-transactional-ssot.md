# ADR-016: Enterprise Deal as Tier-3 Transactional SSOT (CO-ARCH-002)

**Status:** **SUPERSEDED IN PART by CO-ARCH-003 / F0′ (2026-07-23)** — Deal grain for *lending* is now **per-lender execution** under Opportunity; engagement-level “Deal = Opportunity” is withdrawn. CO-ARCH-002 wave artifacts remain historical.  
**Date:** 2026-07-21  
**Amended:** 2026-07-21 (ARB Foundation Amendment) · … · **2026-07-23 (CO-ARCH-003 Opportunity-centric lending — F0′)**  
**Program:** CO-ARCH-002 (historical) · **Successor domain program: CO-ARCH-003**  
**Classification:** ARCH / TRANSACTIONAL BACKBONE / CONSTITUTIONAL DOMAIN RULE  
**Supersedes (historical):** Browser `localStorage` LoanFile authority  
**Superseded by (lending grain):** `docs/architecture/FOUNDATION-PRINCIPLE-DEAL-CENTRIC.md` (F0′) · `docs/co-arch-003/CO-ARCH-003-IMPLEMENTATION-BLUEPRINT.md` · ADR follow-on CO-ARCH-003 Phase docs  
**Related:** ADR-015 · CO-ARCH-003 Glossary

## Context

CO-ARCH-001 established persistent enterprise master data (Tier 0–2). Soft Go-Live investigation found that transactional modules still use browser `localStorage`. The Architecture Review Board approved CO-ARCH-002 and established **Foundation Principle F0** as the constitutional domain rule for Catalyst One.

## Foundation Principle F0 (constitutional)

Catalyst One is a **Deal-Centric Enterprise Operating Platform**.

A Deal is the **atomic transactional unit of business**. Every financial transaction undertaken by the enterprise is represented by **exactly one Deal**.

The Deal is the **single source of truth** for business execution, workflow, intelligence, collaboration, accounting, analytics, AI reasoning, and operational lifecycle.

Every transactional activity within Catalyst One must be **directly associated with a Deal**.

Enterprise master data—including Customers, Companies, Products, Counterparties (Lenders, AMCs, Insurance Companies, Issuers), Users, Organizations, and Reference Registries—exists **solely to support** the creation, governance, execution, and analysis of Deals.

If a proposed feature, workflow, report, AI capability, automation, or business process cannot be directly related to a Deal or to the enterprise master data that supports Deals, its purpose within Catalyst One must be questioned.

### Core Principles

1. Every business transaction creates exactly one Deal.  
2. A Deal is never reused and its identity is immutable.  
3. A Customer may have unlimited independent Deals running in parallel.  
4. Each Deal maintains its own lifecycle, documents, tasks, activities, accounting, commissions, communications, audit trail, and AI context.  
5. All enterprise intelligence, reporting, automation, workflow orchestration, and operational decision-making are Deal-centric.  
6. **Master Registries support Deals. Transactional Entities belong to Deals.**

This principle is constitutional and supersedes all module-level design decisions. Every current and future module shall conform to this Deal-Centric Enterprise Architecture.

## Decision

1. Adopt **Enterprise Deal** (`EnterpriseDeal` / `enterprise_deals`) as the canonical Tier-3 transactional aggregate root.  
2. Treat **F0** as binding for all current and future modules.  
3. Use generalized **`DealCounterpartyAssignment`**; Lender Pipeline is a lending specialization.  
4. Migrate off `LoanFile` localStorage via dual-write → dual-read → cutover with reversible flags.  
5. Preserve certified lending journey order for the lending family; allow future family stage catalogs without changing the Deal root.  
6. Execute **one wave at a time**. Certify each wave before starting the next.

## Consequences

### Positive

- Constitutional clarity for every module and feature gate  
- Multi-device operational integrity  
- Cross-vertical My Deals registry  
- Future products without redesigning the transactional model  
- Mission Control / CHANAKYA / Saarthi / analytics share one Deal SSOT  

### Negative / costs

- Large migration surface  
- Dual-write complexity in hybrid period  
- Features unrelated to Deals (or supporting masters) require explicit justification  
- Flag governance discipline required  

## Architecture & execution packages

- Architecture (Accepted): `docs/co-arch-002/CO-ARCH-002-ENTERPRISE-DEAL-REGISTRY-ARCHITECTURE.md` **(v0.4)**  
- Execution Program (Accepted): `docs/co-arch-002/CO-ARCH-002-ENTERPRISE-DEAL-EXECUTION-PROGRAM.md` **(v1.0)**  
- Wave 0 Technical Design (Approved): `docs/co-arch-002/CO-ARCH-002-WAVE-0-TECHNICAL-DESIGN.md` **(v1.0 + A1–A3)**  
- Wave 1 Completion (Approved): `docs/co-arch-002/CO-ARCH-002-WAVE-1-COMPLETION-REPORT.md`  
- Wave 2 Completion (Approved): `docs/co-arch-002/CO-ARCH-002-WAVE-2-COMPLETION-REPORT.md`  
- Wave 3 Completion (Approved): `docs/co-arch-002/CO-ARCH-002-WAVE-3-COMPLETION-REPORT.md`  
- Wave 4 Completion (Approved): `docs/co-arch-002/CO-ARCH-002-WAVE-4-COMPLETION-REPORT.md`  
- Wave 5 Completion (Approved): `docs/co-arch-002/CO-ARCH-002-WAVE-5-COMPLETION-REPORT.md`  
- Wave 6 Completion (Pending final ARB): `docs/co-arch-002/CO-ARCH-002-WAVE-6-COMPLETION-REPORT.md`  
- Wave 6 Rollback Runbook: `docs/co-arch-002/CO-ARCH-002-WAVE-6-ROLLBACK-RUNBOOK.md`  
- Constitutional text: `docs/architecture/FOUNDATION-PRINCIPLE-DEAL-CENTRIC.md`  
- Agent rule: `.cursor/rules/deal-centric-enterprise.mdc`

## Compliance

- Architecture Package v0.4: **Accepted**.  
- Execution Program v1.0: **Accepted**.  
- Wave 0–5: **Approved**.  
- Wave 6 Cutover & Stabilization: **Complete — pending final ARB certification** (ops package ready; **production flags remain OFF**).  
- Enterprise Deal operational SSOT: **blocked** until final ARB authorizes Go-Live Checklist.  
- F0 remains constitutional for all waves.
