# CO-MARKETING-BAT-001 — Overnight BAT Preparation Report

Status: **BAT PREPARATION COMMIT CREATED**  
Readiness: **READY FOR PRODUCT OWNER BAT — LOCAL FIXTURES ONLY**  
Worktree: `C:\Compass by Rupee Catalyst (3)\.tmp\wt-marketing-redesign`  
Date: 2026-09-06

This report is local fixture BAT preparation only. It does not authorise push, Hostinger deploy, Prisma application, live Google Sheets, provider activation, cron activation, or any send.

---

## A. Result

**BAT PREPARATION COMMIT CREATED**

## B. Identity

| Item | SHA |
|---|---|
| BAT-preparation commit | `BAT_COMMIT_SHA_PLACEHOLDER` |
| Parent (must equal certified Marketing commit) | `9395feb7dc0ca65e1986a287903974d93bb9235b` |
| Base Marketing commit | `9395feb7dc0ca65e1986a287903974d93bb9235b` |
| Marketing commit parent | `c2a4ce6851985e6c10afc7a97710cc8d53a64eee` |

Message: `test(marketing): prepare business acceptance certification`

Detached HEAD throughout. Commit `9395feb7…` was not amended.

## C. Automated BAT (`npm run verify:co-marketing-redesign-bat-001`)

Exercises production Marketing contracts with fixture adapters. Fictitious domain `bat.example.rupeecatalyst.test`. Org `org-rc-bat-001-fixture`. Home Loan tab 282 rows / 275 eligible.

| ID | Scenario | Status | Evidence |
|---|---|---|---|
| BAT-01 | Access and permissions | Pass | Operator opens module; USER 403; creator saves draft; creator cannot APPROVE; approver has approve permission; save≠approve; schedule requires approval; PII separate; other-org GET `NOT_FOUND` |
| BAT-02 | Marketing Home | Pass | Draft/Awaiting/Scheduled/Running/Paused/Completed/Failed = 1; qualified/opportunities/pipeline Unavailable or Not connected |
| BAT-03 | Campaign Registry | Pass | Search, status/channel/owner/date filters; Send forbidden on draft; Pause on running; Resume on paused; Stop confirmation required |
| BAT-04 | Google Sheet source | Pass | Fixture workbook only; five tabs listed; arbitrary ID `UNAUTHORISED_WORKBOOK`; no Google credentials in UI or `authenticatedJsonFetch` |
| BAT-05 | Column mapping | Pass | Suggested map for key/name/email/mobile/location/product/consent; confirm required; empty email `INVALID_COLUMN_MAP`; `EMAIL_MAPPING_REQUIRED` remains in confirmed-map contract |
| BAT-06 | Eligibility | Pass | Approval scan uncapped; eligible=275; invalid=1; duplicates=1; suppressed=3; excluded=1; previously contacted=1; scanned=282 |
| BAT-07 | Audience snapshot | Pass | Freeze 275; post-approval Sheet edit/add ignored; worker without snapshot `SNAPSHOT_REQUIRED`; audience edit requires reapproval draft |
| BAT-08 | Template gallery and editor | Pass | Blank/standard/org cards; header/text/image/cta/divider/spacer/footer/unsubscribe; reorder/duplicate/delete; sanitise script/onclick; missing unsubscribe blocks |
| BAT-09 | Personalisation | Pass | firstName/fullName/city/product in catalogue; email/mobile/pan absent; unresolved `companyName` blocking; fallbacks resolve |
| BAT-10 | Preview | Pass | Desktop 600 / mobile 360; unsubscribe verified; CTA in inventory; missing image warning; no runtime error text |
| BAT-11 | Test-send safety | Pass | Test vs production lane titles; gmail rejected; `qa@rupeecatalyst.com` allowlisted; confirmation required; `actuallySent=false`; provider probe 0 |
| BAT-12 | Review and approval | Pass | All `MARKETING_READINESS_REVIEW_LABELS` present; save is not approval |
| BAT-13 | Pacing | Pass | 275 → 100/100/75; ≥60 minute gaps; daily cap 100 rolls 4→5→6 Sep; cron unregistered |
| BAT-14 | Pause, Resume, Stop, Run Next Batch | Pass | Pause keeps cursor; resume batch 2; stop not complete; RUN phrase required; creator cannot run; no duplicate sent emails |
| BAT-15 | Restart and concurrency | Pass | Reconstruct ≥10 completed; idempotency keys preserved; other worker `lease_held_by_other_worker`; expired lease recovered; attempt 3 quarantined |
| BAT-16 | Consent and suppression | Pass | Unsubscribe/bounce/complaint/manual block; expired temporary does not; blank reason rejected; unsubscribe not retryable |
| BAT-17 | Monitoring | Pass | All required metrics; delivered Unavailable/Not connected; identity masked; timeline ≥1 event |
| BAT-18 | Qualification | Pass | delivered/open/click → ENGAGED; enquiry+confirm → RESPONSE_RECEIVED; `manual_qualification` → QUALIFIED; existing Contact reused; blanks do not overwrite; Opportunity reused; CRM create attempts 0 |
| BAT-19 | Attribution | Pass | Chain composed; opportunity amount not recognised revenue; ROI Unavailable |
| BAT-20 | Safety and activation | Pass | execution false; email dry_run; provider false; sheets fixture; handoff fixture; cron unregistered; vercel.json has no marketing-pacing; dormant route contract 403 `CRON_NOT_ACTIVATED`; simulated sender blocked; no production CRM writes |

PostgreSQL durability runtime remains **BLOCKED** (no disposable Postgres). BAT-15 used in-memory reconstruction fixtures only.

## D. Visual BAT pack

