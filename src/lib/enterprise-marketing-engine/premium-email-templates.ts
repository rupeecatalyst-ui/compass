/**
 * Premium reusable email starters.
 * Design documents only. Selecting one forks a campaign draft. It does not approve a campaign.
 */

import { MARKETING_UNSUBSCRIBE_BLOCK_TYPE } from "@/constants/enterprise-marketing-engine/content";
import { RUPEE_CATALYST_OFFICIAL_LOGO_EMAIL_URL } from "@/lib/enterprise-marketing-engine/official-email-logo";
import type { MarketingContentBlock, MarketingContentTemplate } from "@/types/enterprise-marketing-campaign";

const STAMP = "2026-10-26T00:00:00.000Z";
const LOGO = RUPEE_CATALYST_OFFICIAL_LOGO_EMAIL_URL;
const DISCLAIMER =
  "This note is general information from Rupee Catalyst. It is not a loan sanction, an interest-rate quote, a guarantee, or a decision on eligibility. Your adviser confirms any terms that apply to you. Examples are not a promise of a similar outcome.";

type Props = Record<string, unknown>;

function block(id: string, type: string, props: Props): MarketingContentBlock {
  return { id, type: type as MarketingContentBlock["type"], props };
}

function logo(id: string, background?: string): MarketingContentBlock {
  return block(id, "logo", {
    url: LOGO,
    alt: "Rupee Catalyst",
    align: "center",
    padding: "16",
    ...(background ? { background } : {}),
  });
}

function unsub(id: string): MarketingContentBlock {
  return block(id, MARKETING_UNSUBSCRIBE_BLOCK_TYPE, {
    required: true,
    label: "Unsubscribe",
    href: "{{unsubscribeUrl}}",
    align: "center",
    padding: "16",
  });
}

function disc(id: string): MarketingContentBlock {
  return block(id, "disclaimer", { text: DISCLAIMER, align: "left", padding: "8" });
}

function footer(id: string, background?: string): MarketingContentBlock {
  return block(id, "footer", {
    text: "Rupee Catalyst · {{senderName}}",
    align: "center",
    padding: "16",
    ...(background ? { background } : {}),
  });
}

