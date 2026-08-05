# CO-WP-ARCHITECTURE-UPDATE-001 — Roadmap Alignment

**Status:** Product Owner Architecture Direction  
**Implementation Status:** **DO NOT IMPLEMENT**  
**Purpose:** Roadmap Alignment  
**Date:** 2026-08-02  

---

## Architectural update

After today's Product Owner review, the development roadmap has been refined.

The Wealth Partner App architecture has matured beyond the original plan.

**This is an architecture update only. No implementation is authorised.**

---

## Important change

Although the **Home** module is functionally complete and awaiting Product Owner certification, the next engineering priority will **NOT** automatically be the **Business** module.

A new Enterprise module has been identified which should be **designed** before Business implementation begins.

---

## New Enterprise module

| Field | Value |
|-------|--------|
| **Name** | Enterprise Experience Engine (EEE) |
| **Location** | Catalyst One |
| **Not** | Wealth Partner App |

### Purpose

The Enterprise Experience Engine will become the publishing and experience orchestration layer for the entire Rupee Catalyst ecosystem.

The Wealth Partner App will never own business content.  
It will render Enterprise Experiences created inside Catalyst One.

### The engine will eventually control

- Hero Carousel  
- Recommended Actions  
- Today's Highlights  
- Business Feed  
- Notifications  
- Personalised Greetings  
- Campaigns  
- Training  
- Marketing Creatives  
- Product Workspaces  
- Digital Toolkit  
- Recognition  
- CEO Messages  
- Festival Messages  
- Future Enterprise Experiences  

---

## Product Workspace

During Product Owner review, another constitutional decision was made.

Every financial product will eventually open into an **Enterprise Product Workspace**.

Examples: Home Loan · Loan Against Property · Business Loan · Mutual Fund · Insurance · Fixed Deposit · future products.

These pages will **NOT** be hardcoded inside the Wealth Partner App.

Catalyst One will own:

- Banner  
- Description  
- Product Benefits  
- Documents  
- Lenders  
- Interest Rates  
- Marketing Material  
- Training  
- Calculators  
- FAQs  
- CTA  

The Wealth Partner App will simply render the Enterprise Product Workspace.

---

## Partner Entitlements

Product availability will be managed entirely from Catalyst One.

Examples: Loans · Mutual Funds · Insurance · Fixed Deposits · Bonds · PMS · AIF.

Every Wealth Partner will have configurable product access.

The Wealth Partner App must never hardcode product visibility.

---

## Partner Tier Engine

Partner Tier will **NOT** be manually assigned.

Partner Tier will be calculated automatically from configurable product-wise targets assigned during onboarding.

Targets may differ by:

- City  
- Product Specialisation  
- Partner Type  
- Business Model  

Catalyst One will calculate:

- Product Achievement  
- Overall Achievement  
- Tier  
- Progress  

The Wealth Partner App will only display the results.

---

## Next design activity

Enterprise Experience Engine architecture design remains pending.

- Do **not** begin implementing EEE / Experience Center.  
- **CO-WP-DEVELOPMENT-WAVE-001** authorises Wealth Partner **module builds** (Home → Business → Saarthi → Private → More), including Business Opportunity journeys with placeholder Partner DTOs.  
- That wave does **not** authorise Experience Center implementation or deployment without Product Owner review.

---

## Current status

| Item | Status |
|------|--------|
| **Home Module** | Implementation Complete · Awaiting Product Owner Review and Certification |
| **Business Module** | **Authorised** under CO-WP-DEVELOPMENT-WAVE-001 (companion journeys; not EEE) |
| **Enterprise Experience Engine** | Architecture Design Pending · **DO NOT IMPLEMENT** |

---

## Cursor rule

`.cursor/rules/co-wp-architecture-update-001.mdc` (EEE DO NOT IMPLEMENT)  
Wave override for modules: `.cursor/rules/co-wp-development-wave-001.mdc`
