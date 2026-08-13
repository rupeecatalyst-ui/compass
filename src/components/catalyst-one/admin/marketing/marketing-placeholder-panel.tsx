"use client";

/**
 * CO-MARKETING-MKT-01 — Shared foundation placeholder panel.
 */

import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { ENTERPRISE_MARKETING_SAFETY } from "@/constants/enterprise-marketing-engine";
import { MarketingModuleNav } from "./marketing-module-nav";

export function MarketingPlaceholderPanel(props: {
  title: string;
  description: string;
  sectionId?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Marketing Command Center · Foundation
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{props.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{props.description}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={ROUTES.ADMIN_MARKETING}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Command Center
          </Link>
        </Button>
      </div>

      <MarketingModuleNav activeId={props.sectionId} />

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            Sprint MKT-01 — shell only
          </CardTitle>
          <CardDescription>{ENTERPRISE_MARKETING_SAFETY.notice}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc space-y-1 pl-5">
            <li>No email / WhatsApp / digital campaign launch</li>
            <li>No Google Drive / Sheets connection</li>
            <li>No audience database import</li>
            <li>No Contact or Opportunity creation</li>
            <li>No Lead entity</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
