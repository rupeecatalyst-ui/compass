/**
 * CO-CERT-004 — Production route smoke (HTTP codes only).
 */
const base = process.env.VERIFY_BASE_URL || "https://catalyst-one-two.vercel.app";
const routes = [
  "/login",
  "/contacts",
  "/opportunities",
  "/my-deals",
  "/mission-control",
  "/horizon",
  "/lenders",
  "/accounting",
  "/dashboard",
  "/chanakya-radar",
  "/documents",
  "/settings",
  "/workflow",
  "/api/auth/me",
];

const results = [];
for (const route of routes) {
  const started = Date.now();
  try {
    const res = await fetch(`${base}${route}`, {
      headers: { Cookie: "compass-access-token=probe" },
      redirect: "manual",
    });
    results.push({
      route,
      status: res.status,
      ms: Date.now() - started,
      location: res.headers.get("location") || undefined,
    });
  } catch (e) {
    results.push({ route, status: -1, ms: Date.now() - started, error: String(e) });
  }
}

console.log(JSON.stringify({ base, results }, null, 2));
