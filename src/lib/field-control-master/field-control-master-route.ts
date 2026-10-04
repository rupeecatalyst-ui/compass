/**
 * Field Control Master administration route family.
 * Used only to hide the operational ticker on this module, including child routes.
 */
const FIELD_CONTROL_MASTER_ADMIN_PATH = "/admin/field-control-master";

export function isFieldControlMasterAdminPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === FIELD_CONTROL_MASTER_ADMIN_PATH ||
    pathname.startsWith(`${FIELD_CONTROL_MASTER_ADMIN_PATH}/`)
  );
}
