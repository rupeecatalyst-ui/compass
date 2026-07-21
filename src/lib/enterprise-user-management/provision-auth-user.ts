/**
 * Bridge Enterprise User Management → Prisma auth provisioning (Pilot Phase 1).
 */

import { apiRequest } from "@/lib/api-client";
import { unwrapResponse } from "@/lib/response-handler";
import { getEnterpriseUserByContactId, listEnterpriseUsers, updateEnterpriseUser } from "./store";
import type { EnterpriseManagedUser } from "@/types/enterprise-user-management";
import type { Role } from "@/constants/roles";

export interface ProvisionAuthUserResponse {
  authUserId: string;
  email: string;
  temporaryPassword: string;
  mustChangePassword: true;
  createdBy: string;
  createdAt: string;
}

function mapEumRoleToAuthRole(user: EnterpriseManagedUser): Role {
  const primary = user.roles[0]?.roleId ?? "";
  if (primary.includes("super_admin") || primary.includes("admin")) return "ADMIN";
  if (primary.includes("branch_mgr") || primary.includes("management")) return "MANAGER";
  if (primary.includes("credit") || primary.includes("ops") || primary.includes("rm")) {
    return "ANALYST";
  }
  return "VIEWER";
}

export async function provisionAuthUserForEnterpriseUser(
  user: EnterpriseManagedUser,
  actor: { id: string; name: string },
): Promise<ProvisionAuthUserResponse> {
  const managerEumId = user.reportingManagerIds[0];
  let reportingManagerAuthUserId: string | null = null;
  if (managerEumId) {
    const manager = listEnterpriseUsers().find((u) => u.id === managerEumId);
    if (manager?.authUserId) reportingManagerAuthUserId = manager.authUserId;
  }

  const response = await apiRequest<ProvisionAuthUserResponse>({
    method: "POST",
    url: "/api/admin/users/provision",
    data: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId,
      mobile: user.mobile,
      department: user.department,
      role: mapEumRoleToAuthRole(user),
      reportingManagerAuthUserId,
      eumUserId: user.id,
    },
  });

  const result = unwrapResponse(response);
  updateEnterpriseUser(
    user.id,
    { authUserId: result.authUserId },
    actor,
    "password_reset",
    "Login credentials provisioned with temporary password",
  );
  return result;
}

export function getAuthUserIdForContact(contactId: string): string | undefined {
  const id = getEnterpriseUserByContactId(contactId)?.authUserId;
  return id ?? undefined;
}

/** Activate EUM user + allocate license + provision Prisma login when DATABASE is configured. */
export async function activateEnterpriseUserWithLogin(
  userId: string,
  actor: { id: string; name: string },
): Promise<{ temporaryPassword?: string; email?: string }> {
  const { allocateEnterpriseLicense, getEnterpriseUser } = await import("./store");
  const { setUserLoginStatus } = await import("./iam-lifecycle");
  const user = getEnterpriseUser(userId);
  if (!user) throw new Error("User not found");

  setUserLoginStatus(userId, "active", actor);
  if (!user.license.allocated) {
    allocateEnterpriseLicense(userId, "Producer", actor);
  }

  if (user.authUserId) {
    return {};
  }

  try {
    const result = await provisionAuthUserForEnterpriseUser(
      getEnterpriseUser(userId) ?? user,
      actor,
    );
    return { temporaryPassword: result.temporaryPassword, email: result.email };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Login provisioning failed";
    if (msg.includes("Database required") || msg.includes("503")) {
      return {};
    }
    throw e;
  }
}
