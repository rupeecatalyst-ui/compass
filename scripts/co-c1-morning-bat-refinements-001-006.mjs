/**
 * Morning authorised visual BAT — Catalyst One refinements 1–6.
 * Uses CATALYST_BAT_* only. Never prints passwords, customer emails, or mobiles.
 * Does not commit, deploy, migrate, or apply reconciliation.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env.local") });
config({ path: path.join(root, ".env") });

const emailConfigured = Boolean(process.env.CATALYST_BAT_EMAIL?.trim());
const passwordConfigured = Boolean(process.env.CATALYST_BAT_PASSWORD?.trim());
const email = process.env.CATALYST_BAT_EMAIL?.trim() || "";
const password = process.env.CATALYST_BAT_PASSWORD?.trim() || "";

const OUT = path.join(root, ".tmp", "morning-bat-001-006");
fs.mkdirSync(OUT, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function redactText(value) {
  return String(value || "")
    .replace(/\+91[\s-]?[0-9]{10}/g, "[redacted-mobile]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, "[redacted-pan]");
}

function hostClass(url) {
  try {
    const u = new URL(url);
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    return { origin: `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ""}`, local };
  } catch {
    return { origin: null, local: false };
  }
}

async function probe(url) {
  try {
    const res = await fetch(url, { redirect: "manual" });
    return res.status > 0 && res.status < 500;
  } catch {
    return false;
  }
}

async function resolveBase() {
  const fromEnv = (process.env.CATALYST_BAT_URL || "").replace(/\/$/, "");
  const candidates = ["http://localhost:3001", "http://localhost:3000", fromEnv].filter(Boolean);
  for (const base of candidates) {
    if (await probe(`${base}/login`)) return base;
  }
  return null;
}

function redactUser(user) {
  if (!user || typeof user !== "object") return null;
  return { id: user.id || null, role: user.role || null, firstName: user.firstName || null };
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return path.relative(root, file).replace(/\\/g, "/");
}

async function clickText(page, pattern, { timeout = 4000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const clicked = await page.evaluate((source) => {
      const re = new RegExp(source, "i");
      const el = Array.from(document.querySelectorAll("button, a, [role='tab'], [role='menuitem'], label, h2, h3, h4")).find(
        (n) => re.test((n.textContent || "").trim()),
      );
      if (!el) return false;
      el.click();
      return true;
    }, pattern.source || pattern);
    if (clicked) return true;
    await sleep(200);
  }
  return false;
}

async function main() {
  const results = {
    title: "MORNING AUTHORISED BAT — CATALYST ONE REFINEMENTS 1–6",
    startedAt: new Date().toISOString(),
    batCredentialsConfigured: emailConfigured && passwordConfigured,
    base: null,
    host: null,
    refinements: {},
  };

  if (!emailConfigured || !passwordConfigured) {
    results.blocker =
      "BAT credentials are not configured. Authenticated certification cannot continue.";
    fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
    console.log("BLOCKED authenticated visual BAT. CATALYST_BAT_EMAIL / CATALYST_BAT_PASSWORD are not configured.");
    process.exit(0);
  }

  const base = await resolveBase();
  results.base = base;
  results.host = base ? hostClass(base) : null;
  if (!base) {
    results.blocker = "No reachable Catalyst One login (localhost:3001 / localhost:3000 / CATALYST_BAT_URL).";
    fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
    console.log("BLOCKED no reachable local/authorised Catalyst One URL.");
    process.exit(0);
  }

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, rememberMe: true }),
  });
  const loginJson = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok || !loginJson.success) {
    results.blocker = `Login failed (${loginRes.status}).`;
    fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
    console.log("BLOCKED login failed for configured BAT account.");
    process.exit(0);
  }
  const session = loginJson.data || {};
  const accessToken = session.accessToken;
  const refreshToken = session.refreshToken;
  const user = redactUser(session.user);
  if (!accessToken || !refreshToken || !session.user) {
    results.blocker = "Login response missing session.";
    fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
    console.log("BLOCKED login response missing session tokens.");
    process.exit(0);
  }
  results.actor = user;

  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--window-size=1440,900", "--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.setDefaultTimeout(45000);

  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    (s) => {
      localStorage.setItem("compass:access-token", s.accessToken);
      localStorage.setItem("compass:refresh-token", s.refreshToken);
      localStorage.setItem("compass:user", JSON.stringify(s.user));
      document.cookie = `compass-access-token=${s.accessToken}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `compass-refresh-token=${s.refreshToken}; path=/; max-age=604800; SameSite=Lax`;
    },
    { accessToken, refreshToken, user: session.user },
  );

  async function visit(pathname, waitMs = 2500) {
    await page.goto(`${base}${pathname}`, { waitUntil: "networkidle2", timeout: 90000 }).catch(() =>
      page.goto(`${base}${pathname}`, { waitUntil: "domcontentloaded" }),
    );
    await sleep(waitMs);
    return page.evaluate(() => ({
      url: location.href,
      title: document.title,
      text: (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 3500),
    }));
  }

  const named = { contactId: null, name: null, status: null };
  try {
    const contactRes = await page.evaluate(async () => {
      const token = localStorage.getItem("compass:access-token");
      const res = await fetch("/api/ecm/contacts?search=Nandkumar%20Jha&pageSize=20", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      const items = body?.data?.items || body?.data?.contacts || body?.items || [];
      return {
        status: res.status,
        items: (items || []).map((row) => ({
          id: row.id || row.contactId || null,
          name: row.name || row.fullName || null,
          status: row.status || null,
        })),
      };
    });
    const hit = (contactRes.items || []).find((row) =>
      String(row.name || "")
        .toLowerCase()
        .replace(/\s+/g, "")
        .includes("nandkumarjha"),
    );
    if (hit?.id) {
      named.contactId = hit.id;
      named.name = hit.name;
      named.status = hit.status || null;
    }
  } catch {
    named.lookupError = "ECM query failed";
  }

  // ── Refinement 2: My Deals ──────────────────────────────────────────────
  const r2obs = await visit("/my-deals", 5000);
  const r2Shot = await shot(page, "r2-my-deals");
  const r2ui = await page.evaluate(() => {
    const columns = Array.from(document.querySelectorAll('[data-surface="my-deals-kanban"] h2'))
      .map((el) => (el.textContent || "").trim())
      .filter(Boolean);
    const cards = document.querySelectorAll('[data-surface="my-deals-kanban-card"]').length;
    const logos = document.querySelectorAll('[data-surface="my-deals-kanban-card"] img').length;
    const fieldsBtn = Array.from(document.querySelectorAll("button")).some((n) =>
      /kanban fields/i.test(n.textContent || ""),
    );
    const actionChips = Array.from(document.querySelectorAll("button"))
      .map((n) => (n.textContent || "").trim())
      .filter((t) => /^(Call|Email|WhatsApp|Activity|Follow-up)$/i.test(t))
      .slice(0, 8);
    const ctas = Array.from(document.querySelectorAll('[data-surface="my-deals-kanban-card"] button'))
      .map((n) => (n.textContent || "").trim())
      .filter((t) => /open|lender|pipeline|accounting|workspace|login|credit/i.test(t))
      .slice(0, 8);
    const scroller = document.querySelector('[aria-label="Loan Deal Kanban"]');
    return {
      columns,
      cards,
      logos,
      fieldsBtn,
      actionChips,
      ctas,
      loansHeading: /my deals|loan/i.test(document.body.innerText),
      investmentCopy: /investment registry/i.test(document.body.innerText),
      canScrollX: Boolean(scroller && scroller.scrollWidth > scroller.clientWidth + 8),
    };
  });
  await clickText(page, /^Kanban Fields$/);
  await sleep(600);
  const r2fields = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-surface="my-deals-kanban-fields"] label'))
      .map((n) => (n.textContent || "").trim())
      .slice(0, 16),
  );
  const r2fieldsShot = await shot(page, "r2-kanban-fields");
  await page.evaluate(() => {
    const scroller = document.querySelector('[aria-label="Loan Deal Kanban"]');
    if (scroller) scroller.scrollLeft = Math.min(scroller.scrollWidth, 480);
  });
  await sleep(500);
  const r2ScrollShot = await shot(page, "r2-my-deals-scrolled");

  const openedDeal = await page.evaluate(() => {
    const card = document.querySelector('[data-surface="my-deals-kanban-card"]');
    if (!card) return { clicked: false, dealId: null };
    const dealId = card.getAttribute("data-deal-id");
    const cta = Array.from(card.querySelectorAll("button")).find((n) => {
      const t = (n.textContent || "").trim();
      return t && !/^(Call|Email|WhatsApp|Activity|Follow-up)$/i.test(t);
    });
    (cta || card).click();
    return { clicked: true, dealId };
  });
  if (openedDeal.clicked) await sleep(4500);

  // ── Refinement 1: Deal Control / Participants / RC employee ─────────────
  const dealPath = page.url().replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f-]{16,}/gi, "[id]");
  const r1shotWorkspace = await shot(page, "r1-deal-workspace");
  const dealControlClicked =
    (await clickText(page, /^Deal Control$/)) || (await clickText(page, /Deal Control/));
  await sleep(1500);
  const r1controlShot = dealControlClicked ? await shot(page, "r1-deal-control") : null;
  const r1ui = await page.evaluate(() => {
    const text = document.body?.innerText || "";
    const select = document.querySelector('[aria-label="Rupee Catalyst Employee"]');
    return {
      inherited: /inherited from opportunity/i.test(text),
      override: /deal override|restore opportunity inheritance/i.test(text),
      rcEmployee: /rupee catalyst employee/i.test(text),
      dealControl: /deal control/i.test(text),
      selectPresent: Boolean(select),
      selectDisabled: Boolean(select && select.getAttribute("data-disabled") === "true") ||
        Boolean(select && select.hasAttribute("disabled")),
      participantsCue: /participant/i.test(text),
    };
  });
  const participantsClicked = await clickText(page, /participants?/i);
  await sleep(1200);
  const r1participantsShot = participantsClicked ? await shot(page, "r1-participants") : null;
  const opportunityId = await page.evaluate(() => {
    const href = location.href;
    const m = href.match(/opportunityId=([^&]+)/i);
    return m ? decodeURIComponent(m[1]) : null;
  });

  results.refinements["1"] = {
    screen: openedDeal.clicked ? dealPath : "/my-deals (no Deal card CTA clicked)",
    record: openedDeal.dealId ? `dealId=[redacted-id:${String(openedDeal.dealId).slice(0, 8)}…]` : null,
    shots: { workspace: r1shotWorkspace, dealControl: r1controlShot, participants: r1participantsShot },
    observed: r1ui,
    dealControlOpened: dealControlClicked,
    participantsOpened: participantsClicked,
  };

  results.refinements["2"] = {
    screen: "/my-deals",
    shots: { board: r2Shot, fields: r2fieldsShot, scrolled: r2ScrollShot },
    observed: {
      ...r2ui,
      fieldLabels: r2fields,
      loansOnly: r2ui.loansHeading && !r2ui.investmentCopy,
    },
    text: redactText(r2obs.text).slice(0, 1200),
  };

  // ── Refinement 3: Document Workspace ────────────────────────────────────
  let docPath = "/document-workspace";
  if (opportunityId) docPath = `/document-workspace?opportunityId=${encodeURIComponent(opportunityId)}`;
  const r3obs = await visit(docPath, 4500);
  await clickText(page, /Action Centre/);
  await sleep(900);
  const r3actionShot = await shot(page, "r3-action-centre");
  await page.evaluate(() => {
    const row = document.querySelector("table tbody tr");
    if (row) row.click();
  });
  await sleep(1200);
  const r3preview = await page.evaluate(() => {
    const split = Boolean(document.querySelector(".lg\\:grid-cols-2, [class*='grid-cols-2']"));
    const preview = /preview|zoom|download/i.test(document.body.innerText);
    const title = /document workspace/i.test(document.body.innerText);
    const ssot = /enterprise document registry|single source of truth|document registry/i.test(
      document.body.innerText,
    );
    return { split, preview, title, ssot, action: /action cent/i.test(document.body.innerText) };
  });
  const r3previewShot = await shot(page, "r3-document-preview");
  let oppDocs = null;
  if (opportunityId) {
    await visit(`/opportunities?opportunityId=${encodeURIComponent(opportunityId)}`, 3500);
    await clickText(page, /^documents$/i);
    await sleep(1200);
    oppDocs = {
      shot: await shot(page, "r3-opportunity-documents"),
      textCue: await page.evaluate(() =>
        /document workspace|document center|registry|read-only|go to document/i.test(
          document.body.innerText,
        ),
      ),
    };
  }

  results.refinements["3"] = {
    screen: docPath.replace(/opportunityId=[^&]+/i, "opportunityId=[id]"),
    shots: { action: r3actionShot, preview: r3previewShot, opportunityDocs: oppDocs?.shot || null },
    observed: { ...r3preview, opportunityDocsCue: oppDocs?.textCue || false },
    text: redactText(r3obs.text).slice(0, 800),
  };

  // ── Refinement 4: Ask CHANAKYA ──────────────────────────────────────────
  await visit("/dashboard", 5000);
  await page.evaluate(() => {
    const input = document.querySelector('textarea[aria-label="Ask CHANAKYA"]');
    if (!input) return;
    const proto = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
    proto?.set?.call(input, "Which loans need attention right now?");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sleep(200);
  await page.click('button[aria-label="Send question to CHANAKYA"]').catch(() => null);
  for (let i = 0; i < 20; i += 1) {
    const ready = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll("p")).some((n) => n.textContent === "CHANAKYA") &&
        !/CHANAKYA is compiling enterprise evidence/i.test(document.body.innerText),
    );
    if (ready) break;
    await sleep(1000);
  }
  await sleep(1500);
  const r4first = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll("p"))
      .filter((n) => n.textContent === "CHANAKYA")
      .map((n) => n.parentElement?.querySelector("p:not(:first-child)")?.textContent || "")
      .filter(Boolean);
    return {
      replies: blocks,
      compiling: /compiling enterprise evidence/i.test(document.body.innerText),
    };
  });
  await page.evaluate(() => {
    const input = document.querySelector('textarea[aria-label="Ask CHANAKYA"]');
    if (!input) return;
    const proto = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
    proto?.set?.call(input, "Why is that the case?");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await sleep(200);
  await page.click('button[aria-label="Send question to CHANAKYA"]').catch(() => null);
  for (let i = 0; i < 20; i += 1) {
    const count = await page.evaluate(
      () => Array.from(document.querySelectorAll("p")).filter((n) => n.textContent === "CHANAKYA").length,
    );
    if (count >= 2) break;
    await sleep(1000);
  }
  await sleep(1500);
  const r4follow = await page.evaluate(() => {
    const replies = Array.from(document.querySelectorAll("p"))
      .filter((n) => n.textContent === "CHANAKYA")
      .map((n) => (n.parentElement?.innerText || "").replace(/^CHANAKYA\s*/i, "").trim());
    const joined = replies.join("\n");
    return {
      replyCount: replies.length,
      replies: replies.slice(-2),
      technicalFallback: /stack trace|prisma|sql exception|internal server error|econnrefused|traceback|failed to fetch/i.test(
        joined,
      ),
      privacyLeak: /@gmail\.com|\+91[0-9]{10}/i.test(joined),
      fallbackLanguage: /i am just an ai|as a language model|technical error occurred/i.test(joined),
    };
  });
  const r4shot = await shot(page, "r4-chanakya");
  results.refinements["4"] = {
    screen: "/dashboard · Ask CHANAKYA",
    shots: { conversation: r4shot },
    observed: {
      firstReplyPresent: (r4first.replies || []).length > 0,
      followUpReplies: r4follow.replyCount,
      technicalFallback: r4follow.technicalFallback,
      privacyLeak: r4follow.privacyLeak,
      fallbackLanguage: r4follow.fallbackLanguage,
      replies: (r4follow.replies || []).map((t) => redactText(t).slice(0, 500)),
    },
  };

  // ── Refinement 5: charts + heat map ─────────────────────────────────────
  await visit("/mission-control/enterprise-intelligence", 6000);
  const inspectCard = async (title) => {
    await page.evaluate((t) => {
      const heading = Array.from(document.querySelectorAll("h4, h3, h2")).find((n) =>
        new RegExp(t, "i").test(n.textContent || ""),
      );
      heading?.scrollIntoView({ block: "center" });
    }, title);
    await sleep(400);
    const details = await page.evaluate((t) => {
      const heading = Array.from(document.querySelectorAll("h4, h3, h2")).find((n) =>
        new RegExp(t, "i").test(n.textContent || ""),
      );
      const card = heading?.closest("article") || heading?.parentElement;
      if (!card) return { found: false };
      const meta = (card.querySelector("[data-enterprise-chart-meta], p") && card.innerText) || card.innerText;
      const legend = Array.from(card.querySelectorAll("[data-enterprise-chart-legend] li")).map((li) =>
        (li.textContent || "").replace(/\s+/g, " ").trim(),
      );
      const doughnut = Boolean(card.querySelector("[data-enterprise-doughnut]"));
      const bar = Boolean(card.querySelector("[data-enterprise-bar]"));
      const ticks = Array.from(card.querySelectorAll(".recharts-cartesian-axis-tick text, .recharts-pie-label-text"))
        .map((n) => (n.textContent || "").trim())
        .filter(Boolean)
        .slice(0, 16);
      const percents = Array.from(card.querySelectorAll("text, span"))
        .map((n) => (n.textContent || "").trim())
        .filter((s) => /%$/.test(s))
        .slice(0, 12);
      const whitePlot = Boolean(
        card.querySelector('[style*="background: rgb(255, 255, 255)"], [style*="background:#fff"], .bg-white'),
      );
      const period = /period|snapshot|current|last updated/i.test(card.innerText);
      return {
        found: true,
        doughnut,
        bar,
        legend,
        ticks,
        percents,
        whitePlot,
        period,
        hasEnlarge: Array.from(card.querySelectorAll("button")).some((n) => /enlarge/i.test(n.textContent || "")),
        snippet: (meta || "").replace(/\s+/g, " ").slice(0, 400),
      };
    }, title);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const normalShot = await shot(page, `r5-${slug}`);
    let enlargedShot = null;
    const enlarged = await page.evaluate((t) => {
      const heading = Array.from(document.querySelectorAll("h4")).find((n) =>
        new RegExp(t, "i").test(n.textContent || ""),
      );
      const card = heading?.closest("article");
      const btn = card && Array.from(card.querySelectorAll("button")).find((n) => /enlarge/i.test(n.textContent || ""));
      if (!btn) return false;
      btn.click();
      return true;
    }, title);
    if (enlarged) {
      await sleep(800);
      enlargedShot = await shot(page, `r5-${slug}-enlarged`);
      await page.keyboard.press("Escape");
      await sleep(400);
    }
    return { title, ...details, normalShot, enlargedShot };
  };

  const chartTitles = [
    "Business by Source",
    "Source Volume",
    "Business by Wealth Partner",
    "Participation Role Mix",
  ];
  const chartInspections = [];
  for (const title of chartTitles) {
    chartInspections.push(await inspectCard(title));
  }

  await visit("/mission-control/relationship-heat-map", 6500);
  await sleep(1500);
  await page.evaluate(() => {
    const cell = document.querySelector("svg g rect");
    if (cell) cell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await sleep(1400);
  const heatDrawer = await page.evaluate(() => {
    const opp = document.querySelector('[data-testid="heat-map-opportunity-count"]')?.textContent || null;
    const deal = document.querySelector('[data-testid="heat-map-deal-count"]')?.textContent || null;
    const legend = Array.from(document.querySelectorAll("span")).some((n) =>
      /very active|needs attention|dormant/i.test(n.textContent || ""),
    );
    const notScanned = /not scanned/i.test(document.body.innerText);
    return {
      opp,
      deal,
      legend,
      notScanned,
      separateFields: Boolean(opp !== null && deal !== null),
      drawerSnippet: (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 900),
    };
  });
  const heatShot = await shot(page, "r5-heat-map");
  results.refinements["5"] = {
    screen: "/mission-control/enterprise-intelligence + /mission-control/relationship-heat-map",
    charts: chartInspections,
    heatMap: { shot: heatShot, ...heatDrawer },
  };

  // ── Refinement 6: Contact 360 by canonical ID ───────────────────────────
  let r6path = "/contacts";
  if (named.contactId) r6path = `/contacts?contact=${encodeURIComponent(named.contactId)}`;
  const r6obs = await visit(r6path, 6500);
  await clickText(page, /contact 360|relationship intelligence|business snapshot/i);
  await sleep(2500);
  const snapshot = await page.evaluate(() => {
    const pick = (label) => {
      const btn = Array.from(document.querySelectorAll("button, p, h3, h4, dt")).find((n) =>
        new RegExp(`^\\s*${label}\\s*$`, "i").test((n.textContent || "").trim()),
      );
      if (!btn) return null;
      const card = btn.closest("button") || btn.parentElement;
      const nums = card?.querySelector(".tabular-nums, p.font-semibold, dd");
      return (nums?.textContent || card?.innerText || "").replace(label, "").trim().split("\n")[0];
    };
    return {
      totalOpps: pick("Total Opportunities"),
      currentOpps: pick("Current Opportunities"),
      totalDeals: pick("Total Deals"),
      activeDeals: pick("Active Deals"),
      companies: pick("Companies"),
      titlePresent: /business snapshot|contact 360/i.test(document.body.innerText),
    };
  });
  const registry = named.contactId
    ? await page.evaluate(async (contactId) => {
        const token = localStorage.getItem("compass:access-token");
        const headers = { Authorization: `Bearer ${token}` };
        const grab = async (url) => {
          const res = await fetch(url, { headers });
          const body = await res.json().catch(() => ({}));
          return { status: res.status, count: (body?.data?.items || body?.items || []).length };
        };
        const opp = await grab(
          `/api/enterprise-opportunities?primaryContactId=${encodeURIComponent(contactId)}&limit=100`,
        );
        const deal = await grab(
          `/api/enterprise-deals?primaryContactId=${encodeURIComponent(contactId)}&pageSize=100&view=full`,
        );
        return {
          primaryContactOpportunities: opp,
          primaryContactDeals: deal,
        };
      }, named.contactId)
    : null;
  const r6shot = await shot(page, "r6-contact-360");
  results.refinements["6"] = {
    screen: named.contactId ? "/contacts?contact=[canonical-id]" : "/contacts",
    contactId: named.contactId,
    contactName: named.name,
    contactStatus: named.status,
    foundNamedContact: Boolean(named.contactId),
    snapshot,
    registryPrimaryContactOnly: registry,
    shot: r6shot,
    text: redactText(r6obs.text).slice(0, 900),
  };

  await browser.close();
  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  console.log(`WROTE ${path.relative(root, path.join(OUT, "results.json"))}`);
  console.log(`HOST ${results.host?.origin || "none"} local=${Boolean(results.host?.local)}`);
  console.log(`NAMED_CONTACT ${named.contactId ? "found" : "not_found"}`);
}

main().catch((err) => {
  console.error("BAT_SCRIPT_ERROR", err instanceof Error ? err.message : "unknown");
  process.exit(1);
});
