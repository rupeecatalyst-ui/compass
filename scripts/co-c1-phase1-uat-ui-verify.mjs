import assert from "node:assert/strict";
import { build } from "esbuild";
import puppeteer from "puppeteer";

// Bundle the real UI and canonical catalog. Only the HTTP boundary is a fixture.
// No development auth, preview route, backend server, or production access.
console.log("UI: bundling real workspace");
const result = await build({
  stdin: { contents: `import React from "react"; import {createRoot} from "react-dom/client"; import {HomeLoanRecommendationMastersWorkspace} from "./src/components/catalyst-one/admin/home-loan-recommendation-masters-workspace"; createRoot(document.getElementById("root")).render(<HomeLoanRecommendationMastersWorkspace/>);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"test"' },
  plugins: [{ name: "fixture-http", setup(builder) {
    builder.onResolve({ filter: /^@\/lib\/api-client$/ }, () => ({ path: "fixture-http", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `export async function authenticatedJsonFetch(url, init) {
      window.fixtureCalls.push({url, body: init?.body ? JSON.parse(init.body) : null});
      if(window.fixtureError) return Response.json({success:false,error:{message:"Fixture unauthorized"}},{status:401});
      if(init?.method === "POST") return Response.json({success:true,data:{id:"journey-draft"}});
      return Response.json({success:true,data:window.fixtureMasters});
    }`, loader: "js" }));
  } }],
});
console.log("UI: launching isolated headless browser");
const browser = await puppeteer.launch({
  headless: true,
  pipe: true,
  timeout: 120_000,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});
try {
  console.log("UI: browser ready");
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", (request) => request.abort());
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent('<main id="root"></main>');
  await page.evaluate(() => {
    window.fixtureCalls = [];
    const fields = ["assessment:borrower.employmentFamily", "assessment:borrower.ageYears", "assessment:borrower.journeyCity", "assessment:property.propertyValue", "assessment:incomeAndObligations.monthlyIncome", "assessment:selfEmployedEvidence.vintage"].map((fieldId, index) => ({ fieldId, applicability: index === 4 ? "salaried" : index === 5 ? "self_employed" : "all", capture: true, mandatoryForRecommendation: index === 0, displayOrder: index * 10, idcKeys: index === 1 ? ["ageYears"] : undefined, captureStepId: index === 1 ? "ageYears" : undefined }));
    window.fixtureMasters = {
      products: [{ code: "HOME_LOAN", label: "Home Loan" }, { code: "HOME_LOAN_BT", label: "Home Loan Balance Transfer" }, { code: "PERSONAL_LOAN", label: "Personal Loan" }, { code: "LAP", label: "LAP" }],
      definitions: [{ id: "journey-draft", productCode: "HOME_LOAN", lifecycleStatus: "draft", fieldsJson: fields }],
      weights: [{ id: "weights-draft", productCode: "HOME_LOAN", lifecycleStatus: "draft", weightsJson: {} }],
      bootstrap: { HOME_LOAN: fields },
    };
  });
  await page.addScriptTag({ content: result.outputFiles[0].text });
  const click = async (label) => {
    const found = await page.evaluate((label) => {
      const button = [...document.querySelectorAll("button")].find((button) => button.textContent.trim() === label);
      if (!button || button.disabled) return false;
      button.click(); return true;
    }, label);
    assert.ok(found, `Enabled button: ${label}`);
  };
  const count = async (prefix, expected) => page.waitForFunction((prefix, expected) => document.querySelectorAll(`[role="group"][aria-label^="${prefix}"]`).length === expected, {}, prefix, expected);
  await count("Configured field", 6);
  assert.equal(await page.$eval("h1", (node) => node.textContent), "Product Journey & Recommendation Master");
  await page.select('select[aria-label="Customer category"]', "salaried");
  await count("Configured field", 5);
  await page.select('select[aria-label="Customer category"]', "self_employed");
  await count("Configured field", 5);
  await page.select('select[aria-label="Customer category"]', "all");
  await count("Configured field", 6);
  const first = '[role="group"][aria-label="Configured field assessment:borrower.employmentFamily"]';
  await page.click(`${first} [role="checkbox"]`);
  await page.waitForFunction((selector) => {
    const checks = document.querySelector(selector).querySelectorAll('[role="checkbox"]');
    return checks[0].getAttribute("aria-checked") === "false" && checks[1].getAttribute("aria-checked") === "true";
  }, {}, first);
  await click("+ Add Field");
  await page.waitForSelector('select[aria-label="Canonical field"]');
  const options = await page.$$eval('select[aria-label="Canonical field"] option', (nodes) => nodes.map((node) => node.value));
  assert.ok(options.length > 20, "Picker discovers full catalog but configured rows remain six");
  assert.ok(options.includes("assessment:borrower.dateOfBirth"));
  await page.select('select[aria-label="Canonical field"]', "assessment:borrower.residency");
  await click("Add selected field");
  await count("Configured field", 7);
  await click("Save Journey Draft");
  await page.waitForFunction(() => window.fixtureCalls.some((call) => call.body?.intent === "save_journey_draft"));
  const saved = await page.evaluate(() => window.fixtureCalls.find((call) => call.body?.intent === "save_journey_draft").body.fieldsJson);
  assert.equal(saved.length, 7);
  assert.equal(saved[0].capture, false);
  assert.equal(saved[0].mandatoryForRecommendation, true);
  assert.deepEqual(saved.find((row) => row.fieldId.endsWith("ageYears")).idcKeys, ["ageYears"]);
  assert.equal(saved.find((row) => row.fieldId.endsWith("residency")).mandatoryForRecommendation, false);
  assert.ok(!saved.some((row) => row.fieldId.endsWith("dateOfBirth")));
  await count("Configured field", 6);
  await click("Remove");
  await count("Configured field", 5);
  for (const product of ["Personal Loan", "LAP", "Home Loan Balance Transfer"]) {
    await click(product);
    await count("Configured field", 0);
  }
  await click("Home Loan");
  await count("Configured field", 6);
  await click("Match %");
  await count("Match criterion", 0);
  await click("+ Add Criteria");
  await page.waitForSelector('select[aria-label="Match criterion"]');
  await page.select('select[aria-label="Match criterion"]', "derived:foirPercent");
  await click("Add selected criterion");
  await count("Match criterion", 1);
  const input = await page.$('input[type="number"]');
  await input.click({ clickCount: 3 });
  await input.type("60");
  await page.waitForFunction(() => document.body.textContent.includes("TOTAL WEIGHTAGE: 60%"));
  await click("+ Add Criteria");
  await page.waitForSelector('select[aria-label="Match criterion"]');
  await page.select('select[aria-label="Match criterion"]', "derived:ltvPercent");
  await click("Add selected criterion");
  await count("Match criterion", 2);
  const inputs = await page.$$('input[type="number"]');
  await inputs[1].click({ clickCount: 3 });
  await inputs[1].type("40");
  await page.waitForFunction(() => document.body.textContent.includes("TOTAL WEIGHTAGE: 100%"));
  await click("Save Draft");
  await page.waitForFunction(() => window.fixtureCalls.some((call) => call.body?.intent === "save_weight_draft"));
  const weights = await page.evaluate(() => window.fixtureCalls.find((call) => call.body?.intent === "save_weight_draft").body.weightsJson);
  assert.deepEqual(weights, { "derived:foirPercent": 60, "derived:ltvPercent": 40 });
  assert.deepEqual(errors, []);
  const deniedPage = await browser.newPage();
  await deniedPage.setRequestInterception(true);
  deniedPage.on("request", (request) => request.abort());
  await deniedPage.setContent('<main id="root"></main>');
  await deniedPage.evaluate(() => { window.fixtureCalls = []; window.fixtureError = true; });
  await deniedPage.addScriptTag({ content: result.outputFiles[0].text });
  await deniedPage.waitForSelector('[role="alert"]');
  assert.equal(await deniedPage.$eval('[role="alert"]', (node) => node.textContent), "Fixture unauthorized");
  assert.equal((await deniedPage.$$('[role="group"]')).length, 0);
  await deniedPage.close();
  console.log("UI PASS: load, four product tabs, category views, six configured rows, independent controls, dynamic add-field, preserved metadata, selected-only criteria, manual weights, running total, save payloads");
  console.log("NETWORK / DATABASE / PRODUCTION ACCESS: NONE (fixture HTTP only)");
} finally { await browser.close(); }
