"use client";

import { Calendar, PenLine } from "lucide-react";
import { digitalSignaturesSeed } from "@/data/catalyst-one/organization/digital-signatures";
import { StatusPill } from "@/components/design-system/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DigitalSignatureStatus } from "@/types/organization";

const statusVariant: Record<DigitalSignatureStatus, "success" | "warning" | "error"> = {
  active: "success",
  expiring: "warning",
  expired: "error",
};

const statusLabel: Record<DigitalSignatureStatus, string> = {
  active: "Active",
  expiring: "Expiring Soon",
  expired: "Expired",
};

export function DigitalSignaturesGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {digitalSignaturesSeed.map((signature) => (
        <Card key={signature.id} className="glass-card border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{signature.person}</CardTitle>
                <p className="text-sm text-muted-foreground">{signature.designation}</p>
              </div>
              <StatusPill variant={statusVariant[signature.status]}>
                {statusLabel[signature.status]}
              </StatusPill>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20">
              <div className="text-center">
                <p className="font-serif text-2xl italic text-foreground/80">{signature.initials}</p>
                <PenLine className="mx-auto mt-1 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Expiry:{" "}
                {new Date(signature.expiry).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
