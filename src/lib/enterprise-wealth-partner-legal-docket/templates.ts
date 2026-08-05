/**
 * CO-WP-007 — Enterprise legal document templates (auto-merge only).
 */

import type { WealthPartnerLegalDocumentKind } from "@/types/enterprise-wealth-partner-legal-docket";

const TEMPLATES: Record<WealthPartnerLegalDocumentKind, string> = {
  cover_sheet: `
<h1>Wealth Partner Legal Docket — Cover Sheet</h1>
<p class="meta">Version {{documentVersion}} · Generated {{generatedDate}}</p>
<div class="box">
<table>
<tr><th>Wealth Partner Code</th><td>{{partnerCode}}</td></tr>
<tr><th>Name</th><td>{{partnerName}}</td></tr>
<tr><th>Partner Type</th><td>{{partnerTypeLabel}}</td></tr>
<tr><th>Mobile</th><td>{{mobile}}</td></tr>
<tr><th>Email</th><td>{{email}}</td></tr>
<tr><th>Address</th><td>{{address}}</td></tr>
<tr><th>Status</th><td>{{statusLabel}}</td></tr>
<tr><th>Agreement Version</th><td>{{documentVersion}}</td></tr>
<tr><th>Generated Date</th><td>{{generatedDate}}</td></tr>
</table>
</div>
<p>This docket is generated automatically from Catalyst One Enterprise registries. All signed documents form part of the Wealth Partner permanent Legal Record.</p>
`,

  welcome_letter: `
<h1>Welcome Letter</h1>
<p class="meta">{{companyName}} · {{generatedDate}}</p>
<p>Dear {{partnerName}},</p>
<p>Welcome to the {{companyBrand}} Wealth Partner network. Your Wealth Partner Code is <strong>{{partnerCode}}</strong> ({{partnerTypeLabel}}).</p>
<p>This Legal Docket sets out your engagement terms, commercial schedule, conduct standards, and platform use obligations. Please review each document carefully.</p>
<p>Your Relationship Manager: {{relationshipManager}}.</p>
<p>We look forward to a compliant and productive partnership.</p>
<p>Yours sincerely,<br/>{{authorisedSignatory}}<br/><span class="muted">{{authorisedSignatoryTitle}} · {{companyName}}</span></p>
`,

  engagement_agreement: `
<h1>Channel Partner Engagement Agreement</h1>
<p class="meta">Version {{documentVersion}} · Effective {{effectiveFrom}} to {{effectiveUntil}}</p>
<h2>1. Parties</h2>
<p><strong>Company:</strong> {{companyName}} (GSTIN {{companyGstin}}, PAN {{companyPan}}), {{companyAddress}}.</p>
<p><strong>Wealth Partner:</strong> {{partnerName}} (Code {{partnerCode}}, Type {{partnerTypeLabel}}), Contact {{mobile}} / {{email}}, Address {{address}}.</p>
<h2>2. Appointment</h2>
<p>The Company appoints the Wealth Partner as a non-exclusive channel partner for sourcing and facilitating loan opportunities in accordance with Catalyst One policies.</p>
<h2>3. Term</h2>
<p>This Agreement is effective from {{effectiveFrom}} and remains valid for {{validityYears}} years until {{effectiveUntil}}, unless earlier suspended or terminated under Company policy.</p>
<h2>4. Commercial Terms</h2>
<p>Commercial participation shares are set out exclusively in the Commercial Schedule (Version {{commercialVersion}}) and are read from the Wealth Partner Commercial Profile — not hardcoded herein.</p>
<h2>5. Compliance</h2>
<p>The Wealth Partner shall comply with the Code of Conduct, Privacy Undertaking, Acceptable Use Policy, Branding Guidelines, and Compliance Declaration forming part of this Docket.</p>
<h2>6. Governing Law</h2>
<p>This Agreement is governed by the laws of India.</p>
<div class="sig">
<div><p><strong>Wealth Partner</strong></p><p>{{partnerName}}</p><p class="muted">Signature / Digital Acceptance</p></div>
<div><p><strong>{{companyName}}</strong></p><p>{{authorisedSignatory}}</p><p class="muted">{{authorisedSignatoryTitle}}</p></div>
</div>
`,

  commercial_schedule: `
<h1>Commercial Schedule</h1>
<p class="meta">Read from Wealth Partner Commercial Profile · Commercial Version {{commercialVersion}} · Effective {{commercialEffectiveFrom}}</p>
<table>
<tr><th>Participation Role</th><th>Share of RC Revenue</th></tr>
<tr><td>Referral</td><td>{{referralSharePercent}}%</td></tr>
<tr><td>Sole Executor</td><td>{{soleExecutorSharePercent}}%</td></tr>
<tr><td>Joint Executor</td><td>{{jointExecutorSharePercent}}%</td></tr>
</table>
<p>Effective Date: {{commercialEffectiveFrom}}. These percentages are populated automatically from Catalyst One and must not be typed manually.</p>
<p>Partner: {{partnerName}} ({{partnerCode}}).</p>
`,

  code_of_conduct: `
<h1>Code of Conduct</h1>
<p class="meta">{{partnerName}} · {{partnerCode}} · Version {{documentVersion}}</p>
<ol>
<li>Act with integrity and in the best interest of customers and {{companyBrand}}.</li>
<li>Do not misrepresent products, rates, or approval outcomes.</li>
<li>Protect customer data and never share credentials for Catalyst One.</li>
<li>Disclose conflicts of interest promptly to the Relationship Manager.</li>
<li>Comply with applicable lending, KYC, and anti-bribery laws.</li>
</ol>
<p>Acknowledgement by {{partnerName}} forms part of the Digital Acceptance Certificate.</p>
`,

  privacy_undertaking: `
<h1>Privacy &amp; Confidentiality Undertaking</h1>
<p class="meta">{{partnerName}} · {{partnerCode}}</p>
<p>I, {{partnerName}}, undertake to keep confidential all customer, commercial, and platform information obtained through {{companyName}} / Catalyst One, and to use such information solely for authorised partnership activities.</p>
<p>Contact details on record: {{mobile}} · {{email}} · {{address}}.</p>
`,

  acceptable_use_policy: `
<h1>Catalyst One Acceptable Use Policy</h1>
<p class="meta">Version {{documentVersion}} · {{generatedDate}}</p>
<p>Access to Catalyst One by {{partnerName}} ({{partnerCode}}) is granted for legitimate partnership operations only.</p>
<ul>
<li>No sharing of login credentials.</li>
<li>No unauthorised data export or scraping.</li>
<li>No attempts to bypass workflow, policy, or audit controls.</li>
<li>Report suspected misuse immediately to {{supportContact}}.</li>
</ul>
`,

  branding_guidelines: `
<h1>Branding &amp; Marketing Guidelines</h1>
<p class="meta">{{companyBrand}} ({{companyLogoInitials}})</p>
<p>{{partnerName}} may reference {{companyBrand}} only with approved materials. Do not alter logos, invent product claims, or use branding that implies employment by {{companyName}}.</p>
<p>Marketing queries: {{operationsContact}}.</p>
`,

  compliance_declaration: `
<h1>Compliance Declaration</h1>
<p class="meta">{{partnerName}} · {{partnerCode}} · {{generatedDate}}</p>
<p>I declare that KYC information provided to Catalyst One (PAN {{pan}}, GST {{gstin}}) is true and complete to the best of my knowledge, and that I will notify {{companyName}} of material changes promptly.</p>
<p>Banking summary on record: {{bankSummary}}.</p>
`,

  kyc_summary: `
<h1>KYC Summary</h1>
<p class="meta">Populated from Wealth Partner / Contact KYC fields · {{generatedDate}}</p>
<table>
<tr><th>Field</th><th>Value</th></tr>
<tr><td>Name</td><td>{{partnerName}}</td></tr>
<tr><td>Wealth Partner Code</td><td>{{partnerCode}}</td></tr>
<tr><td>PAN</td><td>{{pan}}</td></tr>
<tr><td>GSTIN</td><td>{{gstin}}</td></tr>
<tr><td>Mobile</td><td>{{mobile}}</td></tr>
<tr><td>Email</td><td>{{email}}</td></tr>
<tr><td>Address</td><td>{{address}}</td></tr>
<tr><td>City / State</td><td>{{city}} / {{state}}</td></tr>
<tr><td>Bank Details</td><td>{{bankSummary}}</td></tr>
</table>
`,

  operational_contacts: `
<h1>Operational Contacts</h1>
<p class="meta">{{companyName}} · for {{partnerName}} ({{partnerCode}})</p>
<table>
<tr><th>Function</th><th>Contact</th></tr>
<tr><td>Relationship Manager</td><td>{{relationshipManager}}</td></tr>
<tr><td>Operations</td><td>{{operationsContact}}</td></tr>
<tr><td>Finance</td><td>{{financeContact}}</td></tr>
<tr><td>Support</td><td>{{supportContact}}</td></tr>
</table>
`,

  digital_acceptance_certificate: `
<h1>Digital Acceptance Certificate</h1>
<p class="meta">Generated after Docket completion · Version {{documentVersion}}</p>
<div class="box">
<table>
<tr><th>Date</th><td>{{generatedDate}}</td></tr>
<tr><th>Time</th><td>{{generatedDateTime}}</td></tr>
<tr><th>Document Version</th><td>{{documentVersion}}</td></tr>
<tr><th>Wealth Partner</th><td>{{partnerName}} ({{partnerCode}})</td></tr>
<tr><th>Partner Signatory</th><td>{{partnerName}}</td></tr>
<tr><th>Company Signatory</th><td>{{authorisedSignatory}} ({{authorisedSignatoryTitle}})</td></tr>
<tr><th>Effective From</th><td>{{effectiveFrom}}</td></tr>
<tr><th>Effective Until</th><td>{{effectiveUntil}}</td></tr>
<tr><th>Activated By</th><td>{{activatedBy}}</td></tr>
<tr><th>Approval Date</th><td>{{approvalDate}}</td></tr>
</table>
</div>
<p>This certificate confirms digital acceptance of the Legal Docket documents generated by Catalyst One for this Wealth Partner.</p>
`,
};

export function getWealthPartnerLegalTemplate(
  kind: WealthPartnerLegalDocumentKind,
): string {
  return TEMPLATES[kind];
}
