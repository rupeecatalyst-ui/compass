# CO-UX-014 — Strategic Workspace Activity Composer Integration

**Status:** Implementation Complete · Ready for Business Acceptance Testing  
**Type:** UX / presentation-layer only  
**Architecture:** ADR-021 unchanged · ECIE Wave 1 reused

---

## 1. UX Implementation Report

### Objective

Replace the Contact Strategic Workspace Notes experience with the **shared** Enterprise Activity Composer so Relationship Managers capture Meeting Notes & Conversations through the same ECIE pipeline used from Action Center.

### What changed

| Area | Change |
|------|--------|
| Shared Composer | Added `presentation="sheet" \| "inline"` (default sheet). Inline hosts heading, modes, editor, Discard / Save Activity without Context Workspace shell. |
| Strategic Workspace | Inspector mounts inline Composer titled **Meeting Notes & Conversations** for the selected contact (`contextType: "contact"`). |
| Legacy Notes | Removed free-text Notes editor from the Log cycle dialog. Cycle dialog now only selects activity type, then focuses the Composer. |
| Save path | Unchanged — `saveConversationActivity` → Document Registry (audio) · Activity Registry · EDC timeline. |
| Relationship cycles | Optional stamp of truncated transcript into existing cycle store after ECIE save (display only). Notes SSOT remains ECIE. |

### User experience

- Modes: Type Note · Record Voice · Attach Document · Capture Image (Wave 1 enables Type + Voice; others show Soon)
- Voice: Record / Pause / Resume / Stop / Playback / duration · editable transcript
- Footer: Discard · Save Activity
- Recent conversation activities listed under the Composer from Activity Registry (no duplicate composer)

### Production data protection

- Additive presentation only
- No deletes, no registry ownership changes, no localStorage Activity SSOT, no second Composer

---

## 2. Before / After (screenshot guide for BAT)

Automated live screenshots are not captured in CI. Product Owner / BAT should capture:

### Before

1. Open `/contact-strategy`
2. Select a contact → Log interaction dialog with **Notes** textarea

### After

1. Open `/contact-strategy`
2. Select a contact → right inspector shows **Meeting Notes & Conversations** with shared Composer
3. Type Note or Record Voice → Save Activity
4. Confirm activity in Enterprise Dialogue Center Timeline (single `conversation_activity` entry)
5. Optional: capture Action Center → Add Activity still opens sheet Composer (regression)

Suggested filenames:

- `docs/co-ux-014/screenshots/01-before-notes-dialog.png` (if archived from prior build)
- `docs/co-ux-014/screenshots/02-after-inline-composer.png`
- `docs/co-ux-014/screenshots/03-voice-mode.png`
- `docs/co-ux-014/screenshots/04-edc-timeline.png`

---

## 3. Architecture Conformance Confirmation

| Constraint | Result |
|------------|--------|
| ADR-021 frozen / unmodified | ✅ Confirmed — no ADR edit |
| Single Activity Composer | ✅ `enterprise-activity-composer.tsx` only |
| No new registries / storage | ✅ |
| No new business logic engines | ✅ Presentation + existing save pipeline |
| Document Registry owns audio | ✅ via Wave 1 save |
| Activity Registry owns transcript | ✅ |
| EDC owns timeline | ✅ |
| ETE unchanged | ✅ Wave 1 still does not mint tasks |
| No localStorage Activity SSOT | ✅ |

---

## 4. Verification Results

```bash
npm run verify:co-ux-014
```

Static gates confirm shared Composer reuse, inline host, Notes removal, and ECIE save pipeline references.

**Manual BAT (required for voice / timeline):**

- [ ] Inline Composer visible on selected contact
- [ ] Type Note → Save Activity succeeds
- [ ] Record Voice → pause / resume / stop / playback / duration
- [ ] Transcript editable before save
- [ ] Conversation Activity appears once in EDC Timeline
- [ ] Action Center sheet Composer still works (Opportunity / Deal / Loan)
- [ ] No Strategic Workspace layout regression

---

## Files

- `src/components/catalyst-one/action-center/workspaces/enterprise-activity-composer.tsx`
- `src/components/catalyst-one/contact-strategy/contact-strategy-workspace.tsx`
- `scripts/co-ux-014-verify.mjs`
- `docs/co-ux-014/CO-UX-014-UX-IMPLEMENTATION-REPORT.md`
