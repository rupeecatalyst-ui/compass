"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/auth/password-input";
import {
  evaluatePasswordStrength,
  PasswordStrengthIndicator,
} from "@/components/auth/password-strength-indicator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-handler";
import { authService } from "@/services/auth.service";
import { sessionService } from "@/services/session.service";
import { ROUTES } from "@/constants/routes";

const schema = z
  .object({
    organizationName: z.string().min(2, "Organization name is required"),
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Enter a valid work email"),
    mobile: z.string().min(8, "Mobile number is required"),
    companyType: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    employeeCount: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
    acceptTerms: z.boolean(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.acceptTerms, {
    message: "Accept Terms & Privacy to continue",
    path: ["acceptTerms"],
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

export function CreateOrganizationForm() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationName: "",
      fullName: "",
      email: "",
      mobile: "",
      companyType: "",
      city: "",
      state: "",
      employeeCount: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = async (values: Values) => {
    try {
      const result = await authService.registerOrganization({
        ...values,
        email: values.email.trim().toLowerCase(),
      });
      sessionService.persist({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      success("Organization created", `${result.organization.name} is ready.`);
      router.replace(ROUTES.DASHBOARD);
    } catch (err) {
      showError("Registration failed", getErrorMessage(err));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="organizationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name *</FormLabel>
              <FormControl>
                <Input placeholder="Acme Financial Services" {...field} />
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
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Your full name" autoComplete="name" {...field} />
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
                <FormLabel>Mobile Number *</FormLabel>
                <FormControl>
                  <Input placeholder="+91…" autoComplete="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Email *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@company.com" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="companyType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="nbfc">NBFC</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="dsa">DSA / Channel Partner</SelectItem>
                    <SelectItem value="broker">Broker</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="employeeCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Employees</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1-10">1–10</SelectItem>
                    <SelectItem value="11-50">11–50</SelectItem>
                    <SelectItem value="51-200">51–200</SelectItem>
                    <SelectItem value="201+">201+</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="City" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input placeholder="State" {...field} />
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
        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <FormItem className="flex items-start gap-2 space-y-0 rounded-lg border border-border/70 bg-background/60 p-3">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1">
                <FormLabel className="cursor-pointer font-normal leading-snug">
                  Accept Terms &amp; Privacy *
                </FormLabel>
                <p className="text-[11px] text-muted-foreground">
                  You agree to Catalyst One enterprise terms and privacy practices.
                </p>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="h-10 w-full bg-teal-700 hover:bg-teal-800"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Organization
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={ROUTES.LOGIN} className="text-teal-700 hover:underline dark:text-teal-300">
            Sign In
          </Link>
        </p>
      </form>
    </Form>
  );
}
