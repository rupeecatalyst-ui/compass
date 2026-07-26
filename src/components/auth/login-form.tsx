"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { Building2, Loader2, MailOpen } from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { PasswordInput } from "@/components/auth/password-input";
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
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-handler";
import { ROUTES } from "@/constants/routes";

const loginSchema = z.object({
  email: z.string().email("Enter a valid work email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuthContext();
  const { success, error: showError } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login({
        ...values,
        email: values.email.trim().toLowerCase(),
      });
      success("Welcome back!", "You have been signed in successfully.");
    } catch (err) {
      showError("Sign in failed", getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href={ROUTES.FORGOT_PASSWORD}
                    className="text-xs text-teal-700 hover:underline dark:text-teal-300"
                  >
                    Forgot Password
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="cursor-pointer font-normal">Remember Me</FormLabel>
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="h-10 w-full bg-teal-700 hover:bg-teal-800"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-wide">
          <span className="bg-[var(--auth-panel)] px-2 text-muted-foreground dark:bg-background">
            New to Catalyst One
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild variant="outline" className="h-10 justify-start gap-2">
          <Link href={ROUTES.CREATE_ORGANIZATION}>
            <Building2 className="h-4 w-4 text-teal-700" aria-hidden />
            Create Organization
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-10 justify-start gap-2">
          <Link href={ROUTES.ACCEPT_INVITATION}>
            <MailOpen className="h-4 w-4 text-teal-700" aria-hidden />
            Accept Invitation
          </Link>
        </Button>
      </div>
    </div>
  );
}
