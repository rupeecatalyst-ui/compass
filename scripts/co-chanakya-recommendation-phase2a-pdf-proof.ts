/**
 * Local PDF check for one saved recommendation version.
 * Uses the existing Puppeteer renderer. No email and no database.
 */
import assert from "node:assert/strict";
import { buildRecommendationClientMessage, buildRecommendationPdfHtml, RECOMMENDATION_CLIENT_LOGO_URL } from "../src/lib/compass-customer-gateway/recommendation-client-message";
import { projectCompassRecommendationHistory, rememberOriginalCompassRecommendation } from "../src/lib/compass-customer-gateway/recommendation-history";
import { renderAccountingInvoicePdf } from "../server/services/enterprise-accounting-invoice/invoice-pdf.service";

const stored = rememberOriginalCompassRecommendation({ compassAnswers: {} }, {
  recordedAt: "2026-10-23T08:00:00.000Z",
  journeyVersion: 2,
  recommendationBinding: "published",
  status: "ready",
  answers: {},
  cards: [{
    displayName: "Axis Bank",
    rank: 1,
    lenderRef: "lender:axis",
    programmeId: "prog-axis",
    interestRateLabel: "8.4%",
    tentativeOfferLabel: null,
    estimatedEmiLabel: null,
    tenureLabel: null,
    processingTimeLabel: null,
  }],
});
const version = projectCompassRecommendationHistory(stored.snapshot).versions[0];
if (!version) throw new Error("fixture version missing");
const message = buildRecommendationClientMessage({ version, customerName: "Rajnish Singh" });
const html = buildRecommendationPdfHtml({
  message,
  customerName: "Rajnish Singh",
  opportunityReference: "OPP-FIXTURE",
  logoSrc: null,
});
assert.match(html, /Axis Bank/);
assert.match(html, /Not available/);
assert.match(html, /indicative/);
assert.equal(html.includes(RECOMMENDATION_CLIENT_LOGO_URL), true);
assert.equal(html.includes("HDFC Bank"), false);

async function main(): Promise<void> {
  const { default: puppeteer } = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const rendered = await page.evaluate(() => {
      const image = document.querySelector("img");
      return {
        width: image instanceof HTMLImageElement ? image.naturalWidth : 0,
        text: document.body.innerText,
      };
    });
    assert.ok(rendered.width > 0, "logo did not load");
    assert.match(rendered.text, /Axis Bank/);
    assert.match(rendered.text, /Not available/);
    assert.match(rendered.text, /indicative/);
    assert.equal(rendered.text.includes("HDFC"), false);
  } finally {
    await browser.close();
  }

  const pdf = await renderAccountingInvoicePdf(html);
  assert.equal(Buffer.from(pdf.subarray(0, 5)).toString("utf8"), "%PDF-");
  assert.ok(pdf.byteLength > 1000);
  const source = Buffer.from(pdf).toString("latin1");
  assert.match(source, /\/Image/);
  console.log(`co-chanakya-recommendation-phase2a-pdf-proof: ok bytes=${pdf.byteLength}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
