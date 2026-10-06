import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";

// Actual React/Radix components and production CSS, with offline API fixtures.
// No production session, database connection, SMTP, upload or record mutation.
const root = fileURLToPath(new URL("..", import.meta.url));
const out = path.join(root, ".tmp", "email-live-ux");
fs.mkdirSync(out, { recursive: true });
const fixtureApi = `
const fixtureEmails = { user_ketan: "ketan@example.test", contact_lender: "lender@example.test", contact_other: "other@example.test", user_analyst: "analyst@example.test" };
export async function previewTransactionOperationalEmail(input) {
  const missing = new URLSearchParams(location.search).has("missing");
  const sender = { id: "user_rahul", name: "Rahul Kapoor", email: "rahul@example.test" };
  const primary = { role: "customer", entityKind: "contact", entityId: "contact_customer", name: "Devraj Contact", email: "customer@example.test" };
  const to = [...(input.includePrimaryTo !== false && !missing ? [primary.email] : []), ...(input.toRecipients || []).map(ref => fixtureEmails[ref.id])];
  const cc = [sender.email, ...(input.ccRecipients || []).map(ref => fixtureEmails[ref.id])];
  return { operationalDeliveryEnabled: true, initiatingSender: sender,
    sender: { senderEmail: "customers@example.test", displayName: "Catalyst One", profileCode: "CUSTOMERS" },
    recipientResolution: to.length ? { ok: true, to, cc, partyRefs: input.includePrimaryTo !== false && !missing ? [primary] : [] } : { ok: false, code: "missing_customer_email", message: "Customer TO email could not be resolved from SSOT", to: [], cc: [], partyRefs: [] } };
}
export async function searchTransactionEmailRecipients(input) { return [
  { kind: "user", id: "user_ketan", name: "Ketan Kapoor", email: "ketan@example.test" },
  { kind: "lender_contact", id: "contact_lender", name: "Lender Contact", email: "lender@example.test" },
  { kind: "contact", id: "contact_other", name: "Other Contact", email: "other@example.test" },
  { kind: "user", id: "user_analyst", name: "Analyst Employee", email: "analyst@example.test" }
].filter(option => (option.name+" "+option.email).toLowerCase().includes(input.search.toLowerCase())); }
`;
const entry = `
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DocumentWorkspaceMailbox } from "@/components/catalyst-one/document-workspace/document-workspace-mailbox";
import { DocumentWorkspaceActionDrawer } from "@/components/catalyst-one/document-workspace/document-workspace-action-drawer";
import { DOCUMENT_WORKSPACE_DESK_LIST_ACTION_CLASSNAME, DOCUMENT_WORKSPACE_DESK_SHEET_CLASSNAME } from "@/constants/document-workspace-refinement-014";
import { useDocumentWorkspaceBoundary } from "@/components/catalyst-one/document-workspace/use-document-workspace-boundary";
window.fixtureState = { sends: 0, uploads: 0, interactions: 0 };
function Fixture() {
 const {anchorRef,boundaryStyle}=useDocumentWorkspaceBoundary();
 const [desk,setDesk]=useState(true),[email,setEmail]=useState(false),[action,setAction]=useState(true),[transaction,setTransaction]=useState("A");
 return <div className="flex h-dvh"><nav className="hidden w-60 shrink-0 border-r md:block">Catalyst One navigation</nav><main className="min-w-0 flex-1"><div ref={anchorRef}><Button onClick={()=>setDesk(true)}>Open Document Workspace</Button></div>
 <Sheet open={desk} onOpenChange={setDesk}><SheetContent style={boundaryStyle} data-fixture-desk="" className={DOCUMENT_WORKSPACE_DESK_SHEET_CLASSNAME} allowOutsideClose={false}>
 <SheetHeader className="shrink-0 border-b px-4 py-3"><SheetTitle>Document Workspace — Transaction {transaction}</SheetTitle><SheetDescription>Safe local fixture of the production modal stack</SheetDescription></SheetHeader>
 <div className="flex shrink-0 gap-2 border-b p-3"><Button onClick={()=>setAction(!action)}>Action Centre</Button><Button onClick={()=>window.fixtureState.interactions++}>Workspace interaction</Button><Button onClick={()=>setTransaction(transaction==="A"?"B":"A")}>Change fixture transaction</Button></div>
 <div className={action ? DOCUMENT_WORKSPACE_DESK_LIST_ACTION_CLASSNAME : "flex min-h-0 flex-1"}>
 <div data-fixture-table="" className="min-w-0 flex-1 overflow-auto p-4"><table className="w-full min-w-[64rem] text-left text-sm"><thead><tr>{["Document","Status","Owner","Version","Remarks"].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{Array.from({length:18},(_,i)=><tr key={i}><td className="py-3">Registered document {i+1}.pdf</td><td>Pending</td><td>Primary Applicant</td><td>v1</td><td>Current transaction</td></tr>)}</tbody></table></div>
 <DocumentWorkspaceActionDrawer open={action} onOpenChange={setAction} selectedCount={0} onAction={id=>{if(id==="custom_email"||id==="template_email")setEmail(true);}} deals={[]} selectedDealId="" onDealIdChange={()=>{}} coverSubject="" coverBody="" onCoverSubjectChange={()=>{}} onCoverBodyChange={()=>{}} lenderRecipientId="" onLenderRecipientIdChange={()=>{}} groupedDraft="" onGroupedDraftChange={()=>{}} dueDate="" onDueDateChange={()=>{}} secureLink="" />
 </div></SheetContent></Sheet>
 <DocumentWorkspaceMailbox key={transaction+"|"+email} open={email} contextFingerprint={transaction} opportunityId={"opportunity_"+transaction} initialKind="custom" mode="send" fromEmail="" senderCc="untrusted-browser@example.test" initialTo="" attachments={[{id:"doc_1",filename:"Application.pdf",versionLabel:"v1"},{id:"doc_2",filename:"Income.xlsx",versionLabel:"v1"}]} requestedList={[]} onClose={()=>setEmail(false)} onQueue={async()=>{window.fixtureState.sends++;throw Error("Fixture forbids delivery");}} onSaveDraft={()=>{}} onAttachDocument={async file=>{window.fixtureState.uploads++;return {id:"fixture_doc",filename:file.name,versionLabel:"v1"};}} />
 </main></div>;
}
createRoot(document.getElementById("root")).render(<Fixture/>);
`;
await build({
  stdin: { contents: entry, resolveDir: root, sourcefile: "fixture.tsx", loader: "tsx" },
  bundle: true, outfile: path.join(out, "app.js"), platform: "browser", format: "iife",
  jsx: "automatic", tsconfig: path.join(root, "tsconfig.json"),
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [{ name: "offline-boundaries", setup(api) {
    api.onResolve({ filter: /operational-transaction-email-api$/ }, () => ({ path: "email-api", namespace: "fixture" }));
    api.onResolve({ filter: /assigned-users$/ }, () => ({ path: "users", namespace: "fixture" }));
    api.onResolve({ filter: /create-task-action-button$/ }, () => ({ path: "task", namespace: "fixture" }));
    api.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ loader: "js", contents:
      args.path === "email-api" ? fixtureApi : args.path === "users" ? "export async function searchAssignableUsers(){return [];}" : "export function CreateTaskActionButton(){return null;}" }));
  } }],
});
const css = await postcss([tailwind({ base: root })]).process(fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8"), { from: path.join(root, "src/app/globals.css") });
fs.writeFileSync(path.join(out, "app.css"), css.css);
fs.writeFileSync(path.join(out, "index.html"), '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
const server = http.createServer((req, res) => {
  const filename = req.url.split("?")[0] === "/app.js" ? "app.js" : req.url.split("?")[0] === "/app.css" ? "app.css" : "index.html";
  res.setHeader("Content-Type", filename.endsWith(".js") ? "application/javascript" : filename.endsWith(".css") ? "text/css" : "text/html");
  res.end(fs.readFileSync(path.join(out, filename)));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
let browser;
try {
  const candidates = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].filter(Boolean);
  browser = await puppeteer.launch({ headless: true, executablePath: candidates.find(filename => fs.existsSync(filename)), args: ["--no-sandbox"], defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage(), runtimeErrors = [];
  page.on("pageerror", error => runtimeErrors.push(error.message));
  await page.setRequestInterception(true);
  page.on("request", request => request.url().startsWith(`http://127.0.0.1:${port}/`) ? request.continue() : request.abort());
  async function clickText(text) {
    const index = await page.evaluate(text => {
      const mailbox = document.querySelector("[data-document-workspace-mailbox]");
      return [...document.querySelectorAll("button")].findIndex(button => button.textContent.trim() === text && button.getBoundingClientRect().width > 0 && (!mailbox || mailbox.contains(button)));
    }, text);
    assert.ok(index >= 0, text);
    await (await page.$$("button"))[index].click();
  }
  async function openEmail() { await clickText("Custom Email"); await page.waitForSelector("[data-document-workspace-mailbox]"); await page.waitForFunction(()=>document.querySelector("[data-mandatory-sender-cc]")?.textContent.includes("rahul@example.test")); }
  async function assertUsable() {
    await page.waitForFunction(()=>!document.querySelector("[data-document-workspace-mailbox]"));
    await clickText("Workspace interaction");
    assert.ok(await page.evaluate(()=>window.fixtureState.interactions>0));
    assert.ok(await page.evaluate(()=>document.body.style.pointerEvents !== "none" || document.querySelector('[role="dialog"]')?.style.pointerEvents === "auto"));
    assert.ok(await page.evaluate(()=>document.body.textContent.includes("Transaction A")));
    assert.equal(await page.evaluate(()=>document.querySelectorAll('[data-state="open"].z-\\[109\\]').length),0,"Composer backdrop removed");
  }
  async function proveLayout(width) {
    const metrics=await page.evaluate(()=>{const d=document.querySelector('[data-document-workspace-mailbox]'),c=d.querySelector('[data-email-content]'),m=d.querySelector('textarea'),r=d.getBoundingClientRect();return {width:r.width,height:r.height,message:m.getBoundingClientRect().height,scroll:c.scrollHeight-c.clientHeight,viewport:innerHeight};});
    if(width>=768){assert.ok(metrics.width>=width*.9 && metrics.width<=width*.96);assert.ok(metrics.message>=200,'Comfortable message height');assert.ok(metrics.scroll<=1,'No whole-content scrolling');}
    assert.ok(metrics.height<=metrics.viewport);
    const boundary=await page.evaluate(()=>({sheet:document.querySelector('[data-fixture-desk]').getBoundingClientRect().left,main:document.querySelector('main').getBoundingClientRect().left}));assert.equal(boundary.sheet,boundary.main);
  }
  async function screenshot(name) { await page.screenshot({ path: path.join(out, name), fullPage: false }); }
  async function selectRecipient(target, search, email) {
    await clickText(target === "to" ? "+ Add recipient" : "+ Add CC");
    await page.type('[aria-label="Search email recipients"]', search);
    await page.waitForFunction(email => document.querySelector('[aria-label="Authorized email recipients"]')?.textContent.includes(email), {}, email);
    await page.locator('[aria-label="Authorized email recipients"] button').click();
  }
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector('[data-document-workspace-action-centre-collapsed="false"]');
  const tableWidth = await page.$eval("[data-fixture-table]", el=>el.getBoundingClientRect().width);
  assert.equal(await page.$eval("[data-fixture-desk]",el=>el.getBoundingClientRect().left),await page.$eval("main",el=>el.getBoundingClientRect().left),"Workspace follows navigation boundary");
  assert.ok(await page.evaluate(()=>{const panel=document.querySelector('[data-document-workspace-action-centre-collapsed="false"]'),close=[...panel.querySelectorAll('button')].find(b=>b.textContent==='Close Action Centre'),title=panel.querySelector('h2');return title.getBoundingClientRect().top-close.getBoundingClientRect().bottom>=30;}),'Close separated from actions');
  await page.$eval('nav',el=>el.style.width='180px');
  await page.waitForFunction(()=>document.querySelector('[data-fixture-desk]').getBoundingClientRect().left===180);
  await page.$eval('nav',el=>el.style.width='240px');
  await page.waitForFunction(()=>document.querySelector('[data-fixture-desk]').getBoundingClientRect().left===240);
  await screenshot("desktop-workspace.png");
  await clickText("Close Action Centre");
  assert.equal(await page.$eval("[data-fixture-table]", el=>el.getBoundingClientRect().width), tableWidth, "Action panel does not shrink table");
  await clickText("Action Centre");
  await openEmail();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth), false);
  assert.ok(await page.evaluate(()=>!document.querySelector("[data-mandatory-sender-cc] button")));
  const attachBox = await page.evaluate(()=>{
    const button=[...document.querySelectorAll("[data-document-workspace-mailbox] button")].find(el=>el.textContent==="Attach Document");
    const box=button.getBoundingClientRect();return { top:box.top,bottom:box.bottom,height:innerHeight };
  });
  assert.ok(attachBox.top>=0 && attachBox.bottom<=attachBox.height, "Attach Document visible without scrolling");
  await proveLayout(1440);
  await screenshot("desktop-composer.png");
  await selectRecipient("to", "Ketan", "ketan@example.test");
  await selectRecipient("to", "Lender", "lender@example.test");
  await selectRecipient("cc", "Other", "other@example.test");
  await selectRecipient("cc", "Analyst", "analyst@example.test");
  await page.waitForFunction(()=>document.querySelectorAll('[aria-label^="Remove TO "]').length===2 && document.querySelectorAll('[aria-label^="Remove CC "]').length===2);
  await clickText("Done");
  await screenshot("desktop-multiple-recipients.png");
  const chooserPromise = page.waitForFileChooser(); await clickText("Attach Document"); const chooser=await chooserPromise; await chooser.cancel();
  assert.equal(await page.evaluate(()=>window.fixtureState.uploads), 0);
  await page.keyboard.press("Escape"); await assertUsable();
  await openEmail(); await clickText("Close"); await assertUsable();
  await openEmail(); await page.keyboard.press("Escape"); await assertUsable();
  await page.goto(`http://127.0.0.1:${port}/?missing=1`, { waitUntil: "networkidle0" }); await openEmail();
  assert.ok(await page.evaluate(()=>document.querySelector("[data-document-workspace-mailbox]").textContent.includes("No email address is recorded")));
  assert.equal(await page.evaluate(()=>document.querySelector("[data-document-workspace-mailbox]").textContent.includes("SSOT")),false);
  assert.equal(await page.evaluate(()=>document.querySelector("[data-document-workspace-mailbox]").textContent.includes("Your sender email could not be verified")),false);
  await screenshot("no-customer-email.png");
  await page.keyboard.press("Escape");
  for (const width of [1280, 1024, 390]) {
    await page.setViewport({width,height:width===390?844:768});
    await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:"networkidle0"});
    await openEmail();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`No page overflow at ${width}`);
    assert.ok(await page.evaluate(()=>{
      const dialog=document.querySelector("[data-document-workspace-mailbox]"),footer=dialog.querySelector("footer").getBoundingClientRect(),header=dialog.querySelector("header").getBoundingClientRect();
      return header.top>=0 && footer.bottom<=innerHeight;
    }));
    await proveLayout(width);
    await screenshot(`composer-${width}.png`);
    await page.keyboard.press("Escape");
  }
  // Dismiss the fixture's remaining Action Centre/Workspace sheets as well.
  for (let i=0;i<3;i++) await page.keyboard.press("Escape");
  await page.waitForFunction(()=>document.querySelectorAll('[role="dialog"]').length===0);
  assert.ok(await page.evaluate(()=>document.body.style.pointerEvents!=="none" && document.body.style.overflow!=="hidden"),"All modal scroll/pointer locks released");
  assert.equal(await page.evaluate(()=>window.fixtureState.sends),0);
  assert.deepEqual(runtimeErrors,[]);
  console.log("PASS rendered UI I–O: actual Radix modal stack, attachment control visible and picker opens, Close/ESC/reopen/underlying Workspace usable, compact responsive composer at 1440/1280/1024/390, no horizontal page overflow, Action Centre leaves table width unchanged, valid locked CC with missing customer. No real sends/uploads/DB writes.");
  console.log(`Screenshots: ${out}`);
} finally {
  if(browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
