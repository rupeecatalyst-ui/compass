# CO-NOTIFICATION-001B — CHANAKYA Notification Visual Design Refinement

**Classification:** Visual refinement only · **NOT CERTIFICATION**  
**Date:** 2026-08-11  
**Deployment:** ❌ Not performed (forbidden)  
**Database / recipient / EAR changes:** ❌ None  

---

## Objective

Refine the Catalyst One Enterprise Notification toast so every CHANAKYA-released notification presents the approved CHANAKYA portrait identity on a premium dark card — without changing notification architecture.

---

## Approved CHANAKYA asset

| Field | Value |
|-------|--------|
| Asset | `/images/chanakya-portrait.png` (`public/images/chanakya-portrait.png`) |
| SSOT pack | `CEI_DEFAULT_AVATAR_PACK` in `src/constants/chanakya-enterprise-identity/avatar.ts` |
| UI primitive | Existing `ChanakyaAvatar` (`src/components/catalyst-one/chanakya-enterprise-identity/chanakya-avatar.tsx`) |
| Action | **Reused exactly** — not recreated, not replaced, not stylized beyond existing avatar chrome |

---

## Visual changes

| Requirement | Implementation |
|-------------|----------------|
| CHANAKYA photo mandatory | `ChanakyaAvatar` size `md`, circle, no pulse |
| Sender identity | `CEI_OFFICIAL_TITLE` = **CHANAKYA** · `CEI_OFFICIAL_SUBTITLE` = **Enterprise Chief of Staff** |
| Dark mode mandatory | Always-dark card `bg-[#0f1419]` · zinc text · teal accent ring · no light/white card |
| Hierarchy | Photo → CHANAKYA → event title → business context → actor → factual message → Open / Silent |
| No technical jargon | No EAR / ECIE / Notification Engine labels in UI |
| Controls | Close (×) · Open action · Silent (visual on / sound off) with contrast on dark surface |
| Sound | Unchanged `catalyst_one_notification_chime.wav` |
| Desktop | Bottom-right stack |
| Mobile | Safe-area insets + raised bottom offset to clear bottom navigation |

**File modified:** `src/components/catalyst-one/enterprise-notification-engine/enterprise-notification-host.tsx`  
**Verify updated:** `scripts/co-notification-001-verify.mjs` (001B visual assertions)

---

## Architecture confirmation

| Concern | Status |
|---------|--------|
| New notification DB | ❌ Not created |
| New event store | ❌ Not created |
| New CHANAKYA service | ❌ Not created |
| New notification API | ❌ Not created |
| Recipient logic | ❌ Unchanged |
| EAR / event architecture | ❌ Unchanged |
| Schema / migration | ❌ Unchanged |
| Vercel / production | ❌ Not deployed |

---

## Verification results

| Gate | Result |
|------|--------|
| `npm run verify:co-notification-001` | ✅ PASS (includes 001B avatar/dark/safe-area checks) |
| `npx tsc --noEmit` | ✅ exit 0 |
| `npm run lint` | ✅ exit 0 |
| `npm run build` | ✅ exit 0 |

### Checklist (implementation)

1. CHANAKYA photo appears — ✅ via `ChanakyaAvatar`  
2. Correct approved asset — ✅ `/images/chanakya-portrait.png`  
3. Dark mode — ✅ mandatory dark card  
4. Text readable — ✅ high-contrast zinc/teal on dark  
5. CHANAKYA identity prominent — ✅ header + portrait  
6. Event information factual — ✅ title / context / actor / description (no engine jargon)  
7–11. Open / Silent / Close / sound / ~10s dismiss — ✅ behaviour preserved  
12. Mobile usable — ✅ safe-area + raised bottom  
13. Security/recipient logic unchanged — ✅  

---

## Final status

✅ Visual refinement complete locally  
❌ Not deployed  
❌ Not certified  

**STOP.** Awaiting Product Owner inspection before any deployment instruction.
