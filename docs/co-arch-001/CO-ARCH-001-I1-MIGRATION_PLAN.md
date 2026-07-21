# CO-ARCH-001-I1 — Tier 0 Metadata Migration Plan

**Program:** CO-ARCH-001-I1  
**Classification:** INFRA  
**Status:** Ready for deploy  
**Folder:** `prisma/migrations/20260721180000_co_arch_001_i1_tier0_metadata/`

---

## Scope (I1 only)

| Layer | Delivered | Not in I1 |
|-------|-----------|-----------|
| Tier 0 enums | `RegistryStatus`, `RegistryApprovalStatus`, `EnterpriseRegistryModule`, `RegistryImportBatchStatus`, `RegistryAuditAction` | — |
| Tier 0 tables | Audit entries, attachments, import batches | Reference Master table (I2) |
| Server infrastructure | Repositories + audit service | REST APIs (I2) |
| Product impact | **None** | UI, pickers, ECM FK columns |

---

## Objects created

### Enums (5)
- `RegistryStatus`, `RegistryApprovalStatus`, `EnterpriseRegistryModule`, `RegistryImportBatchStatus`, `RegistryAuditAction`

### Tables (3)
- `enterprise_registry_audit_entries`
- `enterprise_registry_attachments`
- `enterprise_registry_import_batches`

### Foreign keys
- All three tables → `organizations.id` (RESTRICT)

---

## Manual deployment step

After code merge / Vercel deploy:

```powershell
npx prisma migrate deploy
```

On Supabase production before claiming I1 live.

---

## Rollback

Forward-only. Rollback = new migration dropping the three tables and five enums (only if no Tier 1 data exists).

---

## Verification

```powershell
node scripts/co-arch-001-i1-verify.mjs
```

---

## Related

- ADR-015 Enterprise Master Data Tier Model
- CO-ARCH-001-I2 Reference Master (next phase)
