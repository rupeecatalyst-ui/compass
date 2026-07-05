"use client";

import { FileText, Mail, MapPin, PenLine, Phone } from "lucide-react";
import { StatusPill } from "@/components/design-system/status-pill";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Director, DirectorStatus } from "@/types/organization";

const statusVariant: Record<DirectorStatus, "success" | "muted"> = {
  active: "success",
  inactive: "muted",
};

interface DirectorDrawerProps {
  director: Director | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DirectorDrawer({ director, open, onOpenChange }: DirectorDrawerProps) {
  if (!director) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-start gap-4 pr-6">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-lg font-semibold text-white">
                {director.photographInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg">{director.name}</SheetTitle>
              <SheetDescription>{director.designation}</SheetDescription>
              <StatusPill variant={statusVariant[director.status]} className="mt-2">
                {director.status === "active" ? "Active" : "Inactive"}
              </StatusPill>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            <section>
              <h4 className="text-sm font-semibold mb-3">Contact</h4>
              <div className="grid gap-2 text-sm">
                <InfoRow icon={Mail} label={director.email} />
                <InfoRow icon={Phone} label={director.mobile} />
                <InfoRow icon={MapPin} label={director.address} />
              </div>
            </section>

            <Separator />

            <section>
              <h4 className="text-sm font-semibold mb-3">Identification</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailItem label="DIN" value={director.din} mono />
                <DetailItem label="PAN" value={director.pan} mono />
              </div>
            </section>

            <Separator />

            <section>
              <h4 className="text-sm font-semibold mb-3">Documents</h4>
              <div className="space-y-2">
                {director.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{doc.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{doc.type}</span>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            <section>
              <h4 className="text-sm font-semibold mb-3">Signature</h4>
              <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20">
                <div className="text-center">
                  <PenLine className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Signature preview placeholder</p>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="text-foreground">{label}</span>
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={mono ? "font-mono text-sm font-medium" : "text-sm font-medium"}>{value}</p>
    </div>
  );
}
