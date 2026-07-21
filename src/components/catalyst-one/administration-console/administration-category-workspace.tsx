"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  ADMINISTRATION_CONSOLE_NAME,
  type AdministrationCategory,
} from "@/constants/administration-console";
import { ROUTES } from "@/constants/routes";

interface AdministrationCategoryWorkspaceProps {
  category: AdministrationCategory;
}

/** Category detail — module cards for one administration business function. */
export function AdministrationCategoryWorkspace({
  category,
}: AdministrationCategoryWorkspaceProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-5xl flex-col px-4 py-8 md:px-6">
      <nav className="mb-6" aria-label="Breadcrumb">
        <Link
          href={ROUTES.ADMIN}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {ADMINISTRATION_CONSOLE_NAME}
        </Link>
      </nav>

      <header className="mb-8 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
          Configuration workspace
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{category.title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{category.description}</p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {category.modules.map((module) => (
          <li key={module.id}>
            <Link
              href={module.href}
              className="group flex min-h-[120px] flex-col rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-teal-500/45 hover:bg-teal-500/[0.04]"
            >
              <p className="text-base font-semibold tracking-tight">{module.title}</p>
              <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-muted-foreground">
                {module.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-teal-800 opacity-0 transition-opacity group-hover:opacity-100 dark:text-teal-200">
                Configure
                <ArrowRight className="h-3 w-3" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
