# CO-CONTACT-IDENTITY-001 — Enterprise Contact Restore Experience

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Priority:** P0  
**Deploy:** Not deployed (PO hold)

## Architecture (unchanged)

- Enterprise Contact Registry remains SSOT
- Soft delete approved — history retained
- Unique constraint `ecm_contacts_org_mobile_key` unchanged
- No partial unique indexes
- No duplicate identities

## Flow

```
User enters mobile
 → GET /api/ecm/contacts/identity
 → Active → Open Existing
 → Soft-deleted → Restore Contact Dialog
 → None → Create New
```

Create POST never inserts when soft-deleted/active exists. P2002 is mapped to business guidance (never raw Prisma).

## Restore

- Same Contact ID via `softDeleteApi.restore` / Recovery Center adapter
- Preserves Opportunities · Activities · Documents · Timeline · Relationships
- No "Create New Anyway"

## Recovery Center

- Route: `/admin/enterprise-recovery-center`
- Administration Console tile + nav entry "Enterprise Recovery Center"
- Contacts · Documents · Partners · Tasks (live modules per soft-delete adapters)

## Key paths

| Concern | Path |
|---------|------|
| Identity resolve | `ecmContactService.resolveIdentityByMobile` |
| Errors | `server/services/ecm/contact-identity-errors.ts` |
| Dialog | `restore-contact-dialog.tsx` |
| Create UIs | progressive modal · quick wizard |

## BAT checklist

- [ ] Soft-deleted mobile → Restore dialog (not P2002)
- [ ] Restore reactivates same ID
- [ ] Active mobile → Open Existing
- [ ] New mobile → Create
- [ ] Recovery Center reachable from Administration
- [ ] No "Create New Anyway"
