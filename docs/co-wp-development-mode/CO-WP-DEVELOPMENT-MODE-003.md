# CO-WP-DEVELOPMENT-MODE-003 — Module-Complete Development

**Status:** EFFECTIVE IMMEDIATELY  
**Authority:** Product Owner  
**Date:** 2026-08-02  
**Supersedes:** CO-WP-DEVELOPMENT-MODE-002

---

## Development strategy

Develop **complete modules**.  
Do **NOT** develop isolated screens.

The Wealth Partner App is an Enterprise Companion over Catalyst One.

**Catalyst One thinks. The Wealth Partner App presents.**

---

## Modules

Develop module-by-module. Complete one before the next.

1. Home  
2. Business  
3. Saarthi  
4. Private  
5. More  

---

## Module completion

A module is complete only when it includes:

- All related screens  
- Navigation  
- Empty States  
- Loading States  
- Skeleton Loaders  
- Interactions  
- Animations  
- Page Transitions  
- Responsive Layouts  
- Enterprise DTO integration  
- Design consistency  
- Dark Theme compliance  
- Accessibility  
- Error States  
- Enterprise Unavailable handling  

---

## Enterprise Experience Engine

Home must **NOT** own content. Home renders Enterprise Experience DTOs.

Examples: Hero Carousel · Recommended Actions · Today’s Highlights · Business Feed · Notifications · Personalisation · Digital Visiting Card.

Everything must be configurable from Catalyst One.

---

## Product Workspace

Every financial product opens into an **Enterprise Product Workspace**.

Examples: Home Loan · Loan Against Property · Business Loan · Mutual Fund · Insurance · Fixed Deposit · future products.

The Wealth Partner App must **never** hardcode product pages.

Catalyst One owns: Banner · Description · Rates · Documents · Lenders · Training · Marketing · Calculators · CTA.

The app renders.

---

## Zero Trust

Every screen must consume Partner-scoped Enterprise APIs.

- No employee APIs  
- No local business logic  
- No duplicated calculations  

---

## Design philosophy

Every module must follow the approved UX Constitution.

Premium · Elegant · Dark Theme · Consumer FinTech quality.

Every morning the app should feel enjoyable to open.

---

## Certification

```text
Complete Module
  → Product Owner Review
  → Product Owner Refinements
  → Certification
  → Freeze
  → Deployment
  → Next Module
```

---

## Deployment

Do **NOT** deploy after every screen.  
Do **NOT** deploy after every sprint.

Deploy **only** after the complete module has been reviewed and approved by the Product Owner.

---

## Current status

| Module | Status |
|--------|--------|
| **Home** | Implementation Complete · Awaiting Product Owner Module Certification |
| **Business** | **In progress** — CO-WP-DEVELOPMENT-WAVE-001 (PO authorised) |
| Saarthi · Private · More | WAVE-001 queue (hub shells started) |

**EEE:** Still **DO NOT IMPLEMENT**. WAVE-001 does not authorise Experience Center.

**Deploy:** Not until Product Owner reviews completed modules.

---

## Non-negotiable

The Wealth Partner App is **NOT** another CRM.  
It is **NOT** another Operating System.  
It is the Enterprise Companion to Catalyst One.

If Catalyst One is unavailable, the Wealth Partner App should have almost nothing meaningful to do except authenticate the user and communicate that Enterprise Services are unavailable.

---

## Cursor rule

`.cursor/rules/co-wp-development-mode-003.mdc` (always apply)

CO-WP-DEVELOPMENT-MODE-002 rule retained only as historical supersession pointer — **003 governs**.

Roadmap gate: `.cursor/rules/co-wp-architecture-update-001.mdc` (**DO NOT IMPLEMENT**).