function shell(
  id: string,
  name: string,
  description: string,
  subject: string,
  previewText: string,
  blocks: MarketingContentBlock[],
): MarketingContentTemplate {
  return {
    id,
    organizationId: "standard",
    name,
    description,
    channel: "EMAIL",
    subject,
    previewText,
    content: { version: 1, blocks },
    disclaimer: DISCLAIMER,
    category: "standard",
    status: "DRAFT",
    origin: "standard",
    versionNumber: 1,
    parentTemplateId: null,
    immutable: true,
    lastUsedAt: null,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

export const MARKETING_PREMIUM_EMAIL_TEMPLATES: MarketingContentTemplate[] = [
  shell(
    "mkt-tpl-premium-banking",
    "Premium Banking",
    "Navy and teal introduction for a private banking conversation.",
    "{{firstName}}, a private note from Rupee Catalyst",
    "A calm way to review {{product}} with your adviser.",
    [
      logo("bank-logo"),
      block("bank-header", "header", {
        title: "A quieter way to review your options",
        subtitle: "Prepared for {{firstName}} in {{city}}",
        align: "left",
        padding: "24",
        color: "#ffffff",
        background: "#0b1f33",
      }),
      block("bank-text", "text", {
        html: "Hello {{firstName}},\n\n{{senderName}} can walk through {{product}} with you: what to gather, what a lender usually asks, and where a conversation is more useful than a brochure.",
        align: "left",
        padding: "16",
        background: "#ffffff",
      }),
      block("bank-card-1", "product_card", {
        badge: "01",
        title: "One conversation",
        body: "We start with your situation, not a pre-filled application.",
        background: "#0b1f33",
      }),
      block("bank-card-2", "product_card", {
        badge: "02",
        title: "Documents when they matter",
        body: "You will see a list only after the product and borrower type are clear.",
        background: "#f8fafc",
      }),
      block("bank-card-3", "product_card", {
        badge: "03",
        title: "Terms in writing",
        body: "Any figure you rely on comes from the lender or your adviser, not from this email.",
        background: "#134e4a",
      }),
      block("bank-cta", "cta", {
        label: "Talk with {{senderName}}",
        url: "https://www.rupeecatalyst.com",
        align: "center",
        padding: "20",
        color: "#134e4a",
        background: "#f0fdfa",
      }),
      disc("bank-disc"),
      footer("bank-footer", "#0b1f33"),
      unsub("bank-unsub"),
    ],
  ),
  shell(
    "mkt-tpl-premium-executive",
    "Executive Minimal",
    "A short white letter with one action.",
    "{{firstName}}, a short note",
    "One question, one next step.",
    [
      logo("exec-logo"),
      block("exec-rule", "divider", { padding: "4" }),
      block("exec-header", "header", {
        title: "{{firstName}},",
        subtitle: "",
        align: "left",
        padding: "8",
        color: "#0f172a",
      }),
      block("exec-space", "spacer", { heightPx: "8", padding: "0" }),
      block("exec-text", "text", {
        html: "I am writing because {{product}} may be worth a careful look. There is no form in this note and no decision attached to it.\n\nIf a short call would help, use the button. If not, you can ignore this message.",
        align: "left",
        padding: "8",
      }),
      block("exec-cta", "cta", {
        label: "Request a call",
        url: "https://www.rupeecatalyst.com",
        align: "left",
        padding: "16",
        color: "#0f172a",
      }),
      block("exec-sign", "text", {
        html: "{{senderName}}\nRupee Catalyst",
        align: "left",
        padding: "8",
      }),
      disc("exec-disc"),
      footer("exec-footer"),
      unsub("exec-unsub"),
    ],
  ),
  shell(
    "mkt-tpl-premium-hero",
    "Image-Led Hero",
    "A large photograph band with a single caption and action.",
    "A closer look at the property conversation",
    "Add an approved photograph, then send.",
    [
      logo("hero-logo"),
      block("hero-image", "hero_image", {
        url: "",
        alt: "Property photograph",
        caption: "A property, seen in context",
        align: "center",
        padding: "0",
        background: "#1e3a5f",
      }),
      block("hero-header", "header", {
        title: "What the photograph is for",
        subtitle: "For {{firstName}} · {{city}}",
        align: "left",
        padding: "20",
        color: "#0f172a",
      }),
      block("hero-text", "text", {
        html: "A photograph helps the conversation. It does not confirm value, approval, or a lender's view. {{senderName}} can explain which papers usually follow a property discussion for {{product}}.",
        align: "left",
        padding: "8",
      }),
      block("hero-cta", "cta", {
        label: "Continue with {{senderName}}",
        url: "https://www.rupeecatalyst.com",
        align: "center",
        padding: "16",
        color: "#1e3a5f",
      }),
      disc("hero-disc"),
      footer("hero-footer"),
      unsub("hero-unsub"),
    ],
  ),
  shell(
    "mkt-tpl-premium-benefits",
    "Benefits Showcase",
    "Three feature cards for how Rupee Catalyst works with you.",
    "How we work with you on {{product}}",
    "Clarity, documents, and a named adviser.",
    [
      logo("ben-logo"),
      block("ben-header", "header", {
        title: "What you can expect from us",
        subtitle: "Not a product promise. A way of working.",
        align: "center",
        padding: "16",
        color: "#0f172a",
        background: "#f8fafc",
      }),
      block("ben-1", "product_card", {
        badge: "01",
        title: "A named adviser",
        body: "{{senderName}} stays with the conversation instead of handing you a generic inbox.",
        background: "#0b1f33",
        padding: "8",
      }),
      block("ben-2", "product_card", {
        badge: "02",
        title: "A clear document list",
        body: "The list follows the product and borrower type. You are not asked for papers that do not apply.",
        background: "#f0fdfa",
        padding: "8",
      }),
      block("ben-3", "product_card", {
        badge: "03",
        title: "Room to ask questions",
        body: "Lender language is translated into plain steps before you decide whether to proceed.",
        background: "#fff7ed",
        padding: "8",
      }),
      block("ben-cta", "cta", {
        label: "See how a review starts",
        url: "https://www.rupeecatalyst.com",
        align: "center",
        padding: "16",
        color: "#0f766e",
      }),
      disc("ben-disc"),
      footer("ben-footer"),
      unsub("ben-unsub"),
    ],
  ),
  shell(
    "mkt-tpl-premium-offer",
    "Rate & Offer Spotlight",
    "A governed offer card that states no rate until an adviser confirms it.",
    "An offer is only an offer once it is confirmed",
    "This email does not quote a rate.",
    [
      logo("offer-logo"),
      block("offer-header", "header", {
        title: "We will not put a rate in this email",
        subtitle: "For discussion · {{product}} · {{city}}",
        align: "center",
        padding: "20",
        color: "#ffffff",
        background: "#134e4a",
      }),
      block("offer-card", "offer_card", {
        badge: "Verified with your adviser",
        title: "Current terms are confirmed in writing",
        body: "If a lender has shared an indicative range, {{senderName}} will show you the source. This message does not invent a rate, a fee, or an approval.",
        amountLabel: "No rate is quoted here",
        background: "#f0fdfa",
        padding: "8",
      }),
      block("offer-text", "text", {
        html: "Use the button only if you want {{senderName}} to explain what would need to be checked before any figure is discussed.",
        align: "left",
        padding: "8",
      }),
      block("offer-cta", "cta", {
        label: "Ask {{senderName}} to confirm terms",
        url: "https://www.rupeecatalyst.com",
        align: "center",
        padding: "16",
        color: "#134e4a",
      }),
      disc("offer-disc"),
      footer("offer-footer"),
      unsub("offer-unsub"),
    ],
  ),
  shell(
    "mkt-tpl-premium-balance-transfer",
    "Before & After",
    "A balance-transfer comparison that does not estimate savings.",
    "A balance transfer is a review, not a promised saving",
    "Two columns. No invented saving.",
    [
      logo("bt-logo"),
      block("bt-header", "header", {
        title: "Before you move a home loan",
        subtitle: "A comparison of questions, not of invented numbers",
        align: "left",
        padding: "16",
        color: "#ffffff",
        background: "#1e3a5f",
      }),
      block("bt-cols", "columns", {
        left: "What you already know\n\nYour current lender, the outstanding amount you can document, and the reason you are looking.",
        right: "What a review looks at\n\nCharges to leave, charges to enter, the remaining tenure, and whether a new lender will even assess the file.",
        padding: "8",
      }),
      block("bt-note", "highlight", {
        title: "No saving is calculated here",
        body: "A lower rate on a brochure is not a saving. {{senderName}} will only discuss a difference after the real charges are on the table.",
        tone: "gold",
        padding: "8",
      }),
      block("bt-cta", "cta", {
        label: "Review a balance transfer",
        url: "https://www.rupeecatalyst.com/apply/home-loan",
        align: "center",
        padding: "16",
        color: "#1e3a5f",
      }),
      disc("bt-disc"),
      footer("bt-footer"),
      unsub("bt-unsub"),
    ],
  ),
  shell(
    "mkt-tpl-premium-journey",
    "Step-by-Step Journey",
    "Four application steps without collecting the application in the email.",
    "Four steps. Then a conversation.",
    "How a {{product}} review usually proceeds.",
    [
      logo("step-logo"),
      block("step-header", "header", {
        title: "How an application usually moves",
        subtitle: "You can stop after any step.",
        align: "left",
        padding: "16",
        color: "#0f172a",
        background: "#f8fafc",
      }),
      block("step-1", "product_card", {
        badge: "Step 1",
        title: "Tell us the product",
        body: "Home loan, balance transfer, or another product. The questions change with that choice.",
        background: "#ffffff",
      }),
      block("step-2", "product_card", {
        badge: "Step 2",
        title: "Share only what the product needs",
        body: "Income, existing loans, and property details appear when they are relevant.",
        background: "#f0fdfa",
      }),
      block("step-3", "product_card", {
        badge: "Step 3",
        title: "See a document list",
        body: "The list comes from the enterprise checklist for that product and borrower type.",
        background: "#ffffff",
      }),
      block("step-4", "product_card", {
        badge: "Step 4",
        title: "Decide with your adviser",
        body: "{{senderName}} explains what a lender would still need to assess. Nothing is submitted for you from this email.",
        background: "#ccfbf1",
      }),
      block("step-cta", "cta", {
        label: "Start with step 1",
        url: "https://www.rupeecatalyst.com/apply/home-loan",
        align: "center",
        padding: "16",
        color: "#0f766e",
      }),
      disc("step-disc"),
      footer("step-footer"),
      unsub("step-unsub"),
    ],
  ),
  shell(
    "mkt-tpl-premium-invitation",
    "Personalised Invitation",
    "Discover My Advantage invitation addressed to the recipient.",
    "{{firstName}}, you are invited to Discover My Advantage",
    "A personal invitation. Not an approval.",
    [
      logo("inv-logo"),
      block("inv-header", "header", {
        title: "{{firstName}}, this invitation is for you",
        subtitle: "Discover My Advantage · {{city}}",
        align: "center",
        padding: "24",
        color: "#ffffff",
        background: "#0b1f33",
      }),
      block("inv-text", "text", {
        html: "{{senderName}} would like to walk you through Discover My Advantage for {{product}}. It is a guided look at your situation. It is not an offer, a sanction, or a confirmation that a lender will proceed.",
        align: "center",
        padding: "16",
      }),
      block("inv-highlight", "highlight", {
        title: "What the session covers",
        body: "Your goal, the product that fits that goal, and the information a later application would need.",
        tone: "teal",
      }),
      block("inv-cta", "cta", {
        label: "Discover My Advantage",
        url: "https://www.rupeecatalyst.com/apply/home-loan",
        align: "center",
        padding: "20",
        color: "#0f766e",
        background: "#f0fdfa",
      }),
      disc("inv-disc"),
      footer("inv-footer", "#0b1f33"),
      unsub("inv-unsub"),
    ],
  ),
  shell(
    "mkt-tpl-premium-business",
    "Business Finance",
    "Working capital, loan against property, and business lending as topics to discuss.",
    "Business finance, explained before it is applied for",
    "Three lending topics. No approval implied.",
    [
      logo("biz-logo"),
      block("biz-header", "header", {
        title: "Business borrowing, in plain language",
        subtitle: "{{companyName}} · {{city}}",
        align: "left",
        padding: "20",
        color: "#ffffff",
        background: "#134e4a",
      }),
      block("biz-intro", "text", {
        html: "Hello {{firstName}}, these are topics {{senderName}} can explain. Choosing one does not start an application and does not mean a lender will agree.",
        align: "left",
        padding: "12",
        background: "#f0fdfa",
      }),
      block("biz-wc", "product_card", {
        badge: "Working capital",
        title: "Cash for the operating cycle",
        body: "Useful when the question is timing of receipts and payments. Turnover alone is not an approval.",
        background: "#0b1f33",
      }),
      block("biz-lap", "product_card", {
        badge: "Loan against property",
        title: "A property as security",
        body: "The property, its papers, and existing charges all have to be examined. Ownership on paper is the start, not the decision.",
        background: "#f8fafc",
      }),
      block("biz-lend", "product_card", {
        badge: "Business lending",
        title: "A facility matched to the purpose",
        body: "Purpose, vintage, and banking conduct are discussed with you before any lender is approached.",
        background: "#134e4a",
      }),
      block("biz-cta", "cta", {
        label: "Discuss business finance",
        url: "https://www.rupeecatalyst.com",
        align: "center",
        padding: "16",
        color: "#134e4a",
      }),
      disc("biz-disc"),
      footer("biz-footer"),
      unsub("biz-unsub"),
    ],
  ),
  shell(
    "mkt-tpl-premium-newsletter",
    "Educational Newsletter",
    "A guidance letter with two ideas side by side.",
    "A short guide from {{senderName}}",
    "Financial guidance without a product push.",
    [
      logo("news-logo"),
      block("news-header", "header", {
        title: "This month's plain-language note",
        subtitle: "Guidance for {{firstName}} · not a recommendation to borrow",
        align: "left",
        padding: "16",
        color: "#0f172a",
        background: "#fff7ed",
      }),
      block("news-lead", "text", {
        html: "Borrowing is a tool. The useful question is whether the repayment still fits if income moves or a rate is reset. This note does not tell you to take a loan.",
        align: "left",
        padding: "12",
      }),
      block("news-cols", "columns", {
        left: "Read the total cost\n\nA headline rate leaves out fees, insurance, and the effect of tenure. Ask for the full cost in writing.",
        right: "Keep a buffer\n\nA facility that uses every rupee of surplus is fragile. Your adviser can help you see the monthly room you would have left.",
        padding: "8",
      }),
      block("news-next", "highlight", {
        title: "If you want this applied to your file",
        body: "{{senderName}} can use your own numbers. This newsletter will not invent them.",
        tone: "slate",
      }),
      block("news-cta", "cta", {
        label: "Ask a question",
        url: "https://www.rupeecatalyst.com",
        align: "center",
        padding: "16",
        color: "#0f172a",
      }),
      disc("news-disc"),
      footer("news-footer"),
      unsub("news-unsub"),
    ],
  ),
  shell(
    "mkt-tpl-premium-follow-up",
    "Customer Follow-Up",
    "A short reminder that names the adviser and invites a reply.",
    "{{firstName}}, shall we pick this up?",
    "A reminder from {{senderName}}. No pressure to proceed.",
    [
      logo("fu-logo"),
      block("fu-header", "header", {
        title: "Picking up where we left off",
        subtitle: "{{product}}",
        align: "left",
        padding: "16",
        color: "#0f172a",
      }),
      block("fu-text", "text", {
        html: "Hello {{firstName}},\n\n{{senderName}} is still available if you want to continue the {{product}} conversation. There is no deadline in this email, and silence is a complete answer.",
        align: "left",
        padding: "8",
        background: "#f8fafc",
      }),
      block("fu-contact", "contact", {
        name: "{{senderName}}",
        email: "",
        phone: "",
        address: "{{city}}",
        padding: "8",
      }),
      block("fu-cta", "cta", {
        label: "Continue the conversation",
        url: "https://www.rupeecatalyst.com",
        align: "center",
        padding: "16",
        color: "#0f766e",
      }),
      disc("fu-disc"),
      footer("fu-footer"),
      unsub("fu-unsub"),
    ],
  ),
  shell(
    "mkt-tpl-premium-festive",
    "Festive & Seasonal",
    "A seasonal greeting with a soft invitation and no sales claim.",
    "Season's greetings from Rupee Catalyst",
    "A greeting for {{firstName}}. No offer attached.",
    [
      logo("fest-logo"),
      block("fest-header", "header", {
        title: "Warm wishes, {{firstName}}",
        subtitle: "From everyone at Rupee Catalyst",
        align: "center",
        padding: "28",
        color: "#0b1f33",
        background: "#fff7ed",
      }),
      block("fest-text", "text", {
        html: "We hope this season gives you a little room to breathe. If a financial question is on your mind, it can wait until you are ready. There is no seasonal rate, gift, or approval attached to this note.",
        align: "center",
        padding: "12",
        background: "#ffffff",
      }),
      block("fest-highlight", "highlight", {
        title: "When you are ready",
        body: "{{senderName}} can pick up {{product}} with you. Until then, this is only a greeting.",
        tone: "gold",
        background: "#fff7ed",
      }),
      block("fest-cta", "cta", {
        label: "Say hello",
        url: "https://www.rupeecatalyst.com",
        align: "center",
        padding: "16",
        color: "#134e4a",
        background: "#fff7ed",
      }),
      disc("fest-disc"),
      footer("fest-footer", "#0b1f33"),
      unsub("fest-unsub"),
    ],
  ),
];
