"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** CO-ORG-002 — Product Library dual-book quarantine callout. */
export function ProductLibrarySsotCallout() {
  return (
    <Card className="border-info/30 bg-info/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-2 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p>
            Enterprise Product Registry (Prisma) is the operational SSOT. Open Product Master for live
            products.
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-8 shrink-0 text-xs" asChild>
          <Link href={ROUTES.ADMIN_PRODUCT_MASTER}>Open Product Master</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** CO-ORG-002 — Prisma mode empty state for seed-only registry views. */
export function ProductLibraryPrismaEmptyState() {
  return (
    <Card className="glass-card border-border/60">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          Live product definitions are managed in Product Master (Enterprise Product Registry). This
          view shows design-time seed definitions only when persistence mode is not Prisma.
        </p>
        <Button size="sm" asChild>
          <Link href={ROUTES.ADMIN_PRODUCT_MASTER}>Open Product Master</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
