# COMPASS — Customer Platform

Independent Next.js application for the COMPASS customer-facing platform under Rupee Catalyst.

> **Architectural boundary:** This application is separate from Catalyst One. See [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

## Prerequisites

- Node.js 20+
- npm 10+

## Installation

```bash
cd compass
npm install
```

## Development

```bash
npm run dev
```

**Local preview URL:** [http://localhost:3001](http://localhost:3001)

> Catalyst One (enterprise OS) runs separately on port 3000 from the repository root.

## Production build

```bash
npm run build
npm run start
```

## Phase 1 pages

| Route | Page |
|-------|------|
| `/` | Homepage |
| `/loan-products` | Loan Products |
| `/about` | About |
| `/contact` | Contact |
| `/financial-fitness` | Financial Fitness (placeholder) |
| `/resources` | Resources (placeholder) |

## Not in scope (yet)

- Customer Portal
- Sarathi AI
- Loan Tracking
- Authentication
- APIs / CRM / Dashboard
