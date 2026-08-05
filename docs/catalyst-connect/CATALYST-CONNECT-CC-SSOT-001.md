# CC-SSOT-001 — Partner IDC Master SSOT Hotfix

Status: Implemented · BAT defect rectification  
Programme: Catalyst Connect SSOT Constitution

## Defects addressed

1. City → `city_search` + `GET /api/partner/masters/cities` (Enterprise City Master)
2. PAN & DOB removed from Enterprise IDC Partner catalog (Borrower Information section retired)
3. Dropdown contrast → `EnterpriseMasterSelect` / city / lender lists (dark bg, white text, hover/selected)
4. Property Type → `select` + `optionSets.propertyType` from `PROPERTY_TYPES`
5. BT Current Lending Institution → `lender_search` + `GET /api/partner/masters/lenders` (Enterprise Lender Registry)
6. Property Usage → occupancy master option set; selects use SSOT optionSets only

## Removed hardcoded / free-text controls

| Field | Was | Now |
|-------|-----|-----|
| city / propertyCity | free text | city_search → City Master API |
| propertyType | free text | select ← PROPERTY_TYPES |
| propertyUsage | free text | select ← Occupancy master |
| currentLendingInstitution | free text | lender_search → Lender Registry API |
| pan / dateOfBirth | IDC text fields | **Removed** from IDC catalog |

## SSOT endpoints consumed

| Endpoint | Purpose |
|----------|---------|
| `GET /api/partner/opportunity-journey/config` | IDC fields + optionSets |
| `GET /api/partner/masters/cities?q=` | City Master type-ahead |
| `GET /api/partner/masters/lenders?q=` | Lender Registry type-ahead |

No Connect-local city/lender/property masters.
