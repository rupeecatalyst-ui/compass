"use client";

/**
 * CO-MARKETING-REDESIGN-007 — Large visual template gallery.
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { renderMarketingEmailHtml } from "@/lib/enterprise-marketing-engine/email-render";
import {
  composeMarketingTemplateGallery,
  applyMarketingGalleryTemplate,
  type MarketingTemplateGalleryCard,
} from "@/lib/enterprise-marketing-engine/template-gallery";
import type { MarketingContentDocument, MarketingContentTemplate } from "@/types/enterprise-marketing-campaign";
import "@/styles/marketing-visual-editor.css";

export function MarketingTemplateGallery({
  organizationId,
  saved,
  onUse,
}: {
  organizationId: string;
  saved: MarketingContentTemplate[];
  onUse: (next: {
    templateId: string;
    subject: string;
    previewText: string;
    content: MarketingContentDocument;
  }) => void;
}) {
  const sections = useMemo(
    () => composeMarketingTemplateGallery({ organizationId, saved }),
    [organizationId, saved],
  );
  const [preview, setPreview] = useState<MarketingTemplateGalleryCard | null>(null);

  return (
    <div className="mkt-tpl-gallery">
      {sections.map((section) => (
        <section key={section.id}>
          <div className="mkt-tpl-section">
            <h3>{section.title}</h3>
          </div>
          {section.cards.length === 0 ? (
            <p className="mkt-tpl-empty">No templates in this group yet.</p>
          ) : (
            <div className="mkt-tpl-grid">
              {section.cards.map((card) => (
                <article key={`${section.id}-${card.id}`} className="mkt-tpl-card">
                  <div
                    className="mkt-tpl-thumb"
                    dangerouslySetInnerHTML={{ __html: card.thumbnailSvg }}
                  />
                  <div>
                    <p className="font-semibold">{card.name}</p>
                    <p className="mkt-tpl-meta">
                      {card.category} · {card.status} · v{card.versionNumber}
                    </p>
                    <p className="mkt-tpl-meta">
                      Last updated {card.updatedAt.slice(0, 10)}
                      {card.lastUsedAt ? ` · Used ${card.lastUsedAt.slice(0, 10)}` : ""}
                    </p>
                  </div>
                  <div className="mkt-tpl-actions">
                    <Button type="button" variant="outline" size="sm" onClick={() => setPreview(card)}>
                      Preview
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const used = applyMarketingGalleryTemplate(card.template);
                        onUse(used);
                      }}
                    >
                      Use Template
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
      {preview ? (
        <div className="mkt-ve-dialog" role="dialog" aria-modal="true" aria-label="Template preview">
          <div className="mkt-ve-dialog-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold">{preview.name}</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setPreview(null)}>
                Close
              </Button>
            </div>
            <iframe
              title={`${preview.name} preview`}
              className="mkt-ve-preview-frame"
              sandbox=""
              srcDoc={renderMarketingEmailHtml({
                content: preview.template.content,
                subject: preview.template.subject || preview.name,
                previewText: preview.template.previewText,
                mode: "desktop",
              })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
