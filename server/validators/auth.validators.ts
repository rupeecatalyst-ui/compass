import { z } from "zod";

export interface AuthErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    statusCode?: number;
  };
}

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const provisionUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  employeeId: z.string().min(1),
  mobile: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "ANALYST", "VIEWER"]).optional(),
  reportingManagerAuthUserId: z.string().nullable().optional(),
  eumUserId: z.string().optional(),
});

export function formatAuthError(err: unknown): { status: number; body: AuthErrorResponse } {
  if (err instanceof z.ZodError) {
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: err.flatten().fieldErrors as Record<string, string[]>,
        },
      },
    };
  }

  const error = err as Error & { statusCode?: number; code?: string };
  return {
    status: error.statusCode ?? 500,
    body: {
      success: false,
      error: {
        code: error.code ?? "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      },
    },
  };
}
