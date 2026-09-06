# CO-MARKETING-BAT-001 — Product Owner Business Acceptance Checklist

Status: **LOCAL FIXTURE BAT ONLY**  
Environment: isolated Marketing worktree · execution **OFF** · email **dry_run** · Sheets **fixture** · handoff **fixture**  
Base Marketing commit: `9395feb7dc0ca65e1986a287903974d93bb9235b`

This workbook is for tomorrow’s Product Owner review. Leave **Actual result**, **Pass/Fail**, **Comments**, and **Evidence** blank until you execute the step.

---

## D. Production-readiness blockers (do not authorise tomorrow)

Tomorrow’s BAT does **not** authorise any of the following:

- Prisma migration (`migrate deploy`, `migrate dev`, `db push`, seed)
- Git push
- Hostinger or any other deployment
- Live Google Sheet connection
- Internal or customer test send
- Provider / ESP / WhatsApp / SMS activation
- Production or Vercel Marketing pacing cron
- Live Contact / Opportunity handoff

Marketing execution must remain **OFF**. Default pacing remains **100 eligible recipients every 60 minutes**.

---

## How to use each row

| Field | Meaning |
|---|---|
| BAT ID | Stable identifier |
| Screen / route | Where to look |
| Starting fixture | Local fixture state |
| Action | Exact operator action |
| Expected | What must happen |
| Actual | Fill during BAT |
| P/F | Pass / Fail |
| Comments | Notes |
| Evidence | Screenshot / log reference |
| Sev | If failed: Blocker / Major / Minor |

---

## A. Visual BAT

| BAT ID | Screen / route | Starting fixture | Action | Expected | Actual | P/F | Comments | Evidence | Sev |
|---|---|---|---|---|---|---|---|---|---|
| BAT-A-HOME | `/admin/marketing` | Fixture org, TEST MODE | Open Marketing Home | Command Center; Draft / Awaiting approval / Scheduled / Running / Paused / Completed / Failed cards; provider-dependent values say Unavailable or Not connected |  |  |  | bat-a-home-desktop.png / bat-a-home-mobile.png |  |
| BAT-A-REGISTRY | `/admin/marketing/registry` | Mixed campaign statuses | Scan registry | Compact campaign rows; search and filters visible; no KPI dashboard |  |  |  | bat-a-registry-desktop.png |  |
| BAT-A-BUILDER | `/admin/marketing/campaigns/[id]` | Draft campaign | Walk six builder steps | Basics → Audience → Content → Personalisation → Schedule → Review; workspace remains primary |  |  |  | bat-a-builder-desktop.png / mobile |  |
| BAT-A-GALLERY | Builder step 3 | Draft | Open template gallery | Blank email card, standard templates, organisation templates |  |  |  | bat-a-gallery.png |  |
| BAT-A-EDITOR | Builder step 3 | Draft | Open visual editor | Heading, paragraph, image, CTA, divider, spacer, footer, unsubscribe blocks |  |  |  | bat-a-editor.png |  |
| BAT-A-PERSONALISATION | Builder step 4 | Confirmed mapping | Open personalisation | Mapped Sheet variables only; email/mobile/consent absent |  |  |  | bat-a-personalisation.png |  |
| BAT-A-PREVIEW-DESKTOP | Builder preview | Draft with content | Desktop view | Sender, subject, preheader, resolved body, CTA, unsubscribe footer |  |  |  | bat-a-preview-desktop.png |  |
| BAT-A-PREVIEW-MOBILE | Builder preview | Same | Mobile view 390×844 | Same content, mobile width, no overlap |  |  |  | bat-a-preview-mobile.png |  |
| BAT-A-REVIEW | Builder step 6 | Ready for review | Open Review | Objective, owner, channel, sender, subject, preheader, unsubscribe, workbook/tab, mapping, counts, snapshot, pacing, warnings, approver |  |  |  | bat-a-review.png |  |
| BAT-A-MONITORING | `/admin/marketing/monitoring` | Fixture campaign | Open monitoring | Selected/eligible/snapshotted/queued/attempted/simulated; delivered Unavailable when disconnected; identities masked |  |  |  | bat-a-monitoring.png |  |
| BAT-A-CONSENT | `/admin/marketing/consent` | Fixture suppressions | Open Consent Centre | Suppression history; fixture identities only |  |  |  | bat-a-consent.png / bat-suppression-history.png |  |
| BAT-A-QUALIFICATION | `/admin/marketing/responses` | Qualified fixture response | Open Qualification Inbox | Explicit qualification decision; no Lead entity |  |  |  | bat-a-qualification.png |  |
| BAT-A-ANALYTICS | `/admin/marketing/attribution` | Fixture attribution | Open Analytics | Chain visible; ROI Unavailable without cost/revenue |  |  |  | bat-a-analytics.png |  |
| BAT-A-ASSETS | `/admin/marketing/assets` | Fixture asset | Open Asset Library | Fixture assets; no live storage |  |  |  | bat-a-assets.png |  |
| BAT-A-DELIVERABILITY | `/admin/marketing/deliverability` | Simulated sender | Open Deliverability | Simulated/unverified; never shown as live-verified |  |  |  | bat-a-deliverability.png |  |
| BAT-EMPTY | Home | Empty campaigns | Open Home | Honest empty state, not fabricated zeros |  |  |  | bat-empty-home.png |  |
| BAT-LOADING | Home | Initial load | Observe first paint | Loading copy, then content; no layout crash |  |  |  | bat-loading-home.png |  |
| BAT-DISCONNECTED | Analytics | Provider disconnected | Open Analytics | Unavailable / Not connected |  |  |  | bat-disconnected-analytics.png |  |
| BAT-PAUSED | Registry | Paused campaign | Open registry | Paused status; Resume available, Send absent |  |  |  | bat-paused-registry.png |  |
| BAT-STOPPED | Registry | Stopped campaign | Open registry | Stopped is terminal; not Completed |  |  |  | bat-stopped-registry.png |  |
| BAT-VALIDATION | Review | Missing unsubscribe / unresolved token | Attempt approval | Blocking validation, not silent send |  |  |  | bat-validation-review.png |  |

