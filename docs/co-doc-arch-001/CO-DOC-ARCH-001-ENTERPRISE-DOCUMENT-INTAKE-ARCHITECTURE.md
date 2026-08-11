# CO-DOC-ARCH-001 — Enterprise Document Intake (All Channels)

Status: **ARCHITECTURE FROZEN** · Additive alignment only · No Vercel deploy  
Date: 2026-08-10  
Authority: Product Owner Architectural Decision

## Decision

Catalyst One remains the **single Document SSOT**. Walk-in, Direct/COMPASS, and Wealth Partner are **intake channels** into the same Enterprise Document architecture — not separate document products.

## A. Existing document architecture

| Layer | Role | Path |
|---|---|---|
| Opportunity Document Center | Authoring workspace (only) | `src/components/catalyst-one/document-center/` |
| Enterprise Document Registry (client) | Metadata + blob cache | `src/lib/document-registry/` · `src/types/document-registry.ts` |
| `EnterpriseTransactionDocument` | Durable Postgres SSOT | `prisma/schema.prisma` · `server/services/enterprise-transaction-documents/` |
| Document Requests / LOD | Requirement workflow (not storage) | `src/lib/document-requests/` |
| EDIE / programme LOD | Requirement derivation | `src/lib/edie-certified/` · `resolve-program-lod.ts` |
| Document Packages | Folder intake into same registry | CO-DOC-003/005 |
| Document Intelligence | Classification assists (C1-owned) | `classify-upload.ts` · EDIE |

Constitutional governance: `.cursor/rules/opportunity-document-center-governance.mdc` · `.cursor/rules/enterprise-document-intake.mdc`

## B. Current intake channels

| Channel | How documents enter SSOT today | `uploadSource` |
|---|---|---|
| **Walk-in / internal** | Document Center / Documents workspace employee upload | `manual_upload` (and related internal paths) |
| **Direct / COMPASS** | Opaque-token portal `/document-upload/[token]` · ECE projections · `ingestCustomerPortalDocument` | `customer_portal` |
| **Wealth Partner** | Partner Gateway `POST /api/partner/opportunities/:id/documents` → `upsertPartnerOpportunityDocument` | `wealth_partner` |
| Other retained | Lender portal, email/whatsapp stamps, API, folder package, conversation activity | existing enum values |

## C. Enterprise Document SSOT confirmation

**Confirmed.** One store. No `WealthPartnerDocument` / `CompassDocument` / `WalkInDocument` models. Partner and customer portals **project** Enterprise Documents; they do not own them.

## D. Wealth Partner integration

- Gateway ownership + entitlement before document APIs.
- Upload/list/delete project `EnterpriseTransactionDocument` via `partner-ssot-projections.ts`.
- LOD readiness projected from Catalyst One Document Requests / partner business service — checklist **not** reimplemented in WP App.
- WP App remains presentation (`LodItemUploader` / opportunity documents workspace).

## E. Direct / COMPASS integration

- Secure token portal + ECE document centre project Document Requests onto customer UX.
- Uploads call `ingestCustomerPortalDocument` → Enterprise Document Registry with `customer_portal`.
- Public COMPASS borrower freeform “Documents I have” inbox is an **approved presentation direction**; current portal is still largely LOD-item driven (see Limitations).

## F. Walk-in compatibility

- Existing Document Center workflows unchanged by this architecture freeze.
- Additive channel map only; no replacement of internal upload/verification desks.

## G. Requirement architecture

Authoritative checklist remains Catalyst One:

Opportunity (+ product / borrower / constitution / programme where applicable) → EDIE / `resolveProgramLod` / Document Requests → participant-scoped items.

COMPASS and Wealth Partner **must not** duplicate policy→document mapping.

## H. Document lifecycle

Upload ≠ verified ≠ requirement satisfied.

Document Requests item statuses (workflow):  
`pending` → `requested` → `uploaded` → `under_verification` → `verified` | `rejected` | `re_upload_required`

Registry record status remains operational (`active` / `archived` / `deleted`) with optional `verifiedAt` / `verifiedBy`.

No channel-specific status engines.

## I. Participant handling

- Links: `participantId` · `documentScope` (`applicant` | `shared` | `lender`)
- Document Center participant selector is SSOT for internal association.
- External uploaders may omit / mis-know participant — prefer intake + C1 classification (`doc:other:*` / Other Documents) over forced incorrect metadata.

