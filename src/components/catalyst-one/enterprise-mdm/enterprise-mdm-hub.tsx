"use client";

import Link from "next/link";
import { ENTERPRISE_MDM_MODULES } from "@/constants/enterprise-mdm";
import { PageHeader } from "@/components/design-system/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * CO-MDM-001 — Enterprise Master Data Management hub.
 */
export function EnterpriseMdmHub() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Enterprise Master Data"
        description="Maintain all business masters from the Admin Console. Seed defaults remain available as reference; administrators create and manage additional records without developer involvement."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ENTERPRISE_MDM_MODULES.map((mod) => (
          <Link key={mod.id} href={mod.href} className="group block">
            <Card className="h-full border-border/60 transition-colors group-hover:border-teal-500/40">
              <CardHeader className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold">{mod.title}</CardTitle>
                  <Badge variant={mod.status === "operational" ? "default" : "outline"}>
                    {mod.status === "operational" ? "Ready" : "Partial"}
                  </Badge>
                </div>
                <CardDescription className="text-xs leading-relaxed">
                  {mod.description}
                </CardDescription>
                {mod.hierarchy ? (
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {mod.hierarchy}
                  </p>
                ) : null}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
