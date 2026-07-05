import type { Role } from "@/constants/roles";
import type { NavGroup } from "@/config/navigation";
import { hasAnyRole } from "@/lib/permissions";

export function filterNavigationByRole(groups: NavGroup[], userRole?: Role): NavGroup[] {
  if (!userRole) {
    return groups.filter((group) => !group.roles);
  }

  return groups
    .filter((group) => !group.roles || hasAnyRole(userRole, group.roles))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || hasAnyRole(userRole, item.roles)),
    }))
    .filter((group) => group.items.length > 0);
}