## J. Security

| Channel | Gate |
|---|---|
| Wealth Partner | Partner Gateway access token · ownership · entitlements |
| Direct | Opaque upload / engagement token · customer-scoped session |
| Walk-in | Existing Catalyst One internal permissions |

No channel may bypass Catalyst One authorization.

## K. Audit

Retained on document / version rows today:

- `uploadSource` (channel)
- `uploadedBy` / version `uploadedBy`
- `uploadedAt` / `createdAt` / `updatedAt`
- `opportunityId` · `contactId` · `customerId` · `participantId` · `loanFileId` (when known)
- Document Request session audit (portal actions)

**Gap (documented, not silently invented):** first-class `partnerId` / `employeeId` / `uploaderType` columns are not on `EnterpriseTransactionDocument`. Today partner/employee identity rides `uploadedBy` string + gateway audit context. Additive schema for structured uploader identity requires a future PO-approved migration if mandated beyond current strings.

## L. Files changed (this sprint)

- `.cursor/rules/enterprise-document-intake.mdc` (new)
- `docs/co-doc-arch-001/CO-DOC-ARCH-001-ENTERPRISE-DOCUMENT-INTAKE-ARCHITECTURE.md` (this file)
- `src/constants/document-intake/index.ts` (new)
- `src/types/document-registry.ts` (`wealth_partner` added to uploadSource union)
- `server/services/partner-gateway/partner-ssot-projections.ts` (use channel map)
- `src/lib/document-requests/upload-engine.ts` (use channel map)
- `scripts/co-doc-arch-001-verify.mjs` (new)

## M. Database changes

**None.** `upload_source` already exists as `String?` on `EnterpriseTransactionDocument`. No truncate/reset.

## N. APIs changed

**None** (contracts unchanged). Partner and customer upload routes continue; only internal stamp source uses the shared channel map constant.

## O. Verification

`node scripts/co-doc-arch-001-verify.mjs` — structural PASS expected.

## P–Q. TypeScript / Build

Run locally as part of completion gate (no Vercel deploy).

## R. Limitations (future PO sprints — do not workaround with parallel stores)

1. **Freeform Document Inbox** (“Documents I have” without checklist type) is constitutional UX direction; WP and Direct portals today still primarily bind uploads to LOD `typeRef`. Unclassified intake should reuse `doc:other:` / Other Documents + C1 review — implementation is a follow-on UX sprint, not a new SSOT.
2. **Structured uploader identity** (`partnerId` / `employeeId` / `uploaderType`) not first-class on ETD — additive migration only if PO requires beyond `uploadedBy` + gateway context.
3. **Deal association** optional; Opportunity association is primary for Document Center. External parties must not be forced to know Deal IDs. Deal checklist links (`EnterpriseDealDocumentLink`) remain a **Deal-scoped projection/link layer** — not a second binary store; do not expand it into a competing document SSOT.
4. **Presentation copy** differs by channel; requirements must remain one set.
5. **Lifecycle fragmentation** — review/requirement satisfaction lives on Document Requests / LOD / Deal-link statuses; Registry/ETD binary status stays operational (`active` / archived / deleted). Do **not** invent a third channel-specific status engine; any unification must be additive and C1-owned.
6. **External participant stamp** — Partner and customer portal uploads currently default `documentScope: "shared"` (no participant). Final applicant association remains Catalyst One Document Center authority.
7. **Direct portal session durability** — Document Requests upload sessions are still largely client/token-local; server-authoritative session APIs are a future hardening sprint (must still write binaries only to Document Registry / ETD).
8. **Document Intelligence** — operational classify/extract remains C1-owned (EDIE Certified + foundation ports). Do not build parallel AI engines in COMPASS or Wealth Partner.

### Inspection note (post-architecture explore)

Independent codebase exploration confirmed the same SSOT spine and the gaps above. Items already closed by this architecture freeze (do not re-open as missing):

- Business channels `WALK_IN` / `DIRECT` / `WEALTH_PARTNER` mapped onto existing `uploadSource` (not a second enum store)
- `wealth_partner` included on `DocumentRegistryUploadSource`
- Constitutional rule + verify script forbidding parallel WP/Compass/Walk-in document models

## Implementation rule reminder

Before any new WP / COMPASS document feature: reuse this SSOT. If blocked, STOP and produce Architecture Impact Report — never invent a second document store.
