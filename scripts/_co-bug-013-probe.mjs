import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const email =
  process.env.VERIFY_ADMIN_EMAIL ||
  process.env.SMOKE_EMAIL ||
  "admin@rupeecatalyst.com";
const password =
  process.env.VERIFY_ADMIN_PASSWORD ||
  process.env.SMOKE_PASSWORD ||
  process.env.DEMO_AUTH_PASSWORD;

if (!password) {
  console.log("NO_PASSWORD_IN_ENV");
  process.exit(0);
}

const base = "https://catalyst-one-two.vercel.app";
const loginRes = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, password, rememberMe: true }),
});
const loginBody = await loginRes.json();
console.log(
  "LOGIN",
  loginRes.status,
  loginBody.success,
  loginBody.error?.code || "",
  "mustChange",
  loginBody.data?.user?.mustChangePassword,
);
if (!loginBody.success) process.exit(1);

const token = loginBody.data.accessToken;
for (const path of ["/contacts", "/dashboard", "/change-password", "/mission-control"]) {
  const r = await fetch(`${base}${path}`, {
    headers: { cookie: `compass-access-token=${token}` },
    redirect: "manual",
  });
  const text = await r.text();
  const hit =
    text.includes("Unable to load this view") ||
    text.includes("Something went wrong");
  const dig = text.match(/digest["\s:]+([a-zA-Z0-9]+)/);
  console.log(path, "status", r.status, "errUI", hit, "digest", dig?.[1] || "");
}

// Probe /api/auth/me and a hydrate endpoint
const me = await fetch(`${base}/api/auth/me`, {
  headers: { Authorization: `Bearer ${token}` },
});
const meBody = await me.json();
console.log("ME", me.status, meBody.success, meBody.error?.code || meBody.error?.message || "");
