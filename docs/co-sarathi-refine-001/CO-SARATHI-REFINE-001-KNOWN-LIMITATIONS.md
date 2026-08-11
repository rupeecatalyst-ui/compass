# CO-SARATHI-REFINE-001 — Known Limitations

1. **Summary fact richness** depends on Consultation Intelligence key facts. Sparse utterances may take more turns before the summary gate opens.
2. **Product tone** is UX-guided (detect + adaptive question). Deep tone copy still relies on existing Micro Communication / Tone engines — not a new product-tone engine.
3. **Before vs After screenshots** should be captured from the live Vercel desk; static PNG assets are not bundled in this sprint folder until PO capture.
4. **Wealth Partner** desk keeps partner-oriented welcome copy; full refine flow is optimised for the customer `/sarathi` path.
5. **Proposal titles** may still originate from draft proposal generators; UI strips common engineering phrases but cannot rewrite every internal title.
6. **No CRM execution** remains by design — cards stay recommendations only.
7. Continuity key `v2` does not auto-migrate `v1` sessions — users start a fresh conversation after deploy.
