import type { Role } from "@prisma/client";
import { randomBytes } from "crypto";
import { prisma, isDatabaseAvailable } from "../lib/prisma";
import { hashPassword } from "../utils/password";

export interface ProvisionAuthUserInput {
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  mobile?: string;
  department?: string;
  role?: Role;
  reportingManagerAuthUserId?: string | null;
  eumUserId?: string;
  createdByUserId: string;
}

export interface ProvisionAuthUserResult {
  authUserId: string;
  email: string;
  temporaryPassword: string;
  mustChangePassword: true;
}

function generateTemporaryPassword(): string {
  const core = randomBytes(6).toString("base64url").slice(0, 8);
  return `Rc@${core}1`;
}

export const userProvisioningService = {
  async provision(input: ProvisionAuthUserInput): Promise<ProvisionAuthUserResult> {
    if (!isDatabaseAvailable()) {
      throw Object.assign(new Error("Database required for user provisioning"), {
        statusCode: 503,
        code: "SERVICE_UNAVAILABLE",
      });
    }

    const email = input.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw Object.assign(new Error("A login account with this email already exists"), {
        statusCode: 409,
        code: "EMAIL_EXISTS",
      });
    }

    if (input.employeeId) {
      const emp = await prisma.user.findUnique({ where: { employeeId: input.employeeId } });
      if (emp) {
        throw Object.assign(new Error("Employee ID is already assigned"), {
          statusCode: 409,
          code: "EMPLOYEE_ID_EXISTS",
        });
      }
    }

    if (input.eumUserId) {
      const linked = await prisma.user.findUnique({ where: { eumUserId: input.eumUserId } });
      if (linked) {
        throw Object.assign(new Error("This user account is already provisioned for login"), {
          statusCode: 409,
          code: "EUM_ALREADY_LINKED",
        });
      }
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        employeeId: input.employeeId,
        mobile: input.mobile?.trim() || null,
        department: input.department?.trim() || null,
        role: input.role ?? "VIEWER",
        isActive: true,
        mustChangePassword: true,
        createdById: input.createdByUserId,
        reportingManagerId: input.reportingManagerAuthUserId ?? null,
        eumUserId: input.eumUserId ?? null,
      },
    });

    return {
      authUserId: user.id,
      email: user.email,
      temporaryPassword,
      mustChangePassword: true,
    };
  },

  async setActive(authUserId: string, isActive: boolean): Promise<void> {
    if (!isDatabaseAvailable()) return;
    await prisma.user.update({ where: { id: authUserId }, data: { isActive } });
  },

  async findByEumUserId(eumUserId: string) {
    if (!isDatabaseAvailable()) return null;
    return prisma.user.findUnique({ where: { eumUserId } });
  },
};
