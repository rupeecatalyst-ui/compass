"use client";

import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import { pageVariants } from "@/lib/animations";
import { siteConfig } from "@/config/site";

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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Compass className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold">{siteConfig.name}</span>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold tracking-tight">
            Financial Operating System
          </h2>
          <p className="text-lg text-muted-foreground max-w-md">
            Enterprise-grade platform powering {siteConfig.company} and the future of fintech operations.
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Compass className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">{siteConfig.name}</span>
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
