"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/auth/password-input";
import {
  evaluatePasswordStrength,
  PasswordStrengthIndicator,
} from "@/components/auth/password-strength-indicator";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-handler";
import { authService } from "@/services/auth.service";
import { sessionService } from "@/services/session.service";
import { ROUTES } from "@/constants/routes";

const schema = z
  .object({
    email: z.string().email("Enter your invited work email"),
    invitationPassword: z.string().min(8, "Enter the temporary invitation password"),
    fullName: z.string().optional(),
    mobile: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .superRefine((d, ctx) => {
    const { strength } = evaluatePasswordStrength(d.password);
    if (strength === "weak" || strength === "empty") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a stronger password",
        path: ["password"],
      });
    }
  });

type Values = z.infer<typeof schema>;

/**
 * Join an existing organization using admin-provisioned invitation credentials.
 * Never creates a new organization. Preserves assigned role.
 */
export function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: searchParams.get("email") ?? "",
      invitationPassword: searchParams.get("code") ?? "",
      fullName: "",
      mobile: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = async (values: Values) => {
    try {
      const result = await authService.acceptInvitation({
        ...values,
        email: values.email.trim().toLowerCase(),
      });
      sessionService.persist({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      success("Welcome aboard", "You have joined your organization.");
      router.replace(ROUTES.DASHBOARD);
    } catch (err) {
      showError("Invitation failed", getErrorMessage(err));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="rounded-lg border border-teal-700/20 bg-teal-700/5 px-3 py-2 text-[12px] text-muted-foreground">
          Use the work email and temporary password from your invitation. You will join the
          existing organization — a new organization is never created.
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Email *</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="invitationPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invitation / Temporary Password *</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Complete your profile" autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" autoComplete="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Create Password *</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <PasswordStrengthIndicator password={password || ""} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password *</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="h-10 w-full bg-teal-700 hover:bg-teal-800"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Join Organization
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already onboarded?{" "}
          <Link href={ROUTES.LOGIN} className="text-teal-700 hover:underline dark:text-teal-300">
            Sign In
          </Link>
        </p>
      </form>
    </Form>
  );
}
