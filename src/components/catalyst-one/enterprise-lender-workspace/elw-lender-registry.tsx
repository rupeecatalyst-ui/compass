"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import {
  buildElwWorkspaceHref,
  ELW_CERTIFICATION_FINDING,
  ELW_ENTERPRISE_PRINCIPLE,
  ELW_FRAMEWORK_VERSION,
} from "@/constants/enterprise-lender-workspace";
import { listElwRegistryEntries } from "@/lib/enterprise-lender-workspace";
import { StatusPill } from "@/components/design-system/status-pill";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Lender Master index — opens ELW with origin = lenders.
 */
export function ElwLenderRegistry() {
  const entries = listElwRegistryEntries();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill variant="info">{ELW_CERTIFICATION_FINDING}</StatusPill>
        <StatusPill variant="muted">{ELW_FRAMEWORK_VERSION}</StatusPill>
      </div>
      <p className="text-sm text-muted-foreground">{ELW_ENTERPRISE_PRINCIPLE}</p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <Link
            key={entry.lenderRef}
            href={buildElwWorkspaceHref(entry.lenderId, {
              from: "lenders",
              returnTo: "/lenders",
            })}
            className="block transition-opacity hover:opacity-90"
          >
            <Card className="glass-card h-full border-border/60">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <div>
                    <CardTitle className="text-sm">{entry.name}</CardTitle>
                    <CardDescription className="mt-0.5">
                      {entry.headquartersCity ?? "Enterprise partner"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex gap-3 text-xs text-muted-foreground">
                <span>{entry.contactCount} contacts</span>
                <span>{entry.productCount} products</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
