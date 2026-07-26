import { z } from "zod";
import { organizationOnboardingService } from "@server/services/organization-onboarding.service";
import { formatAuthError } from "@server/validators/auth.validators";
import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";

const registerOrganizationSchema = z
  .object({
    organizationName: z.string().min(2),
    fullName: z.string().min(2),
    email: z.string().email().transform((v) => v.trim().toLowerCase()),
    mobile: z.string().min(8),
    companyType: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    employeeCount: z.string().optional(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    acceptTerms: z.boolean(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** CO-SPRINT-118 — Create Organization (new tenant + Super Admin). */
export async function POST(request: Request) {
  try {
    const body = registerOrganizationSchema.parse(await request.json());
    const result = await organizationOnboardingService.registerOrganization(body);
    return successResponse(result);
  } catch (err) {
    const formatted = formatAuthError(err);
    return fromAuthError(formatted);
  }
}
