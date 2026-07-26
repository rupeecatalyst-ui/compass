const fs = require("fs");
const s = fs.readFileSync(".tmp-vercel-prod-env", "utf8");
const out = {};
for (const line of s.split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  const k = line.slice(0, i);
  let v = line.slice(i + 1);
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  out[k] = v;
}

function ref(url) {
  if (!url) return null;
  const a = url.match(/postgres\.([a-z0-9]+):/i);
  if (a) return a[1];
  try {
    const h = new URL(url).hostname;
    const m =
      h.match(/^db\.([a-z0-9]+)\.supabase\.co$/i) ||
      h.match(/^([a-z0-9]+)\.pooler\.supabase\.com$/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function hostHint(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const parts = u.hostname.split(".");
    if (parts[0] === "db" && parts[1]) return `db.${parts[1]}.supabase.co`;
    if (u.hostname.includes("pooler.supabase.com")) return u.hostname.replace(/^[^.]+/, "***");
    return u.hostname.replace(/^[^.]+/, "***");
  } catch {
    return "unparseable";
  }
}

console.log(
  JSON.stringify(
    {
      nonSecretKeys: Object.keys(out).filter(
        (k) => !/TOKEN|SECRET|PASSWORD|OIDC|DATABASE_URL|DIRECT_URL/i.test(k),
      ),
      ENTERPRISE_PERSISTENCE_MODE: out.ENTERPRISE_PERSISTENCE_MODE || null,
      NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE:
        out.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE || null,
      DEAL_REGISTRY_keys_present: Object.keys(out).filter((k) =>
        k.includes("DEAL_REGISTRY"),
      ),
      DATABASE_URL_present: Boolean(out.DATABASE_URL),
      DATABASE_URL_length: (out.DATABASE_URL || "").length,
      DIRECT_URL_present: Boolean(out.DIRECT_URL),
      projectRefFromDatabaseUrl: ref(out.DATABASE_URL),
      projectRefFromDirectUrl: ref(out.DIRECT_URL),
      databaseHostHint: hostHint(out.DATABASE_URL),
      VERCEL_GIT_COMMIT_SHA: out.VERCEL_GIT_COMMIT_SHA || null,
      VERCEL_GIT_COMMIT_REF: out.VERCEL_GIT_COMMIT_REF || null,
    },
    null,
    2,
  ),
);
