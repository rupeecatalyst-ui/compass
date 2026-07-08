# Rupee Catalyst — Architecture Constitution

> **Status:** Frozen. This document is the authoritative boundary definition for all products under Rupee Catalyst.  
> **Last updated:** July 2026

---

## 1. Parent Brand

**Rupee Catalyst** is the parent company and platform owner. It provides shared infrastructure, design language, business services, and intelligence capabilities that power its product suite.

Rupee Catalyst is **not** a user-facing application. It is the ecosystem under which independent products are built, deployed, and evolved.

---

## 2. Product Hierarchy (Non-Negotiable)

```
Rupee Catalyst
│
├── COMPASS
│   Customer Platform
│
│   • Public Website
│   • Customer Portal (future)
│   • Financial Fitness
│   • Sarathi AI
│   • Loan Tracking
│   • Knowledge Centre
│   • Loan Applications (future)
│
└── Catalyst One
    Enterprise Operating System
│
    • CRM
    • Loan Workspace
    • Credit & Risk Engine
    • Operations
    • Accounts
    • Mission Control
    • CHANAKYA
    • Admin Console
```

**COMPASS** and **Catalyst One** are **two independent software products**. They are not different pages, routes, layouts, or modes of the same application.

---

## 3. COMPASS — Customer Platform

| Attribute | Definition |
|-----------|------------|
| **Audience** | Borrowers, prospective customers, public visitors |
| **Purpose** | Help customers borrow smarter with transparency, guidance, and intelligence |
| **Deployment** | Independent Next.js application (`compass/`) |
| **Domain (target)** | `www.rupeecatalyst.com` / `compass.rupeecatalyst.com` |
| **Auth model (future)** | Customer registration, self-service portal — separate from employee auth |

### COMPASS owns

- Public marketing website
- Customer portal (future)
- Sarathi AI customer experience (future)
- Financial Fitness (future)
- Loan tracking customer view (future)
- Knowledge Centre (future)
- COMPASS branding, navigation, layouts, metadata, and routing

### COMPASS must never

- Import Catalyst One components, layouts, or routes
- Share login pages with Catalyst One
- Redirect customers into the ERP dashboard
- Embed CRM, Loan Workspace, or admin modules

---

## 4. Catalyst One — Enterprise Operating System

| Attribute | Definition |
|-----------|------------|
| **Audience** | Relationship managers, credit teams, operations, accounts, executives, admins |
| **Purpose** | End-to-end loan origination, risk, execution, and enterprise operations |
| **Deployment** | Independent Next.js application (repository root / legacy monolith until migrated) |
| **Domain (target)** | `app.rupeecatalyst.com` |
| **Auth model** | Employee invite-only, role-based access control |

### Catalyst One owns

- Dashboard, CRM, Loan Board, Loan Workspace
- Credit & Risk Engine, Workflow Engine, Product Library
- Mission Control, CHANAKYA ERP presentation
- Operations, Accounts, Admin Console
- Catalyst One branding, navigation, layouts, and employee journeys

### Catalyst One must never

- Host public marketing pages as product routes
- Use customer portal flows for employee login
- Absorb COMPASS features into its app router without explicit architectural approval

---

## 5. Shared Platform (Future)

COMPASS and Catalyst One **may share** platform capabilities through explicit shared packages or services:

| Shared | Not Shared |
|--------|------------|
| Design system tokens | Routing |
| UI primitives (shadcn) | Navigation |
| API layer (`services/api`) | Layouts |
| Authentication **services** (not login UI) | Dashboards |
| Business services | User journeys |
| Database | Branding |
| Intelligence engine (CHANAKYA) | Customer vs employee experience |
| Common TypeScript types | Page-level components across products |

Sharing must happen through **versioned packages or API contracts** — never through direct cross-app imports.

---

## 6. Boundary Rules

### Rule 1 — No cross-product imports

Code in `compass/` must not import from Catalyst One source trees.  
Code in Catalyst One must not import from `compass/`.

### Rule 2 — No shared routing

Each product defines its own `app/` router, middleware, and route constants.

### Rule 3 — No shared login experience

Employee login (Catalyst One) and customer login (COMPASS) are separate products surfaces, even if they use the same auth API.

### Rule 4 — Intelligence is platform-owned, presentation is product-owned

CHANAKYA contracts and synthesizer live in a shared intelligence package (future).  
COMPASS renders Sarathi/borrower coaching. Catalyst One renders Mission Control/executive briefing.

### Rule 5 — Explicit approval for boundary crossings

Any feature that spans both products (e.g. customer file visible in CRM) must be:

1. Designed as an API integration, not a shared React tree
2. Documented in an ADR
3. Explicitly approved before implementation

### Rule 6 — Branding clarity

| Brand | Role |
|-------|------|
| **Rupee Catalyst** | Parent company — "Powered by Rupee Catalyst" on COMPASS |
| **COMPASS** | Customer-facing product name |
| **Catalyst One** | Enterprise OS product name |

Never present Catalyst One as the customer homepage. Never present COMPASS as the ERP name.

---

## 7. Repository Layout (Target State)

```
rupee-catalyst/
├── ARCHITECTURE.md          ← This document
├── compass/                 ← COMPASS application (customer platform)
├── [catalyst-one]/          ← Catalyst One application (enterprise OS)
├── packages/                ← Shared packages (future)
└── services/api/            ← Shared backend (future)
```

During transition, Catalyst One may remain at the repository root. COMPASS lives in `compass/` as an independent application from day one.

---

## 8. Decision Log

| Decision | Rationale |
|----------|-----------|
| Two independent frontend applications | Different users, auth, UX, release cadence, security |
| COMPASS in `compass/` folder | Clean recovery without refactoring Catalyst One |
| No monorepo extraction until approved | Catalyst One remains frozen during COMPASS foundation |
| ARCHITECTURE.md as constitution | Prevent accidental product boundary blur by humans or AI tooling |

---

## 9. For Developers and AI Assistants

Before implementing any feature, ask:

1. **Which product owns this?** (COMPASS or Catalyst One)
2. **Which user type is this for?** (Customer or Employee)
3. **Does this require cross-product data?** (If yes → API, not import)
4. **Am I modifying the correct application directory?**

If the answer is unclear, **stop and clarify**. Do not default to adding features to the nearest existing route.

---

*This document supersedes informal assumptions about "one app with public and private routes."*
