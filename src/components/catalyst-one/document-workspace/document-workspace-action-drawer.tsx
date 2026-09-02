"use client";

import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreateTaskActionButton } from "@/components/catalyst-one/tasks/create-task-action-button";
import { DOCUMENT_WORKSPACE_ACTIONS } from "@/constants/document-workspace";
import type { DocumentWorkspaceActionId } from "@/constants/document-workspace";
import type { DocumentWorkspaceRow } from "@/lib/document-workspace";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { mapDealLenderRecipients } from "@/lib/document-workspace/lender-pack";
import { cn } from "@/lib/utils";

export function DocumentWorkspaceActionDrawer({
  open,
  onOpenChange,
  selectedCount,
  onAction,
  deals,
  selectedDealId,
  onDealIdChange,
  coverSubject,
  coverBody,
  onCoverSubjectChange,
  onCoverBodyChange,
  lenderRecipientId,
  onLenderRecipientIdChange,
  groupedDraft,
  onGroupedDraftChange,
  dueDate,
  onDueDateChange,
  secureLink,
  taskContext,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onAction: (id: DocumentWorkspaceActionId) => void;
  deals: EnterpriseDealApiRecord[];
  selectedDealId: string;
  onDealIdChange: (id: string) => void;
  coverSubject: string;
  coverBody: string;
  onCoverSubjectChange: (value: string) => void;
  onCoverBodyChange: (value: string) => void;
  lenderRecipientId: string;
  onLenderRecipientIdChange: (id: string) => void;
  groupedDraft: string;
  onGroupedDraftChange: (value: string) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  secureLink: string;
  taskContext?: { opportunityId?: string; dealId?: string; contactId?: string };
}) {
  const [panel, setPanel] = useState<"actions" | "request" | "lender">("actions");
  const deal = deals.find((d) => d.id === selectedDealId) ?? deals[0];
  const recipients = useMemo(() => (deal ? mapDealLenderRecipients(deal) : []), [deal]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md" allowOutsideClose>
        <SheetHeader>
          <SheetTitle>Action Centre</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {selectedCount} selected. Opening an action does not send.
          </p>
        </SheetHeader>
        <div className="mt-3 flex gap-1">
          {(["actions", "request", "lender"] as const).map((id) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={panel === id ? "default" : "outline"}
              className="h-7 capitalize"
              onClick={() => setPanel(id)}
            >
              {id}
            </Button>
          ))}
        </div>
        {panel === "actions" ? (
          <div className="mt-4 grid gap-2">
            {DOCUMENT_WORKSPACE_ACTIONS.map((action) => (
              <Button
                key={action.id}
                type="button"
                variant="outline"
                className={cn("h-9 justify-start")}
                onClick={() => {
                  if (action.id === "request_selected" || action.id === "request_all_pending") {
                    setPanel("request");
                    onAction(action.id);
                    return;
                  }
                  if (action.id === "send_to_lender") {
                    setPanel("lender");
                    return;
                  }
                  onAction(action.id);
                }}
              >
                {action.label}
              </Button>
            ))}
            <CreateTaskActionButton
              context={{
                opportunityId: taskContext?.opportunityId,
                dealId: taskContext?.dealId,
                contactId: taskContext?.contactId,
              }}
              label="Create Task"
            />
          </div>
        ) : null}
        {panel === "request" ? (
          <div className="mt-4 space-y-3">
            <div>
              <Label className="text-xs">Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => onDueDateChange(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Grouped request (editable)</Label>
              <Textarea
                value={groupedDraft}
                onChange={(e) => onGroupedDraftChange(e.target.value)}
                className="min-h-[12rem] text-xs"
              />
            </div>
            {secureLink ? (
              <p className="break-all text-[11px] text-muted-foreground">Secure link (not sent): {secureLink}</p>
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              Use Custom Email / Template Email / WhatsApp from Actions to review before queueing.
            </p>
          </div>
        ) : null}
        {panel === "lender" ? (
          <div className="mt-4 space-y-3">
            <div>
              <Label className="text-xs">Lender Deal</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={deal?.id || ""}
                onChange={(e) => onDealIdChange(e.target.value)}
              >
                {deals.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.dealNumber} · {item.primaryCounterpartyName || "Lender"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Mapped lender recipient</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={lenderRecipientId || recipients[0]?.id || ""}
                onChange={(e) => onLenderRecipientIdChange(e.target.value)}
              >
                {recipients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Cover subject</Label>
              <Input value={coverSubject} onChange={(e) => onCoverSubjectChange(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Cover email (employee-reviewed)</Label>
              <Textarea
                value={coverBody}
                onChange={(e) => onCoverBodyChange(e.target.value)}
                className="min-h-[8rem] text-xs"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Only accepted versions are eligible. Queue to Outbox — this does not send live email.
            </p>
            <Button type="button" onClick={() => onAction("send_to_lender")}>
              Queue Send to Lender
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export type { DocumentWorkspaceRow };
