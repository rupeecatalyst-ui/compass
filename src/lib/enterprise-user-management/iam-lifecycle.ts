/**
 * IAM lifecycle — Directory Contact → Platform Access → User Account.
 * Never create User Accounts without a Directory Contact.
 */

import {
  EUM_PLATFORM_ACCESS_LABELS,
  FROZEN_CERTIFICATION_ADMIN_EMAIL,
  defaultPermissionMatrix,
  nextEmployeeId,
} from "@/constants/enterprise-user-management";
import { getEcmContact, updateEcmContact } from "@/lib/enterprise-contact-master";
import type { EcmPlatformAccess } from "@/types/enterprise-contact-master";
import type {
  EnterpriseLoginStatus,
  EnterpriseManagedUser,
  EnterprisePlatformAccess,
} from "@/types/enterprise-user-management";
import { computeEffectivePermissions } from "./effective-permissions";
import {
  getEnterpriseUser,
  getEnterpriseUserByContactId,
  listEnterpriseUsers,
  persistNewUser,
  refreshUserEffectivePermissions,
  setEnterpriseUserRoles,
  updateEnterpriseUser,
} from "./store";

export type GrantablePlatformAccess = Exclude<EcmPlatformAccess, "no_access">;

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Contact", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Grant Platform Access on a Directory Contact.
 * Creates a linked User Account when moving from No Access, or reactivates an existing one.
 */
export function grantPlatformAccessFromContact(input: {
  contactId: string;
  platformAccess: GrantablePlatformAccess;
  actor: { id: string; name: string };
  roleIds?: string[];
}): EnterpriseManagedUser {
  const contact = getEcmContact(input.contactId);
  if (!contact) {
    throw new Error("Directory Contact not found. Create the person in Directory first.");
  }

  const email = (contact.officialEmail || contact.personalEmail || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Contact must have an email before Platform Access can be granted.");
  }

  const existing = getEnterpriseUserByContactId(contact.id);
  if (existing) {
    const updated = updateEnterpriseUser(
      existing.id,
      {
        platformAccess: input.platformAccess,
        loginStatus:
          existing.loginStatus === "archived" || existing.loginStatus === "suspended"
            ? "pending_invitation"
            : existing.loginStatus,
        email,
        mobile: contact.mobilePrimary || existing.mobile,
        fullName: contact.name,
        ...splitName(contact.name),
      },
      input.actor,
      "platform_access_granted",
      `Platform Access set to ${EUM_PLATFORM_ACCESS_LABELS[input.platformAccess]}`,
    );
    updateEcmContact(
      contact.id,
      { platformAccess: input.platformAccess, linkedUserId: existing.id },
      input.actor.id,
    );
    if (!updated) throw new Error("Failed to update User Account");
    return refreshUserEffectivePermissions(updated.id) ?? updated;
  }

  const { firstName, lastName } = splitName(contact.name);
  const now = new Date().toISOString();
  const employeeId = nextEmployeeId(listEnterpriseUsers().map((u) => u.employeeId));

  const user: EnterpriseManagedUser = {
    id: newId("usr"),
    contactId: contact.id,
    employeeId,
    firstName,
    lastName,
    fullName: contact.name.trim(),
    email,
    mobile: contact.mobilePrimary || "",
    avatarInitials: `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "U",
    avatarUrl: null,
    designation: contact.employmentType || "Team Member",
    department: "Unassigned",
    branch: contact.city || "Unassigned",
    departments: ["Unassigned"],
    branches: [contact.city || "Unassigned"],
    teams: [],
    businessUnits: [],
    reportingManagerIds: [],
    reportingManagerNames: [],
    roles: [],
    permissionTemplateIds: [],
    permissionOverrides: [],
    permissions: defaultPermissionMatrix({ dashboard: { view: true }, settings: { view: true } }),
    platformAccess: input.platformAccess,
    loginStatus: "pending_invitation",
    preferences: {
      defaultDashboard: "/dashboard",
      defaultLandingPage: "/dashboard",
      theme: "system",
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      language: "en-IN",
    },
    productivity: {
      presenceStatus: "offline",
      lastLoginAt: null,
      lastActiveAt: null,
      openOpportunities: 0,
      activeLoanFiles: 0,
      pendingTasks: 0,
      pendingApprovals: 0,
    },
    status: "active",
    dateJoined: now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    lastActiveAt: null,
    license: {
      allocated: false,
      licenseType: "Producer",
      allocatedAt: null,
      allocatedBy: null,
    },
    isSystemProtected: email === FROZEN_CERTIFICATION_ADMIN_EMAIL,
    audit: [],
  };

  user.permissions = computeEffectivePermissions(user);
  persistNewUser(user, input.actor, [
    {
      action: "user_created",
      summary: `User Account provisioned from Directory Contact ${contact.name}`,
    },
    {
      action: "platform_access_granted",
      summary: `Platform Access: ${EUM_PLATFORM_ACCESS_LABELS[input.platformAccess]}`,
    },
  ]);

  updateEcmContact(
    contact.id,
    { platformAccess: input.platformAccess, linkedUserId: user.id },
    input.actor.id,
  );

  if (input.roleIds?.length) {
    setEnterpriseUserRoles(user.id, input.roleIds, input.actor);
  }

  return getEnterpriseUser(user.id) ?? user;
}

/**
 * Remove Platform Access — disables login; never deletes Directory Contact or User history.
 */
export function revokePlatformAccessFromContact(input: {
  contactId: string;
  actor: { id: string; name: string };
}): EnterpriseManagedUser | null {
  const contact = getEcmContact(input.contactId);
  if (!contact) throw new Error("Directory Contact not found");

  updateEcmContact(
    contact.id,
    { platformAccess: "no_access", linkedUserId: contact.linkedUserId },
    input.actor.id,
  );

  const user =
    (contact.linkedUserId ? getEnterpriseUser(contact.linkedUserId) : undefined) ??
    getEnterpriseUserByContactId(contact.id);

  if (!user) return null;

  if (user.isSystemProtected) {
    throw new Error("Cannot revoke Platform Access from the frozen Business Certification Admin.");
  }

  return updateEnterpriseUser(
    user.id,
    {
      loginStatus: "archived",
      license: {
        ...user.license,
        allocated: false,
        allocatedAt: null,
        allocatedBy: null,
      },
    },
    input.actor,
    "platform_access_revoked",
    "Platform Access removed — login disabled; Directory Contact retained",
  );
}

export function setUserLoginStatus(
  userId: string,
  loginStatus: EnterpriseLoginStatus,
  actor: { id: string; name: string },
): EnterpriseManagedUser | null {
  const user = getEnterpriseUser(userId);
  if (!user) return null;
  if (user.isSystemProtected && (loginStatus === "archived" || loginStatus === "suspended")) {
    throw new Error("Frozen Business Certification Admin login cannot be suspended or archived.");
  }
  return updateEnterpriseUser(
    userId,
    { loginStatus },
    actor,
    "login_status_changed",
    `Login Status set to ${loginStatus.replace(/_/g, " ")}`,
  );
}

export function syncUserPlatformAccess(
  userId: string,
  platformAccess: EnterprisePlatformAccess,
  actor: { id: string; name: string },
): EnterpriseManagedUser | null {
  const user = getEnterpriseUser(userId);
  if (!user) return null;
  updateEcmContact(
    user.contactId,
    { platformAccess, linkedUserId: user.id },
    actor.id,
  );
  return updateEnterpriseUser(
    userId,
    { platformAccess },
    actor,
    "platform_access_granted",
    `Platform Access set to ${EUM_PLATFORM_ACCESS_LABELS[platformAccess]}`,
  );
}
