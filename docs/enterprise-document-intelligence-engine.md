# Enterprise Document Intelligence Engine (EDIE) — Architecture

**Sprint:** Catalyst One Sprint 11 (CF-S11-001)  
**Version:** 11.0.0  
**Status:** Foundation (in-memory, business-agnostic)

---

## Purpose

EDIE is the canonical enterprise document domain for Catalyst One. Every module must reference EDIE instead of maintaining independent document stores.

A document is an **Enterprise Asset**. It is NOT a loan attachment. Documents may be referenced simultaneously by Customers, Partners, Opportunities, Loans, Properties, Workflows, Tasks, and future modules.

**Non-goals:** No OCR implementation, AI extraction implementation, physical storage, UI, APIs, or database integration.

---

## Frozen Architecture Principles

1. **Enterprise Document ID is immutable** — filename may change; ID never changes.
2. **Documents are immutable** — corrections create new versions; existing versions are never overwritten.
3. **Metadata and references only** — EDIE stores document metadata and storage references, not physical files.
4. **Replaceable storage providers** — storage adapters are swappable without changing business logic.

---

## Core Domain Models

| Model | Type |
|-------|------|
| Enterprise Document | `EdieDocumentMasterRecord` |
| Enterprise Document ID | `EdieEnterpriseDocumentId` |
| Document Master Record | `EdieDocumentMasterRecord` |
| Document Profile | `EdieDocumentProfile` |
| Document Type | `EdieDocumentType` |
| Document Category | `EdieDocumentCategory` |
| Document Classification | `EdieDocumentClassification` |
| Document Version | `EdieDocumentVersion` |
| Document Revision | `EdieDocumentRevision` |
| Document Status | `EdieDocumentLifecycleStatus` |
| Document Owner Reference | `EdieDocumentOwnerReference` |
| Document Subject Reference | `EdieDocumentSubjectReference` |
| Document Relationship | `EdieDocumentRelationship` |
| Document Metadata | `EdieDocumentMetadata` |
| Document Tag | `EdieDocumentTag` |
| Document Checklist | `EdieDocumentChecklist` |
| Checklist Item | `EdieChecklistItem` |
| Document Requirement | `EdieDocumentRequirement` |
| Verification | `EdieVerification` |
| Verification Result | `EdieVerificationResult` |
| Validation | `EdieDocumentValidation` |
| OCR Reference | `EdieOcrReference` |
| AI Extraction Reference | `EdieAiExtractionReference` |
| Digital Signature Reference | `EdieDigitalSignatureReference` |
| Hash Reference | `EdieHashReference` |
| Retention Policy | `EdieRetentionPolicy` |
| Expiry Policy | `EdieExpiryPolicy` |
| Archive Policy | `EdieArchivePolicy` |
| Upload Policy | `EdieUploadPolicy` |
| Storage Reference | `EdieStorageReference` |
| Timeline | `EdieDocumentTimelineEntry` |
| Audit Reference | `EdieDocumentAuditReference` |

---

## Subject Reference Model

Documents may reference: Customer, Partner, Organization, Employee, Opportunity, Loan, Property, Workflow, Task, Case, Product, Document.

Relationships are first-class entities.

---

## Upload Policy (Configuration-Driven)

Configurable via `EdieUploadPolicy`:

- Maximum file size, allowed extensions, allowed MIME types
- Multiple/bulk upload, password-protected files
- Compression, preview, OCR/AI/signature eligibility
- Virus scan, encryption, storage provider

27+ default file types registered; new types added without code changes.

---

## Document Lifecycle

Draft → Uploaded → Verified → Approved → Active → Expired → Archived → Destroyed

---

## Validation

| Rule | Function |
|------|----------|
| Duplicate document | `validateEdieDocument` |
| Duplicate hash | `validateEdieHashReference` |
| Invalid version | `validateEdieDocumentVersion` |
| Circular relationships | `validateEdieDocumentRelationship` |
| Checklist validation | `validateEdieChecklist` |
| Verification consistency | `validateEdieVerification` |
| Retention validation | `validateEdieRetentionPolicy` |
| Expiry validation | `validateEdieExpiryPolicy` |
| Upload policy validation | `validateEdieUploadPolicy` |

---

## Architecture

**Ports:** `getEdiePorts()`, `configureEdiePorts()`, `resetEdieComposition()`

**Modules:**
- `document-registry.ts` — registration, versioning, lifecycle
- `relationship-registry.ts` — document relationships
- `metadata-registry.ts` — document metadata
- `checklist-registry.ts` — checklists, items, requirements
- `verification-registry.ts` — verification, hash, OCR/AI/signature refs
- `retention-registry.ts` — retention, expiry, archive policies
- `upload-policy-registry.ts` — upload policies and file types
- `storage-registry.ts` — storage references
- `timeline-registry.ts` — document timeline
- `validation-engine.ts` — domain validation
- `audit-integration.ts` — EAF audit bridge

---

## Engine Integration (Conceptual)

| Engine | Integration |
|--------|-------------|
| EAF | Documents as enterprise assets; audit via `appendEafAuditEntry` |
| EC360 | Subject references to customers |
| EPNE | Subject references to partners |
| EOWE | Subject references to organizations |

---

## Foundation Validation

Run `runEdieFoundationValidation()` to verify registration, versioning, relationships, checklists, verification, policies, storage refs, timeline, search, and rejection scenarios.

---

## File Layout

```
src/types/enterprise-document-intelligence-engine.ts
src/types/enterprise-document-intelligence-engine-ports.ts
src/constants/enterprise-document-intelligence-engine/
src/constants/enterprise-document-intelligence-engine-exports.ts
src/lib/enterprise-document-intelligence-engine/
docs/enterprise-document-intelligence-engine.md
```
