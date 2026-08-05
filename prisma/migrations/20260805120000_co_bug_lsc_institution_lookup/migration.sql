-- CO-BUG-LSC-LOOKUP — Institution-scoped Lender Contact lookup indexes
-- Speeds role_profiles.lender_employee.institution filters used by Lender Sales Contact.

CREATE INDEX IF NOT EXISTS ecm_contacts_org_roles_gin_idx
  ON ecm_contacts USING GIN (roles);

CREATE INDEX IF NOT EXISTS ecm_contacts_lender_inst_idx
  ON ecm_contacts (
    (role_profiles -> 'lender_employee' ->> 'institution')
  )
  WHERE is_deleted = false
    AND 'lender_employee' = ANY (roles);

CREATE INDEX IF NOT EXISTS ecm_contacts_lender_inst_label_idx
  ON ecm_contacts (
    (role_profiles -> 'lender_employee' ->> 'institutionLabel')
  )
  WHERE is_deleted = false
    AND 'lender_employee' = ANY (roles);
