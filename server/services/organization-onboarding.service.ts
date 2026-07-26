/**
 * CO-SPRINT-118 — Organization registration & invitation acceptance.
 * Additive services on existing Prisma Organization + User models.
 * Does not change role/permission architecture or session security.
 */
import type { Role } from "@prisma/client";
import { prisma, isDatabaseAvailable } from "../lib/prisma";
import { comparePassword, hashPassword } from "../utils/password";
import { authService } from "./auth.service";

function slugifyOrgName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `org-${Date.now().toString(36)}`;
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Admin", lastName: "User" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "-" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export interface RegisterOrganizationInput {
  organizationName: string;
  fullName: string;
  email: string;
  mobile: string;
  companyType?: string;
  city?: string;
  state?: string;
  employeeCount?: string;
  password: string;
  acceptTerms: boolean;
}

export interface AcceptInvitationInput {
  email: string;
  invitationPassword: string;
  fullName?: string;
  mobile?: string;
  password: string;
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export const organizationOnboardingService = {
  async registerOrganization(input: RegisterOrganizationInput) {
    if (!isDatabaseAvailable()) {
      throw Object.assign(new Error("Database not configured"), {
        statusCode: 503,
        code: "SERVICE_UNAVAILABLE",
      });
    }
    if (!input.acceptTerms) {
      throw Object.assign(new Error("You must accept Terms & Privacy"), {
        statusCode: 400,
        code: "TERMS_REQUIRED",
      });
    }

    const email = input.email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw Object.assign(new Error("An account with this email already exists"), {
        statusCode: 409,
        code: "EMAIL_EXISTS",
      });
    }

    const organizationName = input.organizationName.trim();
    if (!organizationName) {
      throw Object.assign(new Error("Organization name is required"), {
        statusCode: 400,
        code: "VALIDATION_ERROR",
      });
    }

    const slug = await ensureUniqueSlug(slugifyOrgName(organizationName));
    const { firstName, lastName } = splitFullName(input.fullName);
    const passwordHash = await hashPassword(input.password);

    const meta = [
      input.companyType ? `type:${input.companyType}` : null,
      input.city ? `city:${input.city}` : null,
      input.state ? `state:${input.state}` : null,
      input.employeeCount ? `employees:${input.employeeCount}` : null,
    ]
      .filter(Boolean)
      .join("|");

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          isActive: true,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          mobile: input.mobile.trim() || null,
          department: meta || null,
          role: "SUPER_ADMIN" as Role,
          isActive: true,
          mustChangePassword: false,
        },
      });

      return { organization, user };
    });

    // Initialize default workspace context is pilot-scoped today; org record is created for lifecycle.
    const session = await authService.login(email, input.password);
    return {
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
      ...session,
    };
  },

  /**
   * Accept invitation for an already-provisioned user (admin invite / temp password).
   * Never creates a new organization. Preserves existing role.
   */
  async acceptInvitation(input: AcceptInvitationInput) {
    if (!isDatabaseAvailable()) {
      throw Object.assign(new Error("Database not configured"), {
        statusCode: 503,
        code: "SERVICE_UNAVAILABLE",
      });
    }

    const email = input.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw Object.assign(new Error("Invitation not found or no longer valid"), {
        statusCode: 404,
        code: "INVITATION_INVALID",
      });
    }

    const valid = await comparePassword(input.invitationPassword, user.passwordHash);
    if (!valid) {
      throw Object.assign(new Error("Invalid invitation credentials"), {
        statusCode: 401,
        code: "INVITATION_INVALID",
      });
    }

    const names = input.fullName?.trim() ? splitFullName(input.fullName) : null;
    const passwordHash = await hashPassword(input.password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        ...(names
          ? { firstName: names.firstName, lastName: names.lastName }
          : {}),
        ...(input.mobile?.trim() ? { mobile: input.mobile.trim() } : {}),
      },
    });

    const session = await authService.login(email, input.password);
    return {
      joined: true,
      role: user.role,
      ...session,
    };
  },
};
