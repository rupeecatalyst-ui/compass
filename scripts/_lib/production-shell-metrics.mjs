/**
 * CO-PRODUCTION-REGRESSION-PREVENTION-014 — shared DOM metrics for shell smoke.
 * Read-only browser evaluation helpers (no secrets).
 */

/** @typedef {import('puppeteer').Page} Page */

export function chromePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      if (p && typeof p === "string") return p;
    } catch {
      /* ignore */
    }
  }
  return process.env.PUPPETEER_EXECUTABLE_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
}

/**
 * Collect shell / notification / ticker metrics from the live DOM.
 * Runs inside page.evaluate — keep self-contained.
 */
export function shellMetricsEvaluateScript() {
  const sidebar =
    document.querySelector("aside") ||
    document.querySelector('[data-slot="sidebar"]');
  const main = document.querySelector("main");
  const header = document.querySelector("header");
  const sideR = sidebar?.getBoundingClientRect();
  const mainR = main?.getBoundingClientRect();
  const headerR = header?.getBoundingClientRect();

  const ticker =
    document.querySelector('[aria-label="CHANAKYA live operational intelligence"]') ||
    document.querySelector('[data-sprint="CO-PRODUCTION-UX-STABILIZATION-013"][role="status"]') ||
    document.querySelector('header [role="status"]');
  const tickerR = ticker?.getBoundingClientRect();
  const tickerCs = ticker ? getComputedStyle(ticker) : null;

  const toastHost =
    document.querySelector('[data-ene-visible-toasts="1"]') ||
    document.querySelector('[aria-label="CHANAKYA notifications"]');
  const toastArticles = toastHost ? toastHost.querySelectorAll("article").length : 0;
  const toastR = toastHost?.getBoundingClientRect();

  const actions = document.querySelector("header .ml-auto");
  const actionsR = actions?.getBoundingClientRect();

  const h1 = document.querySelector("main h1, main h2");
  const h1R = h1?.getBoundingClientRect();

  const navLink = document.querySelector('aside a[href="/dashboard"], aside a[href*="dashboard"]');

  return {
    pathname: location.pathname,
    url: location.href,
    title: document.title,
    signedIn: !/sign in/i.test(document.title) && !!sidebar,
    sidebar: sideR
      ? {
          visible: sideR.width > 40 && getComputedStyle(sidebar).display !== "none",
          x: Math.round(sideR.x),
          y: Math.round(sideR.y),
          w: Math.round(sideR.width),
          h: Math.round(sideR.height),
          right: Math.round(sideR.right),
          position: getComputedStyle(sidebar).position,
        }
      : null,
    main: mainR
      ? {
          x: Math.round(mainR.x),
          y: Math.round(mainR.y),
          w: Math.round(mainR.width),
          h: Math.round(mainR.height),
        }
      : null,
    header: headerR
      ? { x: Math.round(headerR.x), w: Math.round(headerR.width), h: Math.round(headerR.height) }
      : null,
    h1X: h1R ? Math.round(h1R.x) : null,
    clippedLeft: !!(sideR && h1R && h1R.x < sideR.right - 4),
    mainAfterSidebar: !!(sideR && mainR && mainR.x >= sideR.right - 2),
    horizontalOverflow: document.body.scrollWidth > document.documentElement.clientWidth + 2,
    bodyScrollWidth: document.body.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    ticker: ticker
      ? {
          x: Math.round(tickerR.x),
          w: Math.round(tickerR.width),
          right: Math.round(tickerR.right),
          h: Math.round(tickerR.height),
          overflowX: tickerCs?.overflowX,
          scrollWidth: ticker.scrollWidth,
          clientWidth: ticker.clientWidth,
          contained: ticker.scrollWidth <= ticker.clientWidth + 2 || tickerCs?.overflowX === "hidden",
        }
      : null,
    tickerOverlapsActions: !!(tickerR && actionsR && tickerR.right > actionsR.left + 4),
    toastVisibleCount: toastArticles,
    toastHostPresent: !!toastHost,
    toast: toastR
      ? {
          x: Math.round(toastR.x),
          y: Math.round(toastR.y),
          w: Math.round(toastR.width),
          h: Math.round(toastR.height),
        }
      : null,
    hasNavLink: !!navLink,
    viewport: { w: window.innerWidth, h: window.innerHeight },
  };
}

/**
 * @param {ReturnType<typeof shellMetricsEvaluateScript>} metrics
 * @param {{ allowLoginShell?: boolean }} [opts]
 */
export function evaluateShellPass(metrics, opts = {}) {
  const failures = [];
  if (!opts.allowLoginShell) {
    if (!metrics.signedIn) failures.push("not_signed_in");
    if (!metrics.sidebar?.visible) failures.push("sidebar_not_visible");
    if (!metrics.mainAfterSidebar) failures.push("main_not_after_sidebar");
    if (metrics.clippedLeft) failures.push("content_clipped_left");
  }
  if (metrics.horizontalOverflow) failures.push("horizontal_overflow");
  if (metrics.tickerOverlapsActions) failures.push("ticker_overlaps_actions");
  if (metrics.toastVisibleCount > 1) failures.push("multi_toast_visible");
  return { pass: failures.length === 0, failures };
}

/** @param {Page} page */
export async function collectShellMetrics(page) {
  return page.evaluate(shellMetricsEvaluateScript);
}

/** @param {Page} page */
export function attachRuntimeListeners(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (!/favicon\.ico/i.test(t)) consoleErrors.push(t.slice(0, 400));
    }
  });
  page.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 400)));
  page.on("response", (res) => {
    const u = res.url();
    if (res.status() >= 400 && (u.includes("_next") || u.includes("/api/"))) {
      failedRequests.push({ status: res.status(), url: u.slice(0, 180) });
    }
  });
  return {
    snapshot() {
      return {
        consoleErrors: [...consoleErrors],
        pageErrors: [...pageErrors],
        failedRequests: [...failedRequests],
      };
    },
    clear() {
      consoleErrors.length = 0;
      pageErrors.length = 0;
      failedRequests.length = 0;
    },
  };
}
