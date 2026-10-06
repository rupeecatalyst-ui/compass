# Catalyst One Custom Email product direction

Recorded from the product direction addendum of 7 October 2026.
This roadmap describes subsequent refinements; it does not authorize their implementation in the current recipient and attachment task.

## Current scope

Professional transaction-aware composer: From, multiple To, multiple Cc, Subject, Message and Attachments.
Resolve authorized recipients through existing Contact, User and lender-contact SSOT identities, never arbitrary browser email text.
Always enforce the current authenticated User SSOT email in CC, with no removable control and no duplicate SMTP delivery.
Upload from computer through the existing Document Workspace / Enterprise Document Registry path.
Removing a selection from an email preserves the registered document.
Preserve the existing dispatch architecture and fail-closed transaction authorization; reset recipient and attachment selections on context changes.

## Subsequent refinement sequence

Each phase is a separate focused refinement with its own acceptance tests.

1. **Templates, governed smart fields and user signature.** Centrally managed editable Subject/Message templates: Initial Document Request, Pending Documents Reminder, Sanction Letter Sharing, Query to Lender, Approval Communication, Disbursement Follow-up, Welcome / Thank You. Resolve CustomerName, OpportunityNumber, DealNumber, LenderName, LoanAmount, Product and RMName from authoritative SSOT; never fabricate missing values. Append the authenticated user's centrally approved signature.
2. **Choose from Document Workspace, attachment preview and Insert Pending Documents.** Select only authorized existing documents for the current transaction, without duplicating binary storage. Show filename, size, category where available, Preview and Remove from email. Insert genuinely outstanding documents from the current Opportunity's governed Document/LOD state; never infer pending items.
3. **Draft autosave, send confirmation and delivery/retry UX.** Scope drafts by organization, authenticated user, Opportunity and applicable Deal; never restore A's draft under B. Consider confirmation with recipient/attachment counts. Expose authoritative Queued/Sent/Failed states; show Delivered only with reliable provider support. Retry must avoid unnecessary duplicate communication records.
4. **Reply, Reply All and Forward.** Reuse existing Communication/Activity history and retain the correct Opportunity/Deal context.
5. **Ask CHANAKYA to Draft.** Use authorized current transaction and Document Workspace context to draft only. The authenticated user reviews, edits and explicitly sends; CHANAKYA must never send autonomously.

## Supporting product direction

- Recipient intelligence: show name, email and identity type; lender contacts should eventually show institution context.
- Recent recipients: scoped to the current Opportunity/Deal, never an uncontrolled global list.
- Communication history: reuse existing Communication/Activity evidence for sender, To, Cc, subject, message snapshot, attachment references, timestamp, status and transaction context. Do not create a second audit system.
- Secure Document Link: introduce separately when governed sharing is ready, with opaque access, expiry, revocation, authorization and audit. Do not build it in the current task.
- Keep attachment controls grouped so future upload, document-selection and preview actions can be added locally.

No future feature above is implemented by merely recording this direction. Current task change control remains: no push, deployment or real email send.
