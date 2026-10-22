"use client";

import { useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { publicWhatsAppHref, siteConfig } from "@/config/site";
import {
  PUBLIC_WHATSAPP_LINK_REL,
  PUBLIC_WHATSAPP_LINK_TARGET,
} from "@/lib/public-whatsapp";

/** Existing specialist request and the approved public WhatsApp chat. */
export function DiscoveryExpertActions() {
  const { requestTalkToExpert, journeySessionToken } = useDiscovery();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="border-t border-white/[0.06] bg-[#05070c]/90 px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">Need help with this application?</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !journeySessionToken}
            onClick={() => {
              setBusy(true);
              setNote(null);
              void requestTalkToExpert()
                .then((sla) => {
                  setNote(sla?.borrowerCopy || "A specialist will contact you.");
                })
                .finally(() => setBusy(false));
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs font-medium text-foreground transition hover:border-primary/40 disabled:opacity-50"
          >
            <Phone className="h-3.5 w-3.5" />
            Talk to an Expert
          </button>
          <a
            href={publicWhatsAppHref}
            target={PUBLIC_WHATSAPP_LINK_TARGET}
            rel={PUBLIC_WHATSAPP_LINK_REL}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs font-medium text-foreground transition hover:border-primary/40"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Chat with an Expert
          </a>
        </div>
      </div>
      {note ? <p className="mx-auto mt-2 max-w-3xl text-xs text-muted-foreground">{note}</p> : null}
      <p className="sr-only">{siteConfig.whatsappLabel}</p>
    </div>
  );
}
