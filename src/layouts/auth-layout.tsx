"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { pageVariants } from "@/lib/animations";
import { siteConfig } from "@/config/site";
import { RupeeCatalystLogo } from "@/components/branding/rupee-catalyst-logo";
import { AuthCompassHero } from "@/components/auth/auth-compass-hero";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import "@/styles/auth-experience.css";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  /** Optional eyebrow above Catalyst One heading on the form panel. */
  eyebrow?: string;
  className?: string;
  /** Wider form panel for multi-section registration. */
  wide?: boolean;
  /** Hide the bottom Sign In helper link (e.g. on the Sign In page itself). */
  hideAuthFooter?: boolean;
}

/**
 * CO-SPRINT-118 — Premium enterprise authentication shell.
 * Left: COMPASS guidance hero · Right: Catalyst One execution / SSOT forms.
 */
export function AuthLayout({
  children,
  title,
  description,
  eyebrow,
  className,
  wide = false,
  hideAuthFooter = false,
}: AuthLayoutProps) {
  return (
    <div className={cn("auth-shell min-h-screen grid lg:grid-cols-2", className)}>
      {/* Left hero — COMPASS */}
      <aside className="auth-hero relative hidden flex-col justify-between overflow-hidden p-10 text-zinc-50 xl:p-14 lg:flex">
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
            <RupeeCatalystLogo size={26} />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-200/90">
              COMPASS
            </p>
            <p className="text-sm text-zinc-300">Direction · Guidance · Decision Intelligence</p>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 py-10">
          <AuthCompassHero />
          <p className="max-w-sm text-center font-serif text-2xl font-medium leading-snug tracking-tight text-zinc-50 sm:text-[1.65rem]">
            Every Direction Begins With the Right Decision.
          </p>
          <p className="max-w-md text-center text-sm leading-relaxed text-zinc-400">
            COMPASS guides every business decision. Catalyst One executes the enterprise workflow
            with one source of truth.
          </p>
        </div>

        <p className="relative z-10 text-xs text-zinc-500">
          © {new Date().getFullYear()} {siteConfig.company}. All rights reserved.
        </p>
      </aside>

      {/* Right panel — Catalyst One auth */}
      <div className="flex items-center justify-center bg-[var(--auth-panel)] px-4 py-8 sm:px-8 sm:py-12 dark:bg-background">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          className={cn("w-full space-y-7", wide ? "max-w-xl" : "max-w-md")}
        >
          <div className="space-y-3 lg:hidden">
            <div className="flex justify-center">
              <AuthCompassHero className="!w-[148px] !h-[148px]" />
            </div>
            <p className="text-center font-serif text-base text-foreground">
              Every Direction Begins With the Right Decision.
            </p>
          </div>

          <div className="space-y-1">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
                {eyebrow}
              </p>
            ) : null}
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700/10 ring-1 ring-teal-700/20">
                <RupeeCatalystLogo size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Catalyst One</h1>
                <p className="text-[11px] text-muted-foreground">Enterprise Operating System</p>
              </div>
            </div>
            <p className="pt-1 text-sm font-medium leading-relaxed text-foreground/90">
              One platform.
              <br />
              One workflow.
              <br />
              One source of truth.
            </p>
            <div className="pt-3">
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>

          {children}

          {!hideAuthFooter ? (
            <p className="text-center text-[11px] text-muted-foreground">
              <Link href={ROUTES.LOGIN} className="hover:text-foreground hover:underline">
                Sign In
              </Link>
              <span className="mx-2 opacity-40">·</span>
              Secure enterprise access
            </p>
          ) : (
            <p className="text-center text-[11px] text-muted-foreground">
              Secure enterprise access · Rupee Catalyst
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
