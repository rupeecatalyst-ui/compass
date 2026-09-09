import type { Role } from "@/constants/roles";
import {
  EMPLOYEE_PWA_FORBIDDEN_ADMIN_HREFS,
  EMPLOYEE_PWA_MISSION_CONTROL_ROLES,
  EMPLOYEE_PWA_REPORT_ROLES,
  EMPLOYEE_PWA_WORK_MODULES,
} from "@/constants/employee-pwa";

export function employeePwaCanSeeMissionControl(role?: Role | null): boolean {
  if (!role) return false;
  return EMPLOYEE_PWA_MISSION_CONTROL_ROLES.includes(role);
}

export function employeePwaCanSeeReports(role?: Role | null): boolean {
  if (!role) return false;
  return EMPLOYEE_PWA_REPORT_ROLES.includes(role);
}

export function employeePwaWorkModulesForRole(role?: Role | null) {
  return EMPLOYEE_PWA_WORK_MODULES.filter((module) => {
    if (!module.roles.length) return true;
    return Boolean(role && (module.roles as Role[]).includes(role));
  });
}

export function employeePwaHrefIsAdminModule(href: string): boolean {
  const path = href.split("?")[0];
  return EMPLOYEE_PWA_FORBIDDEN_ADMIN_HREFS.some(
    (forbidden) => path === forbidden || path.startsWith(`${forbidden}/`),
  );
}
