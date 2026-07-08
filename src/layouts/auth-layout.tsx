"use client";

import { motion } from "framer-motion";
import { pageVariants } from "@/lib/animations";
import { siteConfig } from "@/config/site";
import { RupeeCatalystLogo } from "@/components/branding/rupee-catalyst-logo";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary/20 via-background to-accent/10 p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
            <RupeeCatalystLogo size={28} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-semibold">Catalyst One</span>
            <span className="text-xs text-muted-foreground">Enterprise Operating System</span>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold tracking-tight">
            Enterprise Operating System
          </h2>
          <p className="text-lg text-muted-foreground max-w-md">
            Catalyst One is the enterprise operating system for lending execution, risk, and operations.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.company}. All rights reserved.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          className="w-full max-w-md space-y-8"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
              <RupeeCatalystLogo size={28} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-semibold">Catalyst One</span>
              <span className="text-xs text-muted-foreground">Enterprise Operating System</span>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
