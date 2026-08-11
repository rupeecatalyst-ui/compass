# CO-CCC-001 — Entity Relationship Diagram

```mermaid
erDiagram
  Organization ||--o{ OrganizationDocument : owns
  Organization ||--o{ CccLegalEntity : owns
  Organization ||--o{ CccInstitutionProfile : owns
  Organization ||--o{ CccDocumentPackageDefinition : owns
  Organization ||--o{ CccDispatch : owns

  CccLegalEntity ||--o{ OrganizationDocument : scopes
  CccLegalEntity ||--o{ CccDocumentPackageInstance : scopes
  CccLegalEntity ||--o{ CccDispatch : scopes

  CccInstitutionProfile ||--o{ CccInstitutionRequirement : requires
  CccInstitutionProfile ||--o{ CccDispatch : receives

  CccDocumentPackageDefinition ||--o{ CccDocumentPackageInstance : builds
  CccDocumentPackageDefinition ||--o{ CccDispatch : templates

  CccDocumentPackageInstance ||--o{ CccDispatch : sources

  CccDispatch ||--|{ CccDispatchItem : contains
  OrganizationDocument ||--o{ CccDispatchItem : attached

  OrganizationDocument {
    string id PK
    string organizationId FK
    string legalEntityId FK
    string repositoryKey
    string financialYear
    boolean isCurrentFinancialVersion
    string approvalStatus
    datetime expiryDate
  }

  CccLegalEntity {
    string id PK
    string organizationId FK
    string code
    string legalName
    boolean isPrimary
  }

  CccInstitutionProfile {
    string id PK
    string organizationId FK
    string institutionType
  }

  CccInstitutionRequirement {
    string id PK
    string institutionId FK
    string documentTypeId
    boolean mandatory
  }

  CccDocumentPackageDefinition {
    string id PK
    string code
    json itemSpecsJson
  }

  CccDocumentPackageInstance {
    string id PK
    json resolvedDocumentIdsJson
    string status
  }

  CccDispatch {
    string id PK
    string status
    string recipientEmail
  }

  CccDispatchItem {
    string id PK
    string dispatchId FK
    string organizationDocumentId FK
  }
```

## Notes

- **OrganizationDocument** remains the sole binary SSOT; CCC fields are compliance metadata only.
- **Compliance alerts** are not persisted — computed by `deriveComplianceIntelligence`.
- Supersession chain uses `OrganizationDocument.supersededByDocumentId` (self-reference by ID, no FK constraint).
