/**
 * CO-WP-007 — Template engine: merge Enterprise SSOT fields into legal templates.
 */

import type { WealthPartnerLegalMergeContext } from "@/types/enterprise-wealth-partner-legal-docket";

const FIELD_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function applyWealthPartnerLegalMerge(
  template: string,
  ctx: WealthPartnerLegalMergeContext,
): string {
  const map = ctx as unknown as Record<string, string>;
  return template.replace(FIELD_RE, (_, key: string) => {
    const value = map[key];
    if (value == null || String(value).trim() === "") return "Not Specified";
    return String(value);
  });
}

export function wrapLegalDocumentHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  body{font-family:Georgia,"Times New Roman",serif;color:#1a1a1a;line-height:1.55;max-width:720px;margin:40px auto;padding:0 24px;}
  h1{font-size:22px;margin:0 0 8px;color:#0f172a;}
  h2{font-size:16px;margin:24px 0 8px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;}
  p,li{font-size:13px;}
  .meta{font-size:12px;color:#64748b;margin-bottom:24px;}
  .box{border:1px solid #cbd5e1;border-radius:8px;padding:12px 14px;margin:12px 0;background:#f8fafc;}
  .sig{margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:24px;}
  .muted{color:#64748b;font-size:11px;}
  table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;}
  th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:left;}
  th{background:#f1f5f9;}
</style>
</head>
<body>
${bodyHtml}
<p class="muted">Generated automatically by Catalyst One · Enterprise Wealth Partner Legal Docket (CO-WP-007). No manual data entry.</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { escapeHtml };
