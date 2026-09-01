import "server-only";

/**
 * Render invoice HTML → PDF using Puppeteer (real PDF, not a screenshot email).
 */

export async function renderAccountingInvoicePdf(html: string): Promise<Uint8Array> {
  const { default: puppeteer } = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}
