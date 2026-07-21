/**
 * CO-SPRINT-118 — User Administration (Prisma SSOT).
 * Create / list / update / activate / deactivate / reset password.
 */

import type { Role } from "@prisma/client";
import { randomBytes } from "crypto";
import { prisma, isDatabaseAvailable } from "../lib/prisma";
import { hashPassword } from "../utils/password";

function requireDb() {
  if (!isDatabaseAvailable()) {
    throw Object.assign(new Error("Database required for user administration"), {
      statusCode: 503,
      code: "SERVICE_UNAVAILABLE",
    });
  }
}

function generateTemporaryPassword(): string {
  // ≥16 chars: upper, lower, number, special
  const raw = randomBytes(12).toString("base64url").replace(/[^a-zA-Z0-9]/g, "x");
  return `Rc$${raw.slice(0, 12)}9!`;
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "User", lastName: "Account" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "-" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export type UserAdminRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  employeeId: string | null;
  mobile: string | null;
  department: string | null;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  reportingManagerId: string | null;
  reportingManagerName: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapUser(
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    employeeId: string | null;
    mobile: string | null;
    department: string | null;
    role: Role;
    isActive: boolean;
    mustChangePassword: boolean;
    reportingManagerId: string | null;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
    reportingManager?: { firstName: string; lastName: string } | null;
  },
): UserAdminRecord {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    employeeId: user.employeeId,
    mobile: user.mobile,
    department: user.department,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    reportingManagerId: user.reportingManagerId,
    reportingManagerName: user.reportingManager
      ? `${user.reportingManager.firstName} ${user.reportingManager.lastName}`.trim()
      : null,
    createdById: user.createdById,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

const userInclude = {
  reportingManager: { select: { firstName: true, lastName: true } },
} as const;

export type CreateUserAdminInput = {
  fullName: string;
  email: string;
  employeeId?: string;
  mobile?: string;
  role: Role;
  reportingManagerId?: string | null;
  createdByUserId: string;
};

export type UpdateUserAdminInput = {
  fullName?: string;
  email?: string;
  employeeId?: string | null;
  mobile?: string | null;
  role?: Role;
  reportingManagerId?: string | null;
  isActive?: boolean;
};

export const userAdminService = {
  async list(query: { search?: string; role?: Role | "all"; status?: "all" | "active" | "inactive" } = {}) {
    requireDb();
    const where: NonNullable<Parameters<typeof prisma.user.findMany>[0]>["where"] = {};

    if (query.status === "active") where.isActive = true;
    if (query.status === "inactive") where.isActive = false;
    if (query.role && query.role !== "all") where.role = query.role;

    if (query.search?.trim()) {
      const s = query.search.trim();
      const parts = s.split(/\s+/).filter(Boolean);
      where.OR = [
        { email: { contains: s, mode: "insensitive" } },
        { firstName: { contains: s, mode: "insensitive" } },
        { lastName: { contains: s, mode: "insensitive" } },
        { employeeId: { contains: s, mode: "insensitive" } },
        { mobile: { contains: s } },
        ...parts.flatMap((p) => [
          { firstName: { contains: p, mode: "insensitive" as const } },
          { lastName: { contains: p, mode: "insensitive" as const } },
        ]),
      ];
    }

    const rows = await prisma.user.findMany({
      where,
      include: userInclude,
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    return rows.map(mapUser);
  },

  async getById(id: string) {
    requireDb();
    const user = await prisma.user.findUnique({ where: { id }, include: userInclude });
    return user ? mapUser(user) : null;
  },

  async create(input: CreateUserAdminInput) {
    requireDb();
    const email = input.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw Object.assign(new Error("A user with this email already exists"), {
        statusCode: 409,
        code: "EMAIL_EXISTS",
      });
    }

    const employeeId = input.employeeId?.trim() || null;
    if (employeeId) {
      const emp = await prisma.user.findUnique({ where: { employeeId } });
      if (emp) {
        throw Object.assign(new Error("Employee ID is already assigned"), {
          statusCode: 409,
          code: "EMPLOYEE_ID_EXISTS",
        });
      }
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const { firstName, lastName } = splitFullName(input.fullName);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        employeeId,
        mobile: input.mobile?.trim() || null,
        role: input.role,
        isActive: true,
        mustChangePassword: true,
        createdById: input.createdByUserId,
        reportingManagerId: input.reportingManagerId || null,
      },
      include: userInclude,
    });

    return {
      user: mapUser(user),
      temporaryPassword,
    };
  },

  async update(id: string, patch: UpdateUserAdminInput) {
    requireDb();
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error("User not found"), { statusCode: 404, code: "NOT_FOUND" });
    }

    if (patch.email && patch.email.trim().toLowerCase() !== existing.email) {
      const email = patch.email.trim().toLowerCase();
      const dup = await prisma.user.findUnique({ where: { email } });
      if (dup) {
        throw Object.assign(new Error("A user with this email already exists"), {
          statusCode: 409,
          code: "EMAIL_EXISTS",
        });
      }
    }

    if (patch.employeeId !== undefined && patch.employeeId !== existing.employeeId) {
      const employeeId = patch.employeeId?.trim() || null;
      if (employeeId) {
        const emp = await prisma.user.findUnique({ where: { employeeId } });
        if (emp && emp.id !== id) {
          throw Object.assign(new Error("Employee ID is already assigned"), {
            statusCode: 409,
            code: "EMPLOYEE_ID_EXISTS",
          });
        }
      }
    }

    const names = patch.fullName ? splitFullName(patch.fullName) : null;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(names ? { firstName: names.firstName, lastName: names.lastName } : {}),
        ...(patch.email ? { email: patch.email.trim().toLowerCase() } : {}),
        ...(patch.employeeId !== undefined
          ? { employeeId: patch.employeeId?.trim() || null }
          : {}),
        ...(patch.mobile !== undefined ? { mobile: patch.mobile?.trim() || null } : {}),
        ...(patch.role ? { role: patch.role } : {}),
        ...(patch.reportingManagerId !== undefined
          ? { reportingManagerId: patch.reportingManagerId || null }
          : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
      },
      include: userInclude,
    });

    return mapUser(user);
  },

  async setActive(id: string, isActive: boolean) {
    return this.update(id, { isActive });
  },

  async resetPassword(id: string) {
    requireDb();
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error("User not found"), { statusCode: 404, code: "NOT_FOUND" });
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const user = await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
      include: userInclude,
    });

    return {
      user: mapUser(user),
      temporaryPassword,
    };
  },
};
