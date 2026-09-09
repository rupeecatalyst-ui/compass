"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DocumentWorkspaceChecklistShareDialog } from "@/components/catalyst-one/document-workspace/document-workspace-checklist-share";
import {
  DOCUMENT_WORKSPACE_INCOMPLETE_PROGRAMME_DISCLAIMER,
  DOCUMENT_WORKSPACE_EMAIL_NOT_SENT,
} from "@/constants/document-workspace-inbound";
import {
  EMPLOYEE_PWA_DESKTOP_DOCUMENT_WORKSPACE,
  EMPLOYEE_PWA_DOCUMENT_ADMIN_REQUIRED,
} from "@/constants/employee-pwa";
import { employeePwaJson } from "@/lib/employee-pwa/api";
import { getAccessToken } from "@/lib/api-client";
import { isRequestableChecklistStatus } from "@/lib/document-workspace/checklist-selection";

type ChecklistItem = {
  requestRef: string;
  label: string;
  ownerLabel: string;
  ownerKind: string;
  status: string;
};

type DocRow = {
  id: string;
  displayName?: string;
  originalFilename?: string;
  typeRef?: string;
};

export function EmployeePwaDocuments() {
  const params = useParams<{ opportunityId?: string }>();
  const search = useSearchParams();
  const [opportunityId, setOpportunityId] = useState(params.opportunityId || "");
  const dealId = search.get("dealId");
  const [opportunities, setOpportunities] = useState<Array<{ id: string; primaryContactName?: string }>>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [incomplete, setIncomplete] = useState(false);
  const [inbound, setInbound] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [emailNote, setEmailNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (opportunityId) return;
    void employeePwaJson<{ items?: Array<{ id: string; primaryContactName?: string }> }>(
      "/api/enterprise-opportunities?orderBy=createdAt&limit=20",
    ).then((data) => setOpportunities(data.items ?? []));
  }, [opportunityId]);

  useEffect(() => {
    if (!opportunityId) return;
    void (async () => {
      try {
        const checklist = await employeePwaJson<{
          items?: ChecklistItem[];
          incompleteProgramme?: boolean;
        }>(
          `/api/document-workspace/refinement-014?view=lod-checklist&opportunityId=${encodeURIComponent(opportunityId)}${
            dealId ? `&dealId=${encodeURIComponent(dealId)}` : ""
          }`,
        );
        setItems(checklist.items ?? []);
        setIncomplete(Boolean(checklist.incompleteProgramme));
        const files = await employeePwaJson<{ items?: DocRow[] }>(
          `/api/enterprise-transaction-documents?opportunityId=${encodeURIComponent(opportunityId)}${
            dealId ? `&dealId=${encodeURIComponent(dealId)}` : ""
          }`,
        );
        setDocs(files.items ?? []);
        const inboundSummary = await employeePwaJson<{ count?: number }>(
          `/api/document-workspace/refinement-014?view=inbound-new-summary&opportunityIds=${opportunityId}`,
        );
        setInbound(Number(inboundSummary.count || 0));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Documents could not be loaded.");
      }
    })();
  }, [opportunityId, dealId]);

  const requestable = useMemo(
    () => items.filter((item) => isRequestableChecklistStatus(item.status)),
    [items],
  );

  const download = async (documentId: string) => {
    const token = getAccessToken();
    const url = `/api/enterprise-transaction-documents/binary?documentId=${encodeURIComponent(documentId)}&opportunityId=${encodeURIComponent(opportunityId)}&disposition=attachment`;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      setError("Download was refused.");
      return;
    }
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "document";
    anchor.click();
    URL.revokeObjectURL(href);
  };

  const queueEmail = async () => {
    const result = await employeePwaJson<{ queued?: boolean; sent?: boolean }>(
      "/api/document-workspace/refinement-014",
      {
        method: "POST",
        body: JSON.stringify({
          action: "prepare_handoff",
          opportunityId,
          dealId,
          channel: "email",
          selectedRefs: selected,
          queueEmail: true,
        }),
      },
    );
    setEmailNote(
      result.sent ? "Email was marked sent — unexpected." : DOCUMENT_WORKSPACE_EMAIL_NOT_SENT,
    );
  };

  if (!opportunityId) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Documents</h1>
        <p className="text-xs text-muted-foreground">Select an Opportunity. View and share only.</p>
        {opportunities.map((row) => (
          <button
            key={row.id}
            type="button"
            className="block min-h-12 w-full rounded-xl border px-3 py-3 text-left text-sm"
            onClick={() => setOpportunityId(row.id)}
          >
            {row.primaryContactName || row.id}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div data-employee-pwa-documents="true" className="space-y-3">
      <h1 className="text-xl font-semibold">Documents</h1>
      <p className="text-xs text-muted-foreground">{EMPLOYEE_PWA_DOCUMENT_ADMIN_REQUIRED}</p>
      {inbound ? <p data-employee-pwa-new-from-email="true">New from Email: {inbound}</p> : null}
      {incomplete ? (
        <p className="text-xs text-muted-foreground">{DOCUMENT_WORKSPACE_INCOMPLETE_PROGRAMME_DISCLAIMER}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section>
        <h2 className="text-sm font-semibold">Uploaded documents</h2>
        <ul className="mt-2 space-y-2">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
              <span>{doc.displayName || doc.originalFilename || doc.typeRef}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void download(doc.id)}>
                View / Download
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Pending checklist</h2>
        <ul className="mt-2 space-y-2">
          {requestable.map((item) => (
            <li key={item.requestRef} className="flex items-start gap-2 rounded-xl border px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5"
                checked={selected.includes(item.requestRef)}
                onChange={(event) => {
                  setSelected((prev) =>
                    event.target.checked
                      ? [...prev, item.requestRef]
                      : prev.filter((ref) => ref !== item.requestRef),
                  );
                }}
                aria-label={item.label}
              />
              <span>
                {item.label}
                <span className="block text-xs text-muted-foreground">
                  {item.ownerLabel} · {item.ownerKind} · {item.status}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" className="min-h-11" disabled={!selected.length} onClick={() => setShareOpen(true)}>
            WhatsApp handoff
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={!selected.length}
            onClick={() => void queueEmail()}
          >
            Queue email Outbox
          </Button>
        </div>
        {emailNote ? <p className="text-xs text-muted-foreground">{emailNote}</p> : null}
      </section>

      <Link className="block text-sm text-primary" href={`${EMPLOYEE_PWA_DESKTOP_DOCUMENT_WORKSPACE}?opportunityId=${opportunityId}`}>
        Open full Document Workspace
      </Link>

      <DocumentWorkspaceChecklistShareDialog
        open={shareOpen}
        opportunityId={opportunityId}
        dealId={dealId}
        selectedRefs={selected}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
