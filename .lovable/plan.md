## Scope

Targeted V2 polish pass — content/data updates, image replacements, calculator restructure, social links, blog fixes, and dark/light mode hardening. No redesigns.

---

## 1. Content & data updates (`src/lib/site.ts`)

- Founding year: 2017 (update any 2014 references in About journey too).
- `TRUST_STATS`: change "₹1,700+ Cr" → "₹2,200+ Cr".
- Social links in `SITE.social`:
  - facebook → `https://www.facebook.com/RupeeCatalyst1`
  - linkedin → `https://www.linkedin.com/company/13662122/`
  - instagram → `https://www.instagram.com/_rupee_catalyst`

## 2. About page (`src/routes/about.tsx`)

- Update "One decade of trust" copy & journey timeline to start at 2017 (founding), with milestones rebased; final stat shows ₹2,200+ Cr.

## 3. Editable lender ROI (future Hostinger editing)

Extract `LENDERS_BY_PRODUCT` from `src/lib/site.ts` into a standalone JSON file: `src/data/lenders.json`. Import it in `site.ts` and re-export. Add a short comment block at the top of the JSON explaining: "Edit ROI / max amount / tenure here. Format: array per product slug." This gives a single, easy-to-edit file on Hostinger without touching TS.

## 4. Product images (regenerate via imagegen)

- `working-capital.jpg` — Indian man, factory + office setup in background.
- `business-loan.jpg` (unsecured business loan) — Indian man (not woman), office background.
- `personal-loan.jpg` — Indian man (not woman), warm professional setting.
- `mutual-funds.jpg` — premium investing visual (Indian professional reviewing portfolio on laptop, clean modern office, charts subtly visible).

All saved to existing paths so imports keep working.

## 5. Calculators page (`src/routes/calculators.tsx`)

- Remove the "Eligibility" tab entirely.
- Split into two clearly separated groups using a top-level toggle (Tabs): **Loan Calculators** and **Mutual Fund Calculators**.
  - Loan: Home Loan, Personal Loan, Business Loan, LAP, Balance Transfer
  - Mutual Fund: SIP, Lumpsum, Retirement Planner
- Update `head()` description accordingly.

## 6. Blog fixes

- `src/routes/blogs.tsx`: ensure cards link via `<Link to="/blogs/$slug" params={{ slug }}>` (not `<a href>`) so "Read more" navigates correctly.
- `src/routes/blogs.$slug.tsx`: verify route exists & renders post body.
- `src/lib/blog.ts`: add a `cover` image field to each post and wire it into the card thumbnail + article hero. Use existing product images (or a small set of generated blog cover images) so no card is blank.

## 7. Dark / Light mode hardening (`src/styles.css` + components)

- Audit `src/styles.css` `@theme` tokens — ensure every semantic token (`--background`, `--foreground`, `--card`, `--muted`, `--border`, `--primary`, `--accent`, surface gradients) has both light and dark values under `:root` and `.dark`.
- Sweep components for hardcoded colors (`bg-white`, `text-black`, `bg-[#…]`, hardcoded navy/emerald hex) introduced during V2 work — replace with semantic tokens (`bg-card`, `text-foreground`, `bg-surface`, `text-navy` mapped via tokens).
- Verify gradient utilities (`bg-gradient-hero`, glassmorphism panels) read tokens so they invert correctly in dark mode.
- Confirm `SiteHeader` has a working theme toggle; if missing, add a small sun/moon toggle wired to a `.dark` class on `<html>` with `localStorage` persistence.

---

## Technical notes

- No DB / RLS / server-fn changes.
- Lender JSON stays type-safe via `as const` cast + existing `LenderOffer` type.
- Image regeneration uses `imagegen--generate_image` (standard tier) writing to existing `src/assets/products/*.jpg` paths — no import changes needed.
- Blog detail route already exists per file listing (`src/routes/blogs.$slug.tsx`); fix is link wiring + cover image data, not new routes.
- Dark-mode pass is a token + className audit, not a redesign — visual identity stays the same.

---

## Out of scope

- Homepage hero / leadership photos (handled previously, user adds on Hostinger).
- New features, new routes, or copy beyond the items above.
