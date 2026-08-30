#!/usr/bin/env node
/**
 * Canonical public contact information for COMPASS.
 * Source of truth: compass/src/config/site.ts + buildPublicWhatsAppHref.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const compassRoot = join(root, "compass");

const PHONE_DISPLAY = "+91 98219 84181";
const TEL_HREF = "tel:+919821984181";
const EMAIL = "champion@rupeecatalyst.com";
const MAILTO = `mailto:${EMAIL}`;
const ADDRESS =
  "B724, Jaswanti Allied Business Centre, Malad West, Mumbai – 400064";
const WA_HREF = "https://wa.me/919821984181";

const sitePath = join(compassRoot, "src/config/site.ts");
const helperPath = join(compassRoot, "src/lib/public-whatsapp.ts");
const jsonLdPath = join(compassRoot, "src/lib/public-organization-json-ld.ts");
const footerPath = join(compassRoot, "src/components/layout/site-footer.tsx");
const contactPath = join(compassRoot, "src/components/pages/contact-page-content.tsx");
const legalPath = join(compassRoot, "src/config/legal.ts");
const navPath = join(compassRoot, "src/config/navigation.ts");
const layoutPath = join(compassRoot, "src/app/layout.tsx");
const offlinePath = join(compassRoot, "public/offline.html");
const notFoundPath = join(compassRoot, "src/app/not-found.tsx");
const confirmationPath = join(
  compassRoot,
  "src/components/home-loan-experience/discovery/discovery-confirmation-step.tsx",
);

for (const p of [
  sitePath,
  helperPath,
  jsonLdPath,
  footerPath,
  contactPath,
  legalPath,
  navPath,
  layoutPath,
  offlinePath,
  notFoundPath,
  confirmationPath,
]) {
  assert.ok(existsSync(p), `Missing ${relative(root, p)}`);
}

const site = readFileSync(sitePath, "utf8");
const helper = readFileSync(helperPath, "utf8");
const jsonLd = readFileSync(jsonLdPath, "utf8");
const footer = readFileSync(footerPath, "utf8");
const contact = readFileSync(contactPath, "utf8");
const legal = readFileSync(legalPath, "utf8");
const nav = readFileSync(navPath, "utf8");
const layout = readFileSync(layoutPath, "utf8");
const offline = readFileSync(offlinePath, "utf8");
const notFound = readFileSync(notFoundPath, "utf8");
const confirmation = readFileSync(confirmationPath, "utf8");

assert.match(site, /contactPhone:\s*"\+91 98219 84181"/);
assert.match(site, /contactEmail:\s*"champion@rupeecatalyst.com"/);
assert.match(site, /telHref:\s*"tel:\+919821984181"/);
assert.match(site, /mailtoHref:\s*"mailto:champion@rupeecatalyst.com"/);
assert.match(site, /whatsappCountryCode:\s*"91"/);
assert.match(site, /whatsappNationalNumber:\s*"9821984181"/);
assert.match(site, /officeAddress:/);
assert.match(site, /B724, Jaswanti Allied Business Centre, Malad West, Mumbai – 400064/);
assert.match(site, /streetAddress:\s*"B724, Jaswanti Allied Business Centre"/);
assert.match(site, /addressLocality:\s*"Malad West"/);
assert.match(site, /addressRegion:\s*"Mumbai"/);
assert.match(site, /postalCode:\s*"400064"/);
assert.match(site, /addressCountry:\s*"IN"/);
assert.match(site, /whatsappLabel:\s*"Chat with Rupee Catalyst"/);
assert.match(site, /company:\s*"Rupee Catalyst"/);
assert.match(site, /name:\s*"COMPASS"/);
assert.match(site, /buildPublicWhatsAppHref/);

assert.match(helper, /https:\/\/wa\.me\//);
assert.match(helper, /noopener noreferrer/);
assert.doesNotMatch(helper, /wa\.me\/\$\{[^}]+\}\?/);
assert.match(helper, /cc !== "91"/);

const { buildPublicWhatsAppHref } = await import(pathToFileURL(helperPath).href);
assert.equal(buildPublicWhatsAppHref("91", "9821984181"), WA_HREF);

assert.match(jsonLd, /@type": "Organization"/);
assert.match(jsonLd, /siteConfig\.company/);
assert.match(jsonLd, /siteConfig\.contactPhone/);
assert.match(jsonLd, /siteConfig\.contactEmail/);
assert.match(jsonLd, /structuredAddress/);
assert.doesNotMatch(jsonLd, /latitude|longitude|"geo"|sameAs|openingHours|CIN|GSTIN/);
assert.doesNotMatch(jsonLd, /localhost/);

assert.match(layout, /OrganizationJsonLd/);
assert.doesNotMatch(layout, /localhost:3001/);

for (const [name, src] of [
  ["footer", footer],
  ["contact", contact],
  ["legal", legal],
  ["confirmation", confirmation],
  ["not-found", notFound],
]) {
  assert.match(src, /siteConfig/, `${name} must consume siteConfig`);
}

assert.match(footer, /siteConfig\.telHref/);
assert.match(footer, /siteConfig\.mailtoHref/);
assert.match(footer, /publicWhatsAppHref/);
assert.match(footer, /siteConfig\.officeAddress/);
assert.match(footer, /siteConfig\.contactPhone/);
assert.match(footer, /siteConfig\.contactEmail/);
assert.match(footer, /Call ·/);
assert.match(footer, /WhatsApp/);
assert.match(footer, /Email ·/);
assert.match(footer, /footerNavigation\.company/);
assert.match(nav, /label: "Contact"/);
assert.match(nav, /label: "Privacy Policy"/);
assert.match(nav, /label: "Terms and Conditions"/);
assert.match(nav, /label: "Disclaimer"/);

assert.match(contact, /Call us/);
assert.match(contact, /WhatsApp/);
assert.match(contact, /Email us/);
assert.match(contact, /Visit us/);
assert.match(contact, /siteConfig\.whatsappLabel/);
assert.match(contact, /siteConfig\.telHref/);
assert.match(contact, /siteConfig\.mailtoHref/);
assert.match(contact, /publicWhatsAppHref/);
assert.match(contact, /siteConfig\.officeAddress/);
assert.doesNotMatch(contact, /working hours|Monday|landline|grievance officer|maps\.google|linkedin|instagram|facebook/i);

assert.match(legal, /siteConfig\.contactEmail/);
assert.match(legal, /siteConfig\.contactPhone/);
assert.match(legal, /siteConfig\.officeAddress/);
assert.equal((legal.match(/siteConfig\.officeAddress/g) || []).length, 3);

assert.ok(offline.includes(PHONE_DISPLAY), "offline phone");
assert.ok(offline.includes(TEL_HREF), "offline tel");
assert.ok(offline.includes(EMAIL), "offline email");
assert.ok(offline.includes(MAILTO), "offline mailto");
assert.ok(offline.includes(ADDRESS), "offline address");

assert.match(confirmation, /siteConfig\.telHref/);
assert.match(confirmation, /siteConfig\.mailtoHref/);

const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".html", ".json", ".md"]);
const SKIP_DIR = new Set(["node_modules", ".next", "screenshots"]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p, acc);
      continue;
    }
    if (TEXT_EXT.has(extname(name))) acc.push(p);
  }
  return acc;
}

const files = walk(join(compassRoot, "src")).concat(
  walk(join(compassRoot, "public")),
  [join(compassRoot, "scripts/build-pwa.mjs")],
);

const forbidden = [
  /98765\s*43210/,
  /hello@rupeecatalyst\.com/i,
  /Mumbai,\s*India/,
  /info@rupeecatalyst\.com/i,
  /support@rupeecatalyst\.com/i,
  /contact@rupeecatalyst\.com/i,
];

const hits = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const re of forbidden) {
    if (re.test(text)) {
      hits.push(`${relative(root, file)}  ${re}`);
    }
  }
}
assert.equal(hits.length, 0, `Forbidden dummy/alternate contact still present:\n${hits.join("\n")}`);

const allowedEmailLiteral = new Set([
  relative(root, sitePath).replaceAll("\\", "/"),
  relative(root, offlinePath).replaceAll("\\", "/"),
  "compass/scripts/build-pwa.mjs",
]);
const extraEmail = files
  .filter((file) => readFileSync(file, "utf8").includes(EMAIL))
  .map((f) => relative(root, f).replaceAll("\\", "/"))
  .filter((rel) => !allowedEmailLiteral.has(rel));
assert.deepEqual(extraEmail, [], `Email must not be hardcoded outside SSOT + offline: ${extraEmail.join(", ")}`);

console.log("CO-COMPASS-CONTACT-INFORMATION verify: PASS");
console.log(
  JSON.stringify(
    {
      phone: PHONE_DISPLAY,
      telHref: TEL_HREF,
      email: EMAIL,
      mailto: MAILTO,
      whatsapp: WA_HREF,
      address: ADDRESS,
      scannedFiles: files.length,
    },
    null,
    2,
  ),
);
