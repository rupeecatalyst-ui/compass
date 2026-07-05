"use client";

import { CheckCircle2, Landmark, Star, XCircle } from "lucide-react";
import { bankAccountsSeed } from "@/data/catalyst-one/organization/bank-accounts";
import { StatusPill } from "@/components/design-system/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function BankAccountsGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {bankAccountsSeed.map((account) => (
        <Card
          key={account.id}
          className={cn(
            "glass-card border-border/60 overflow-hidden",
            account.isPrimary && "ring-1 ring-primary/30",
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/20">
                  <Landmark className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{account.bank}</CardTitle>
                  <p className="text-xs text-muted-foreground">{account.branch}</p>
                </div>
              </div>
              {account.isPrimary && (
                <StatusPill variant="default" className="shrink-0">
                  <Star className="h-3 w-3" />
                  Primary
                </StatusPill>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Account Number" value={account.accountNumber} mono />
            <DetailRow label="IFSC" value={account.ifsc} mono />
            <div className="flex flex-wrap gap-2 pt-1">
              <StatusPill variant={account.isCurrentAccount ? "info" : "muted"}>
                {account.isCurrentAccount ? "Current Account" : "Other Account"}
              </StatusPill>
              <StatusPill variant={account.cancelledChequeAvailable ? "success" : "warning"}>
                {account.cancelledChequeAvailable ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Cheque Available
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    No Cheque
                  </>
                )}
              </StatusPill>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}
