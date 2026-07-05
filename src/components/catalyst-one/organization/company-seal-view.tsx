"use client";

import { Clock, Stamp } from "lucide-react";
import {
  companySealHistoryPlaceholder,
  companySealSeed,
} from "@/data/catalyst-one/organization/company-seal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function CompanySealView() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle>Company Seal</CardTitle>
          <CardDescription>Official seal for Rupee Catalyst documents</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 py-4">
          <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-4 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 shadow-inner">
            <div className="absolute inset-3 rounded-full border-2 border-dashed border-primary/20" />
            <div className="text-center z-10">
              <Stamp className="mx-auto h-10 w-10 text-primary" />
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-primary">
                {companySealSeed.initials}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Rupee Catalyst</p>
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">
              {new Date(companySealSeed.lastUpdated).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="text-xs text-muted-foreground font-mono">{companySealSeed.version}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle>Seal History</CardTitle>
          <CardDescription>Version history placeholder for audit trail</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {companySealHistoryPlaceholder.map((entry, index) => (
              <div key={entry.id}>
                <div className="flex items-start gap-3 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{entry.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                {index < companySealHistoryPlaceholder.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
