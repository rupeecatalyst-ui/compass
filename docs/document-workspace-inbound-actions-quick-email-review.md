# Document Workspace inbound actions and Quick Email review

Status: verified for local review. Full repository builds remain blocked by baseline Prisma/client drift; this is not release certification.

Base: `935ba1a5adde4ac0de027ab5d52723d33a896646`, in an isolated detached worktree at `.tmp/document-workspace-inbound-actions`. The original workspace was at `8b3c66317739802883c63f4c87dbdfcda446a0fe` and predates the released Custom Email implementation. Only this task's edits were transferred; the original workspace's existing PWA edits were preserved.

## Root cause and architecture

Code tracing found that review mutations already existed, but the UI silently returned when a required reason was absent, shared type/reason state across every row, ignored HTTP failures, lacked exception cleanup, and refreshed only the review list. The queue returned resolved dispositions. Confirm/change trusted arbitrary type references and browser labels. Review writes did not check evidence identity or stale state. Table/preview seen actions used client version IDs rather than the server's seen key and cleared badges even after failed responses.

The path reused is inbound ingestion → inbound message/attachment ledger → Enterprise Transaction Document Registry → existing inboundClassificationJson → refinement-014 API → reviewInboundAttachment/markDocumentVersionSeen → canonical access resolver and existing Document Workspace audit service. No ingestion, storage, classification-state, composer, recipient, dispatch, draft or audit architecture was added.

## Corrections

- Confirm validates authenticated review access, organization/transaction membership, email and attachment evidence, active/current review state, and the existing EDIE document type master. Unknown, fabricated, quarantined, malformed, missing-evidence and stale items fail closed. It resolves the existing classification snapshot without setting verifiedAt or writing LOD completion.
- Change type exposes the existing master through the shared type resolver; the server independently validates the reference and derives its label. It updates the same registry row, requires the existing minimum-three-character reason, and preserves binary/storage fields.
- Duplicate and Ignore retain the existing DUPLICATE_CANDIDATE/IGNORED dispositions, reason and evidence, remove reviewed dispositions from the active queue, and clear verification eligibility. They create/delete no documents or binaries and write no LOD item. No new original-document link was invented: the existing manual review snapshot has no such link field.
- Mark as seen writes only the existing user/version receipt plus its established audit event. It validates the current server version and transaction. The review item remains unresolved. Workspace preview/table actions now use the server-provided version key, handle failure, prevent repeat requests, and reject stale UI completion.
- Inputs belong to individual rows. Reason controls appear when a change/disposition is requested or validation needs correction. Confirm does not require a reason; Change type, Duplicate and Ignore do. Pending state disables conflicting review actions; a synchronous guard prevents double submits; failures never trigger success/refresh. Successful review refreshes registry, queue and unread state from the server. Finalization changed only the reason editor layout: it now occupies its own row, keeping Confirm/Save type visible when Action Centre is open. The rendered fixture identified and verified this defect.
- Registry remains SSOT. The conditional registry update rejects concurrent/stale writes and advances updatedAt monotonically. Audit retains reviewer, action, transaction, reason, previous/new type/outcome and its existing timestamp. Audit persistence remains best-effort, as in the reused architecture.
- Quick Email is a primary button with the existing Mail icon in the wrapping operations bar. It calls onAction("custom_email"), exactly like Action Centre. The released composer and its custom-mode selection remain unchanged. Opening the composer sends nothing.

## Proof results and limits

`node --import tsx scripts/co-c1-document-workspace-inbound-actions-verify.mjs`: PASS.

The real service functions execute against in-memory persistence/access fixtures. Proofs cover valid Confirm; missing/fabricated types; master label enforcement; required reasons; unchanged binary; duplicate/ignore queue resolution, evidence and readiness safety; wrong actor/transaction/deal/evidence; missing/stale callbacks; concurrent updates; non-email/quarantined/deleted/resolved/malformed states; and seen-only persistence without review resolution. Authorization dependencies are fixtures; canonical access decisions are also exercised by the existing 014B suite, not a live DB integration test. Quick Email, per-row state, pending/error/refresh wiring and wrapping layout have source checks. Changed route/UI files pass syntax transpilation.

`document-workspace-email-attachments-verify.mjs`: PASS on production base. Existing offline proofs cover canonical recipient resolution; multiple TO/CC; mandatory authenticated-user CC; authorization/cross-org rejection; registry attachment identity; safe formats/signatures; upload persistence; no auto-acceptance/LOD matching; stale callbacks; authenticated signature; and actual dispatch callbacks with mock SMTP only.