---

## B. Functional BAT

| BAT ID | Screen / route | Starting fixture | Action | Expected | Actual | P/F | Comments | Evidence | Sev |
|---|---|---|---|---|---|---|---|---|---|
| BAT-B-SAVE | Builder | Creator user | Save Draft | Status remains Draft; not Approved |  |  |  | Automated BAT-01 / BAT-12 |  |
| BAT-B-SUBMIT | Builder | Saved draft | Submit for review | Moves to Awaiting approval; does not schedule or run |  |  |  |  |  |
| BAT-B-APPROVE | Review | Approver user | Approve | Content and audience freeze; does not auto-schedule |  |  |  | Automated BAT-07 |  |
| BAT-B-SCHEDULE | Review | Approved campaign | Schedule simulation | Schedule recorded; does not auto-run; no cron |  |  |  | Automated BAT-01 / BAT-13 |  |
| BAT-B-PAUSE | Monitoring / registry | Running campaign | Pause | Execution position retained; not completed |  |  |  | Automated BAT-14 |  |
| BAT-B-RESUME | Registry | Paused campaign | Resume | Continues at next eligible recipient |  |  |  | Automated BAT-14 |  |
| BAT-B-STOP | Registry | Running or paused | Type STOP and confirm | Terminal Stop; not marked Completed |  |  |  | Automated BAT-14 |  |
| BAT-B-NEXT-BATCH | Monitoring | Authorised operator | Run Next Batch + confirm RUN | Next 100 only; no duplicates |  |  |  | Automated BAT-14 |  |
| BAT-B-RETRY | Monitoring | Eligible failure | Retry + confirm RETRY | Only eligible failures retried; suppressed not retried |  |  |  | Automated BAT-14 / BAT-16 |  |
| BAT-B-SUPPRESSION | Consent Centre | Frozen audience recipient | Record unsubscribe | Future delivery blocked; snapshot history preserved |  |  |  | Automated BAT-16 |  |
| BAT-B-QUALIFICATION | Qualification Inbox | Engaged recipient | Mark QUALIFIED | Contact/Opportunity only after explicit qualification |  |  |  | Automated BAT-18 |  |
| BAT-B-CONTACT-REUSE | Qualification Inbox | Existing fixture Contact | Qualify same email | Existing Contact reused; blanks do not overwrite |  |  |  | Automated BAT-18 |  |
| BAT-B-ATTRIBUTION | Analytics | Qualified + Opportunity amount | Inspect ROI / revenue | Opportunity amount is not recognised revenue; ROI Unavailable |  |  |  | Automated BAT-19 |  |

---

## C. Negative BAT

| BAT ID | Screen / route | Starting fixture | Action | Expected | Actual | P/F | Comments | Evidence | Sev |
|---|---|---|---|---|---|---|---|---|---|
| BAT-C-UNAUTH | `/admin/marketing` | User without Marketing permission | Open module | 403 / permission denied |  |  |  | Automated BAT-01 |  |
| BAT-C-WORKBOOK | Audience source | Fixture mode | Enter arbitrary spreadsheet ID | Rejected `UNAUTHORISED_WORKBOOK` |  |  |  | Automated BAT-04 |  |
| BAT-C-MAPPING | Column mapping | Suggested map | Freeze without confirm | `MAPPING_NOT_CONFIRMED` |  |  |  | Automated BAT-05 |  |
| BAT-C-TOKEN | Personalisation | `{{companyName}}` unmapped | Approve | Unresolved token blocks approval |  |  |  | Automated BAT-09 |  |
| BAT-C-UNSUB | Visual editor | Remove unsubscribe block | Approve | `MARKETING_UNSUBSCRIBE_REQUIRED` |  |  |  | Automated BAT-08 |  |
| BAT-C-SENDER | Review | Unverified / simulated sender | Production-capable approval | Sender not eligible |  |  |  | Automated BAT-20 / 013 |  |
| BAT-C-DUP | Eligibility | Duplicate email row | Approval scan | Counted as duplicate; not eligible |  |  |  | Automated BAT-06 |  |
| BAT-C-SUPPRESSED | Eligibility | Unsubscribed / hard bounce | Approval scan | Counted suppressed; not eligible |  |  |  | Automated BAT-06 / BAT-16 |  |
| BAT-C-INVALID | Eligibility | `not-an-email` | Approval scan | Invalid address; not eligible |  |  |  | Automated BAT-06 |  |
| BAT-C-EXECUTION | Safety | Execution flag false | Attempt live send | Refused; TEST MODE |  |  |  | Automated BAT-20 |  |
| BAT-C-PROVIDER | Monitoring | Provider disconnected | Read delivered/opened | Unavailable / Not connected |  |  |  | Automated BAT-17 |  |
| BAT-C-CRON | `/api/cron/marketing-pacing` | Cron unregistered | GET/POST dormant route | 403 `CRON_NOT_ACTIVATED` |  |  |  | Automated BAT-20 |  |

---

## Recommended tomorrow sequence

1. Visual pack A (Home → Registry → Builder → Preview → Review) — ~35 min  
2. Functional pack B (Save → Submit → Approve → Pause/Resume/Stop simulation) — ~40 min  
3. Negative pack C — ~25 min  
4. Confirm blockers in section D remain unauthorised — ~5 min  

Automated runner: `npm run verify:co-marketing-redesign-bat-001` (local fixtures only).
