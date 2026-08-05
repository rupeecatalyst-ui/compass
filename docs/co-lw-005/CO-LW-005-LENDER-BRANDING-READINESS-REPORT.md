# CO-LW-005 — Enterprise Lender Branding

**Status:** Implementation Complete · Ready for BAT  
**Date:** 2026-07-31  
**Scope:** Enrich Enterprise Lender Registry with Official Logo · Website · Brand Name · Brand Asset. UX/master-data only — no parallel registries.

---

## Principles

1. Branding is **Enterprise Master Data** (`logoUrl`, `website`, `displayName` / `brandName` on Lender Registry).
2. UI components **must not** hardcode logos (removed `LENDER_BRANDS` colour map from `LenderLogo`).
3. Logos included **only** when verified against Wikimedia Commons / Wikipedia files that cite the lender’s official website.
4. If not verified → **retain initials placeholder** and report missing branding — never guess.

---

## Verified Logos (22)

| Seed Key | Brand Name | Official Website | Brand Asset Source |
|---|---|---|---|
| sbi | State Bank of India | sbi.co.in | Commons: State Bank of India.svg |
| hdfc | HDFC Bank | hdfcbank.com | Commons: HDFC Bank Logo.svg |
| icici | ICICI Bank | icicibank.com | Commons: ICICI Bank Logo.svg |
| axis | Axis Bank | axisbank.com | Commons: Axis Bank logo.svg |
| kotak | Kotak Mahindra Bank | kotak.com | Wikipedia: Kotak Mahindra Group logo.svg |
| pnb | Punjab National Bank | pnbindia.in | Commons: Punjab National Bank.svg |
| canara | Canara Bank | canarabank.com | Commons: Canara Bank Logo.svg |
| union | Union Bank of India | unionbankofindia.co.in | Commons: Union Bank of India Logo.svg |
| bom | Bank of Maharashtra | bankofmaharashtra.in | Commons: Bank of Maharashtra logo.svg |
| iob | Indian Overseas Bank | iob.in | Commons: Indian Overseas Bank Logo.svg |
| psb | Punjab & Sind Bank | punjabandsindbank.co.in | Commons: Punjab & Sind Bank.svg |
| indusind | IndusInd Bank | indusind.com | Commons: IndusInd Bank SVG Logo.svg |
| federal | Federal Bank | federalbank.co.in | Commons: Federal-Bank-Logo SVG.svg |
| yes | Yes Bank | yesbank.in | Commons: Yes Bank SVG Logo.svg |
| rbl | RBL Bank | rblbank.com | Commons: RBL Bank SVG Logo.svg |
| karnataka | Karnataka Bank | karnatakabank.com | Commons: Karnataka Bank svg Logo.svg |
| kvb | Karur Vysya Bank | kvb.co.in | Commons: Karur Vysya Bank.svg |
| dcb | DCB Bank | dcbbank.com | Commons: Development Credit Bank.svg |
| tmb | Tamilnad Mercantile Bank | tmb.in | Commons: TMB SVG Logo.svg |
| csb | CSB Bank | csb.co.in | Commons: CSB Bank New Logo-02.svg |
| bandhan | Bandhan Bank | bandhanbank.com | Commons: Bandhan Bank Svg Logo.svg |
| bajaj_finance | Bajaj Finance | bajajfinserv.in | Commons: Bajaj Finance Logo.svg |

---

## Explicitly Unverified (logo withheld)

| Seed Key | Brand Name | Reason |
|---|---|---|
| idfc_first | IDFC FIRST Bank | Commons has legacy **IDFC Bank** mark only — FIRST rebrand not verified |
| bob | Bank of Baroda | No verified SVG on Commons |
| lic_hfl | LIC Housing Finance | No verified official SVG |
| pnb_housing | PNB Housing Finance | No verified official SVG |
| tata_capital | Tata Capital | No verified official SVG |
| hsbc | HSBC | India-specific asset not pinned |
| standard_chartered | Standard Chartered | India-specific asset not pinned |

---

## Missing Branding (remainder of master catalog)

All other seed keys in `LENDER_MASTER_SEED_CATALOG` (~275 total) retain:

- **Brand Name** = `displayName` (master)
- **Website** = seed `website` when present
- **Logo** = unset → UI placeholder initials

Notable gaps (high visibility): AU SFB, Equitas, Ujjivan, Home First, Aavas, Chola, Shriram, Muthoot, Manappuram, Paytm Payments, foreign banks (except Kotak path), most HFCs/NBFCs.

**Follow-up:** Admin upload of official press-kit assets into `logoUrl`, or curated Commons additions after visual verification.

---

## Architecture

| Layer | Change |
|---|---|
| Master catalog | `brandName?`, `logoUrl?` on seed; merged from `branding-catalog.ts` |
| Soft Go-Live bootstrap | Writes `logoUrl` on create/update |
| Prisma Tier-2 seed | Persists + backfills missing `logoUrl` |
| API POST/PATCH | Accepts `logoUrl` |
| Repository update | Persists `logoUrl` |
| Published directory | Exposes `logoUrl` + `brandName` |
| Master snapshot | Includes `logoUrl` + `brandName` |
| `LenderLogo` | Renders registry/catalog `logoUrl`; fallback initials |
| Lending Programs | Shows `LenderLogo` in list + header |

---

## Consumers (same SSOT)

Lending Programs · Deal Workspace / Kanban (`LenderLogo`) · Opportunity surfaces using published lenders · Relationship / ELW landing · Future mobile (via API `logoUrl`)

---

## Manual steps

- **Prisma environments:** re-run Tier-2 lender seed (or admin PATCH) so existing rows receive `logoUrl` backfill.
- Soft Go-Live: open `/lenders` once so `bootstrapLenderMaster` refreshes local store.

---

## Validation

- `npm run verify:co-lw-005`
