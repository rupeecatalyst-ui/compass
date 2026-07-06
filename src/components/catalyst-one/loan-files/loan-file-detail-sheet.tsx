"use client";

import {
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { useState } from "react";
import { useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { DocumentChecklist } from "@/components/catalyst-one/loan-files/document-checklist";
import { FileTimeline } from "@/components/catalyst-one/loan-files/file-timeline";
import { TaskPanel } from "@/components/catalyst-one/loan-files/task-panel";
import { STAGE_LABELS, isProductSecured } from "@/constants/loan-pipeline";
import { getOccupancyLabel } from "@/constants/occupancy-master";
import { formatINR } from "@/lib/format-currency";
import { StatusPill } from "@/components/design-system/status-pill";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const priorityVariant = {
  urgent: "error" as const,
  high: "warning" as const,
  medium: "info" as const,
  low: "muted" as const,
};

export function LoanFileDetailSheet() {
  const { selectedFile, selectedFileId, setSelectedFileId, updateFile } = useLoanFiles();
  const [notes, setNotes] = useState("");

  const file = selectedFile;
  const displayNotes = file ? (notes || file.internalNotes) : "";

  return (
    <Sheet
      open={Boolean(selectedFileId)}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedFileId(null);
          setNotes("");
        }
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        {file && (
          <>
            <SheetHeader className="p-6 pb-4 border-b shrink-0">
              <div className="flex items-start justify-between gap-2 pr-6">
                <div>
                  <SheetTitle className="text-lg">{file.customerName}</SheetTitle>
                  <SheetDescription>
                    {file.fileNumber} · {STAGE_LABELS[file.stage]}
                  </SheetDescription>
                </div>
                <StatusPill variant={priorityVariant[file.priority]} className="capitalize shrink-0">
                  {file.priority}
                </StatusPill>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <Tabs defaultValue="overview" className="p-6 pt-4">
                <TabsList className="w-full grid grid-cols-5 mb-4">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs">Docs</TabsTrigger>
                  <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-0">
                  <section>
                    <h4 className="text-sm font-semibold mb-3">Customer</h4>
                    <div className="grid gap-2 text-sm">
                      <InfoRow icon={Phone} label={file.customerMobile} />
                      <InfoRow icon={Mail} label={file.customerEmail} />
                      <InfoRow icon={MapPin} label={`${file.city}, ${file.state}`} />
                      <InfoRow icon={User} label={file.employmentType} />
                      {file.coApplicant && <InfoRow icon={User} label={`Co-applicant: ${file.coApplicant}`} />}
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="text-sm font-semibold mb-3">Loan Summary</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <SummaryItem label="Product" value={file.loanProduct} />
                      <SummaryItem label="Loan Amount" value={formatINR(file.loanAmount)} highlight />
                      <SummaryItem label="Required Amount" value={formatINR(file.requiredAmount)} />
                      <SummaryItem label="Sanction Amount" value={file.sanctionAmount ? formatINR(file.sanctionAmount) : "—"} />
                      <SummaryItem label="Disbursement" value={file.disbursementAmount ? formatINR(file.disbursementAmount) : "—"} />
                      <SummaryItem label="Interest / Tenure" value={`${file.interestRate}% · ${file.tenure} mo`} />
                      <SummaryItem label="Lender" value={file.lender} />
                      <SummaryItem label="RM" value={file.relationshipManager} />
                      <SummaryItem label="Login Date" value={new Date(file.loginDate).toLocaleDateString("en-IN")} />
                      <SummaryItem label="Expected Disbursement" value={new Date(file.expectedDisbursement).toLocaleDateString("en-IN")} />
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="text-sm font-semibold mb-3">Revenue</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <SummaryItem label="Revenue %" value={`${file.revenuePercent}%`} />
                      <SummaryItem label="Expected Revenue" value={formatINR(file.expectedRevenue)} accent />
                      <SummaryItem label="Revenue Received" value={formatINR(file.revenueReceived)} accent />
                    </div>
                  </section>

                  {isProductSecured(file.loanProduct) &&
                    (file.propertyType || file.occupancyId || file.approxPropertyValue) && (
                    <>
                      <Separator />
                      <section>
                        <h4 className="text-sm font-semibold mb-3">Property Information</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <SummaryItem label="Property Type" value={file.propertyType ?? "—"} />
                          <SummaryItem label="Property Occupancy" value={getOccupancyLabel(file.occupancyId) ?? "—"} />
                          <SummaryItem
                            label="Approx Property Value"
                            value={file.approxPropertyValue ? formatINR(file.approxPropertyValue) : "—"}
                          />
                        </div>
                      </section>
                    </>
                  )}

                  {file.businessDetails && (
                    <>
                      <Separator />
                      <section>
                        <h4 className="text-sm font-semibold mb-3">Business</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <SummaryItem label="Company" value={file.businessDetails.companyName ?? "—"} />
                          <SummaryItem label="Constitution" value={file.businessDetails.constitution ?? "—"} />
                          <SummaryItem label="GST" value={file.businessDetails.gst ?? "—"} />
                          <SummaryItem label="Turnover" value={file.businessDetails.annualTurnover ? formatINR(file.businessDetails.annualTurnover) : "—"} />
                          <SummaryItem label="Vintage" value={file.businessDetails.businessVintage ? `${file.businessDetails.businessVintage} yrs` : "—"} />
                        </div>
                      </section>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="documents" className="mt-0">
                  <DocumentChecklist documents={file.documents} />
                </TabsContent>

                <TabsContent value="tasks" className="mt-0">
                  <TaskPanel fileId={file.id} tasks={file.tasks} />
                </TabsContent>

                <TabsContent value="timeline" className="mt-0">
                  <FileTimeline events={file.timeline} />
                </TabsContent>

                <TabsContent value="notes" className="mt-0 space-y-3">
                  <h4 className="text-sm font-semibold">Internal Notes</h4>
                  <textarea
                    rows={12}
                    value={displayNotes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => updateFile(file.id, { internalNotes: displayNotes })}
                    className={cn(
                      "min-h-[240px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm",
                      "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  />
                </TabsContent>
              </Tabs>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  highlight,
  accent,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium mt-0.5 ${highlight ? "text-primary font-bold" : ""} ${accent ? "text-accent" : ""}`}>
        {value}
      </p>
    </div>
  );
}