`document-workspace-action-context-verify.mjs`: PASS on production base. Opportunity/Deal context, A → B isolation, unauthorized/stale handling, reset wiring and no writes/send on email opening pass its contract/source checks.

Exact clean baseline versus candidate legacy comparison: identical failures. 014B and 014C each fail their obsolete 55vw assertion; 014D fails that assertion and one width source-text assertion. All are PRE-EXISTING / OBSOLETE BASELINE ASSERTION, not introduced regressions. Production layout constants and historical tests were not modified. Context-lock-008 passes on both exact baseline and candidate.

Raw TypeScript comparison with identical compiler/dependencies: baseline 295 errors; candidate 308 errors. Multiset comparison finds 16 additional diagnostic occurrences and 3 removed occurrences (net +13). The additional diagnostics reference deletedAt, inboundEmailId, inboundAttachmentId, inboundClassificationJson, dealId and the stale updateMany input type. These fields already exist with their required types in the exact production schema and are already used by baseline source. They are additional locations of the baseline generated-client mismatch, not new invalid schema fields or application type errors. Both raw full checks remain FAIL.

Supplementary schema-consistent TypeScript/static comparison: the compiler reads the same installed declarations with a read-only, in-memory contract for EnterpriseTransactionDocument scalar fields taken mechanically from the unchanged production schema. This checks payload, select, filter, create and update fields with scalar/nullability/operation types; it does not replace declarations with any, suppress diagnostics, regenerate Prisma, modify generated files or connect to a DB. Baseline and candidate each report the same 240 remaining baseline errors; diagnostic multiset delta is empty. Changed production files introduce no genuine new TypeScript error under the production schema contract. Frontend/route syntax and existing focused static checks also pass. BASELINE-NOT-INTRODUCED applies to the outstanding repository/model errors; the full build is not represented as green.

VISUAL VERIFICATION PASS — actual inbound review, operations bar, Action Centre, released mailbox, Radix modal stack and production CSS rendered in the existing repository offline harness. This is a composition fixture, not a signed-in production page. The fixture adds only this task's actual components and safe API responses to the existing harness. Initial bundling needed fixture-boundary corrections, and the first render exposed the reason-row defect described above. Tablet/mobile Quick Email is tested after dismissing the existing modal Action Centre; its backdrop correctly blocks underlying controls while open.

After the layout fix, the harness passes all five visible review actions, Unknown Confirm rejection without mutation, contextual reason text, failed HTTP response without refresh/resolution, double-click protection, seen-only server-key refresh, successful type review resolution, prominent Email, same existing composer, Quick Email → Close → Action Centre Custom Email → Close, ESC/reopen, mandatory CC, multiple recipients, attachment picker, missing-customer behavior, no sends/uploads and no horizontal page overflow at 1440/1280/1024/390. Desktop and mobile screenshots were opened and visually inspected. The already-wide registry table retains its existing internal horizontal scrolling.

Evidence remains locally under .tmp/final-verification: raw and schema-contract diagnostics/deltas, exact baseline legacy logs, the adapted existing visual harness, and screenshots in visual/. Focused service, email/attachment and action-context proofs were rerun after the sole production layout correction and pass.

## Files changed

- server/services/document-workspace/document-workspace-refinement-014.service.ts
- server/services/document-workspace/document-workspace-refinement-014d.service.ts
- src/app/api/document-workspace/refinement-014/route.ts
- src/components/catalyst-one/document-workspace/document-workspace-inbound-review.tsx
- src/components/catalyst-one/document-workspace/document-workspace-ops-bar.tsx
- src/components/catalyst-one/document-workspace/document-workspace.tsx
- scripts/co-c1-document-workspace-inbound-actions-verify.mjs
- docs/document-workspace-inbound-actions-quick-email-review.md

Commit SHA: recorded in the final response after local commit. Commit contains only the six production files, focused proof script and this review document.

Implementation changed after previous stop: YES — reason-editor layout only, to fix the rendered obstruction. Schema change: NO. Migration: NO. Generated Prisma file modification: NO. DB writes: NO (fixtures only). Production documents modified: NO. Real email sent: NO. Real inbound processing: NO. Push: NO. Deployment: NO. Ready for REVIEW: YES. Ready for release: not certified.

No refinement-specific review blocker. Repository-wide compilation remains blocked by BASELINE-NOT-INTRODUCED Prisma/client/model errors. Manual production UI acceptance is still recommended because offline composition fixtures do not certify live authorization/data, but visual verification is available and passed; the unavailable-visual exception is not used to justify this commit. Do not stage the unrelated PWA work.

DOCUMENT WORKSPACE INBOUND ACTIONS + QUICK EMAIL VERIFIED — READY FOR REVIEW
