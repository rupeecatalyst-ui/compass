"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DOCUMENT_WORKSPACE_WHATSAPP_NOT_DELIVERED,
} from "@/constants/document-workspace-inbound";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { preferNativeWebShare } from "@/lib/document-workspace/whatsapp-handoff";
import type { DocumentWorkspaceRequestMessageDto } from "@/lib/document-workspace/request-message-dto";

export function DocumentWorkspaceChecklistShareDialog({
  open,
  opportunityId,
  dealId,
  selectedRefs,
  onClose,
}: {
  open: boolean;
  opportunityId: string;
  dealId?: string | null;
  selectedRefs: string[];
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [dto, setDto] = useState<DocumentWorkspaceRequestMessageDto | null>(null);
  const [deepLink, setDeepLink] = useState("");
  const [mobileDisplay, setMobileDisplay] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  const recordHandoff = async (action: "whatsapp_handoff_opened" | "whatsapp_handoff_cancelled") => {
    await authenticatedJsonFetch("/api/document-workspace/refinement-014", {
      method: "POST",
      body: JSON.stringify({
        action,
        opportunityId,
        dealId: dealId || null,
        correlationId: dto?.correlationId,
      }),
    }).catch(() => undefined);
  };

  const prepare = async () => {
    setBusy(true);
    setError("");
    const res = await authenticatedJsonFetch("/api/document-workspace/refinement-014", {
      method: "POST",
      body: JSON.stringify({
        action: "prepare_handoff",
        opportunityId,
        dealId: dealId || null,
        channel: "whatsapp",
        selectedRefs,
      }),
    });
    const json = await res.json().catch(() => ({}));
    const data = json?.data ?? json;
    setBusy(false);
    if (!res.ok || data?.ok === false || data?.code) {
      setError(data?.message || json?.message || "WhatsApp handoff could not be prepared.");
      return null;
    }
    setDto(data.dto);
    setText(data.text || "");
    setDeepLink(data.whatsapp?.deepLink || "");
    setMobileDisplay(data.whatsapp?.mobileDisplay || "");
    return data as {
      dto: DocumentWorkspaceRequestMessageDto;
      text: string;
      whatsapp?: { deepLink?: string };
    };
  };

  const handoff = async () => {
    const prepared = dto ? { dto, text, whatsapp: { deepLink } } : await prepare();
    if (!prepared?.dto && !prepared?.whatsapp?.deepLink) return;
    const shareText = prepared.text || text;
    const native = preferNativeWebShare({
      hasShareApi: typeof navigator !== "undefined" && typeof navigator.share === "function",
      canShare: typeof navigator !== "undefined" && typeof navigator.canShare === "function"
        ? navigator.canShare({ text: shareText })
        : Boolean(typeof navigator !== "undefined" && navigator.share),
      isMobileLike: typeof navigator !== "undefined" && /Mobi|Android|iPhone/i.test(navigator.userAgent),
    });
    if (native && navigator.share) {
      try {
        await navigator.share({ title: "Rupee Catalyst document request", text: shareText });
        await recordHandoff("whatsapp_handoff_opened");
      } catch {
        await recordHandoff("whatsapp_handoff_cancelled");
      }
      onClose();
      return;
    }
    const link = prepared.whatsapp?.deepLink || deepLink;
    if (link) window.open(link, "_blank", "noopener,noreferrer");
    await recordHandoff("whatsapp_handoff_opened");
    onClose();
  };

  return (
    <div
      data-document-workspace-whatsapp-handoff="014d"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
    >
      <div className="w-full max-w-lg rounded-lg border bg-background p-4">
        <h2 className="text-sm font-semibold">Share pending-document checklist on WhatsApp</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Catalyst One prepares the message. You send it inside WhatsApp. Nothing is marked delivered.
        </p>
        {mobileDisplay ? <p className="mt-2 text-xs">Authorised mobile: {mobileDisplay}</p> : null}
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        <Textarea className="mt-3 min-h-40 text-xs" value={text} readOnly />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => void prepare()}>
            Prepare
          </Button>
          <Button type="button" size="sm" disabled={busy || (!text && !deepLink)} onClick={() => void handoff()}>
            Open WhatsApp
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              void recordHandoff("whatsapp_handoff_cancelled");
              onClose();
            }}
          >
            Cancel
          </Button>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">{DOCUMENT_WORKSPACE_WHATSAPP_NOT_DELIVERED}</p>
      </div>
    </div>
  );
}