| Item | Result |
|---|---|
| Runner | `scripts/marketing-visual-harness/capture-bat.mjs` |
| Manifest | `docs/co-marketing-bat-001/visual-manifest.json` |
| Manifest result | **PASS** 26/26 |
| Screenshots | 26 PNG (gitignored unless Product Owner approves) |
| Desktop | 1440×900 (22 shots) |
| Mobile | 390×844 (4 shots) |
| Harness in `src/app` | No |
| Auth bypass | No |
| Hostinger | Not accessed |
| External requests during capture | None (aborted) |

Production components mapped: MarketingCommandCenter, MarketingCampaignRegistryPanel, MarketingCampaignBuilderPage, MarketingPreviewWorkspace, MarketingCampaignMonitoringWorkspace, MarketingConsentPanel, MarketingResponsesPanel, MarketingAttributionPanel, MarketingAssetsPanel, MarketingDeliverabilityPanel.

Lifecycle / honesty states captured: empty, loading, disconnected analytics, paused, stopped, validation/review, qualification decision, suppression history.

## E. Engineering gates

Safe settings on every run: execution false · email dry_run · Google fixture · handoff fixture · provider disabled · cron unregistered.

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `npx tsc --noEmit` | 0 | PASS |
| 2 | Targeted Marketing ESLint `--max-warnings=0` | 0 | PASS |
| 3–4 | `node --trace-warnings scripts/co-marketing-redesign-pre-staging-gates.mjs` (001–021 + MKT 01–13 + activation-002 + durability) | 0 | PASS · **DEP0190 absent** |
| 5 | `node --import tsx scripts/co-marketing-redesign-bat-001.mjs` | 0 | PASS 20/20 |
| 6 | `node --import tsx scripts/co-marketing-redesign-019b-api-enforcement-verify.mjs` | 0 | PASS |
| 7 | `node scripts/co-marketing-redesign-022-no-cert-route-verify.mjs` | 0 | PASS |
| 8 | `node scripts/co-marketing-redesign-022-migration-static-verify.mjs` | 0 | PASS |
| 9 | `npx prisma validate` with dummy `127.0.0.1` URLs only | 0 | PASS (schema valid; no migrate) |
| — | `node scripts/co-marketing-redesign-022-postgres-runtime-verify.mjs` | 0 | **BLOCKED** (docker/psql absent). Not reported as PASS. |
| 10 | `node scripts/marketing-visual-harness/capture-bat.mjs` | 0 | PASS 26/26 |
| 11 | `node scripts/co-marketing-redesign-safe-next-build.mjs` | 0 | PASS (no Prisma migrate) |
| 12 | Post-build `npx tsc --noEmit` | 0 | PASS |
| 13 | Secret scan of BAT paths | 0 | PASS (no private keys / live tokens) |
| 14 | External-call scan of BAT paths | 0 | PASS (no provider/Sheet/Hostinger calls) |
| 15 | Git scope audit | 0 | PASS (Marketing BAT files only; 9395feb7 not amended) |
| Spawn | `node scripts/co-marketing-redesign-023-spawn-safety-verify.mjs` | 0 | PASS |

Chanakya `tsconfig.server.json` baseline was not modified.

DEP0190: Node 24 Windows returns `EINVAL` for `npm.cmd` with `shell: false`. Aggregate runner now spawns `process.execPath` plus a frozen argument array. `shell: true` is absent. Warning was not suppressed.

## F. Safety confirmation

| Control | Status |
|---|---|
| Git push | Not performed |
| Hostinger / any deploy | Not performed |
| Prisma migrate / db push / seed | Not performed |
| Live database | Not used |
| Live Google Sheet | Not connected |
| Email/WhatsApp/SMS/ads provider | Not connected · dry_run |
| Marketing execution | OFF |
| Production cron / vercel.json pacing | Unchanged / unregistered |
| Contact/Opportunity production write | Fixture handoff only |
| Message sent | None (`actuallySent=false`) |
| Production cert route `/internal/marketing-cert` | Absent |
| Dirty parent checkout | Not used |

## G. Tomorrow’s manual BAT sequence

Use `docs/co-marketing-bat-001/CO-MARKETING-BAT-001-CHECKLIST.md`.

| Order | Pack | Estimate |
|---|---|---|
| 1 | Visual A — Home → Registry → six-step builder → gallery/editor → personalisation → desktop/mobile preview → Review → Monitoring → Consent → Qualification → Analytics → Assets → Deliverability | 35 min |
| 2 | Functional B — Save Draft → Submit → Approve (no auto-schedule) → schedule simulation → Pause/Resume/Stop → Run Next Batch → Retry → suppression → qualification → Contact reuse → attribution | 40 min |
| 3 | Negative C — unauthorised user, arbitrary workbook, unconfirmed mapping, unresolved token, missing unsubscribe, unverified sender, duplicate/suppressed/invalid, execution off, provider disconnected, dormant cron | 25 min |
| 4 | Confirm section D blockers remain unauthorised | 5 min |

Automated re-check: `npm run verify:co-marketing-redesign-bat-001`.

## H. Remaining blockers (not authorised by this pack)

1. Disposable PostgreSQL runtime (BLOCKED — do not install Docker/Postgres for this pack)
2. Migration approval (`prisma/migrations/20260905120000_co_marketing_redesign_durable_foundation` remains unapplied)
3. Google configuration / authorised live workbook
4. Sender / DNS verification
5. Internal test-email allowlist approval for a real mailbox
6. Hostinger deployment
7. Production pacing cron
8. Monitored pilot campaign

## I. Readiness

**READY FOR PRODUCT OWNER BAT — LOCAL FIXTURES ONLY**

Tomorrow’s BAT does **not** authorise migration, push, deployment, live Sheet, test send, provider activation, or cron activation.
