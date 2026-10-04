"use client";

/**
 * CO-MARKETING-REDESIGN-008 — Large desktop/mobile preview workspace.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MarketingCampaignPreviewPayload } from "@/types/enterprise-marketing-campaign";
import type { MarketingPersonalisationSampleRecipient } from "@/lib/enterprise-marketing-engine/personalisation-catalogue";

export function MarketingPreviewWorkspace({
  preview,
  samples,
  selectedSampleId,
  onSelectSample,
  initialMode = "desktop",
}: {
  preview: MarketingCampaignPreviewPayload | null;
  samples: MarketingPersonalisationSampleRecipient[];
  selectedSampleId: string | null;
  onSelectSample: (id: string) => void;
  initialMode?: "desktop" | "mobile";
}) {
  const [mode, setMode] = useState<"desktop" | "mobile">(initialMode);
  const html = mode === "mobile" ? preview?.htmlMobile : preview?.htmlDesktop;

  return (
    <section className="mkt-preview-workspace">
      <div className="mkt-preview-workspace-meta">
        <h3 className="font-semibold">Resolved sample preview</h3>
        <h3 className="font-semibold">{mode === "desktop" ? "Desktop preview" : "Mobile preview"}</h3>
        <p className="text-sm">Subject: {preview?.subject || "Unavailable"}</p>
        <p className="text-sm">Preheader: {preview?.preheader || "Unavailable"}</p>
        <p className="text-sm">
          Sender: {preview?.sender.fromName || "Unavailable"} &lt;{preview?.sender.fromAddress || "Unavailable"}&gt;
        </p>
        <p className="text-sm">
          Sample recipient:{" "}
          {preview?.sampleRecipientAvailable
            ? preview.sampleRecipientLabel
            : "Unavailable — run audience preview; invented names are not used as the only sample."}
        </p>
        {samples.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {samples.map((sample) => (
              <Button
                key={sample.id}
                type="button"
                size="sm"
                variant={selectedSampleId === sample.id ? "default" : "outline"}
                onClick={() => onSelectSample(sample.id)}
              >
                {sample.label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No eligible audience preview recipient yet.</p>
        )}
        <div className="mt-3 flex gap-2">
          <Button type="button" size="sm" variant={mode === "desktop" ? "default" : "outline"} onClick={() => setMode("desktop")}>
            Desktop view
          </Button>
          <Button type="button" size="sm" variant={mode === "mobile" ? "default" : "outline"} onClick={() => setMode("mobile")}>
            Mobile view
          </Button>
        </div>
        {preview?.missingImageWarnings?.length ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            Missing-image warning: {preview.missingImageWarnings.join("; ")}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No missing-image warnings.</p>
        )}
        <p className="mt-2 text-sm">
          Unsubscribe verification: {preview?.unsubscribeVerified ? "Structural unsubscribe present" : "Missing"}
        </p>
        <div className="mt-3">
          <h4 className="text-sm font-semibold">Link inventory</h4>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {(preview?.linkInventory ?? []).map((link) => (
              <li key={`${link.kind}:${link.href}`}>
                {link.kind}: {link.href}
              </li>
            ))}
            {!preview?.linkInventory?.length ? <li>No links inventoried yet.</li> : null}
          </ul>
        </div>
      </div>
      <div className={`mkt-preview-workspace-frame mkt-preview-${mode}`}>
        {html ? (
          <iframe title={`${mode} email preview`} sandbox="" srcDoc={html} className="mkt-preview-iframe" />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">Render the preview to inspect the message.</p>
        )}
      </div>
    </section>
  );
}
