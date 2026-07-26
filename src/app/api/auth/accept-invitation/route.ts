import { z } from "zod";
import { organizationOnboardingService } from "@server/services/organization-onboarding.service";
import { formatAuthError } from "@server/validators/auth.validators";
import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";

const acceptInvitationSchema = z
  .object({
    email: z.string().email().transform((v) => v.trim().toLowerCase()),
    invitationPassword: z.string().min(8),
    fullName: z.string().optional(),
    mobile: z.string().optional(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** CO-SPRINT-118 — Accept Invitation (join existing org; never creates org). */
export async function POST(request: Request) {
  try {
    const body = acceptInvitationSchema.parse(await request.json());
    const result = await organizationOnboardingService.acceptInvitation(body);
    return successResponse(result);
  } catch (err) {
    const formatted = formatAuthError(err);
    return fromAuthError(formatted);
  }
}
