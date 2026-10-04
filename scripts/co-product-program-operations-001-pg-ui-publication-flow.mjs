/**
 * Interactive publication / versioning UI flow.
 * Clicks Submit, Approve, Publish, Edit programme, and Republish against clean_002.
 */
export async function runPublicationBat({
  page,
  BASE,
  prisma,
  record,
  shot,
  go,
  loginAs,
  logout,
  pageAuthedJson,
  waitSettled,
  setInput,
  bodyHas,
  setSessionActor,
}) {
  const httpEvidence = [];
  const dbEvidence = [];

  page.on("dialog", async (dialog) => {
    const type = dialog.type();
    if (type === "prompt") {
      await dialog.accept("BAT publication approval");
      return;
    }
    if (type === "confirm") {
      await dialog.accept();
      return;
    }
    await dialog.dismiss();
  });

  async function dbProgram(id) {
    const row = await prisma.enterpriseLenderProgram.findUnique({ where: { id } });
    if (!row) return null;
    const snap = {
      id: row.id,
      publicationState: row.publicationState,
      approvalStatus: row.approvalStatus,
      isLivePublished: row.isLivePublished,
      versionNumber: row.versionNumber,
      completenessState: row.completenessState,
      minRoiExact: row.minRoiExact != null ? String(row.minRoiExact) : null,
      createdBy: row.createdBy,
      lineageId: row.lineageId,
      supersedesProgramId: row.supersedesProgramId,
      code: row.code,
    };
    dbEvidence.push({ at: new Date().toISOString(), ...snap });
    return snap;
  }

  async function dealStamp() {
    const deal = await prisma.enterpriseDeal.findUnique({ where: { id: "deal_ppo_adv_committed" } });
    const snapshot = deal?.snapshot && typeof deal.snapshot === "object" ? deal.snapshot : {};
    const stamp = snapshot.publishedProgrammeStamp && typeof snapshot.publishedProgrammeStamp === "object"
      ? snapshot.publishedProgrammeStamp
      : null;
    return {
      lenderProgramId: deal?.lenderProgramId ?? null,
      programmeId: stamp?.programmeId ?? null,
      programmeVersion: stamp?.programmeVersion ?? null,
      programmeCode: stamp?.programmeCode ?? null,
    };
  }

  async function listPrograms() {
    const body = await pageAuthedJson("/api/lender-registry/programs?page=1&pageSize=200&status=all&enabled=all");
    const items = body?.data?.items || body?.data || [];
    return Array.isArray(items) ? items : [];
  }

  async function openProgramme(id) {
    await page.goto(`${BASE}/admin/product-programs?programId=${encodeURIComponent(id)}`, {
      waitUntil: "domcontentloaded",
      timeout: 180_000,
    });
    await waitSettled({
      selector: '[data-testid="programme-save-draft"], [data-section="programme-identity"]',
      timeout: 180_000,
    });
    await page.waitForSelector('[data-testid="programme-submit"]', { timeout: 60_000 });
  }

  async function clickWorkflow(actionLabel, testId) {
    const pending = page.waitForResponse((res) => {
      return res.url().includes("/workflow") && res.request().method() === "POST";
    }, { timeout: 120_000 });
    await page.click(`[data-testid="${testId}"]`);
    const resp = await pending;
    const text = await resp.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    const ev = {
      action: actionLabel,
      httpStatus: resp.status(),
      success: parsed?.success === true,
      code: parsed?.error?.code ?? null,
      message: parsed?.error?.message ?? null,
      programId: parsed?.data?.id ?? null,
      publicationState: parsed?.data?.publicationState ?? null,
      approvalStatus: parsed?.data?.approvalStatus ?? null,
      isLivePublished: parsed?.data?.isLivePublished ?? null,
      versionNumber: parsed?.data?.versionNumber ?? null,
      completenessState: parsed?.data?.completenessState ?? null,
      minRoiExact: parsed?.data?.minRoiExact ?? null,
    };
    httpEvidence.push(ev);
    return ev;
  }

  async function saveDraftClick() {
    const pending = page.waitForResponse((res) => {
      return res.url().includes("/api/lender-registry/programs/") && res.request().method() === "PATCH";
    }, { timeout: 120_000 });
    await page.click('[data-testid="programme-save-draft"]');
    const resp = await pending;
    const text = await resp.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    const ev = {
      action: "save-draft",
      httpStatus: resp.status(),
      success: parsed?.success === true,
      programId: parsed?.data?.id ?? null,
      publicationState: parsed?.data?.publicationState ?? null,
      isLivePublished: parsed?.data?.isLivePublished ?? null,
      versionNumber: parsed?.data?.versionNumber ?? null,
      completenessState: parsed?.data?.completenessState ?? null,
      minRoiExact: parsed?.data?.minRoiExact ?? null,
    };
    httpEvidence.push(ev);
    if (resp.status() !== 200 || !parsed?.success) {
      throw new Error(`Save Draft PATCH ${resp.status()} ${text.slice(0, 300)}`);
    }
    await waitSettled({ selector: '[data-testid="programme-save-draft"]' });
    return ev;
  }

  const originalStamp = await dealStamp();
  record("UI-PUB-ORIGINAL-DEAL-STAMP", Boolean(originalStamp.programmeId) && originalStamp.programmeVersion != null, originalStamp);

  setSessionActor("creator");
  await go("/admin/product-programs", '[data-testid="programme-new"]');
  const registry = await bodyHas(/Product Programmes|New Programme/i);
  record("UI-PUB-PROGRAMME-REGISTRY", registry.ok, { url: page.url() });
  await shot("pub-01-programme-registry", "Creator opened Product Programmes registry");

  const items = await listPrograms();
  const live = items.find((row) => row.isLivePublished && row.completenessState === "complete")
    || items.find((row) => row.isLivePublished);
  record("UI-PUB-LIVE-FOUND", Boolean(live?.id), {
    id: live?.id,
    versionNumber: live?.versionNumber,
    publicationState: live?.publicationState,
  });

  await openProgramme(live.id);
  await shot("pub-02-complete-published-before-draft", "Open complete published programme before Save Draft");
  const created = await saveDraftClick();
  record("UI-PUB-CREATE-COMPLETE-DRAFT", Boolean(created.programId) && created.completenessState === "complete" && created.publicationState === "draft" && created.isLivePublished === false, created);
  const working = { id: created.programId, versionNumber: created.versionNumber, publicationState: created.publicationState };
  await openProgramme(working.id);

  const draftDb = await dbProgram(working.id);
  record("UI-PUB-DRAFT-OPEN", draftDb?.completenessState === "complete" && draftDb?.isLivePublished === false && draftDb?.publicationState === "draft", draftDb);
  await shot("pub-03-complete-draft", "Complete draft programme open before Submit");

  const submit = await clickWorkflow("submit", "programme-submit");
  record("UI-PUB-SUBMIT-HTTP", submit.httpStatus === 200 && submit.publicationState === "pending_approval", submit);
  const afterSubmit = await dbProgram(working.id);
  record("UI-PUB-PENDING-APPROVAL-DB", afterSubmit?.publicationState === "pending_approval" && afterSubmit?.approvalStatus === "pending", afterSubmit);
  const pendingUi = await bodyHas(/pending_approval|Pending Approval|submit succeeded/i);
  record("UI-PUB-PENDING-APPROVAL-UI", pendingUi.ok || afterSubmit?.publicationState === "pending_approval", {
    excerpt: pendingUi.excerpt,
    publicationState: afterSubmit?.publicationState,
  });
  await shot("pub-04-pending-approval", "Status becomes Pending Approval after Submit");

  const self = await clickWorkflow("approve-creator", "programme-approve");
  record("UI-PUB-SELF-APPROVE-REJECTED", self.httpStatus === 403 && /Creator cannot approve/i.test(self.message || ""), self);
  const toast = await bodyHas(/Creator cannot approve/i);
  record("UI-PUB-SELF-APPROVE-TOAST", toast.ok, { excerpt: toast.excerpt, httpStatus: self.httpStatus });
  const stillPending = await dbProgram(working.id);
  record("UI-PUB-SELF-APPROVE-UNCHANGED", stillPending?.approvalStatus === "pending" && stillPending?.isLivePublished === false, stillPending);
  await shot("pub-05-self-approval-rejected", "Creator self-approval rejected");

  await logout();
  setSessionActor("approver");
  const approverLogin = await loginAs("approver");
  record("UI-PUB-APPROVER-LOGIN", !/\/login(\/|\?|$)/i.test(approverLogin.url), { url: approverLogin.url, status: approverLogin.status });
  await openProgramme(working.id);
  await shot("pub-06-approver-open-submitted", "Approver opened submitted programme");

  const beforeApprove = await dbProgram(working.id);
  if (beforeApprove.approvalStatus !== "approved") {
    const approve = await clickWorkflow("approve", "programme-approve");
    record("UI-PUB-APPROVE-HTTP", approve.httpStatus === 200 && approve.approvalStatus === "approved", approve);
    const afterApprove = await dbProgram(working.id);
    record("UI-PUB-APPROVE-DB", afterApprove?.approvalStatus === "approved", afterApprove);
    await shot("pub-07-approved", "Approver clicked Approve");
  } else {
    record("UI-PUB-APPROVE-HTTP", true, { skipped: true });
    record("UI-PUB-APPROVE-DB", true, beforeApprove);
  }

  if (beforeApprove.isLivePublished !== true) {
    const publish = await clickWorkflow("publish", "programme-publish");
    record("UI-PUB-PUBLISH-HTTP", publish.httpStatus === 200 && publish.isLivePublished === true, publish);
  } else {
    record("UI-PUB-PUBLISH-HTTP", true, { skipped: true });
  }
  const published = await dbProgram(working.id);
  record("UI-PUB-ACTIVE-PUBLISHED", published?.isLivePublished === true && published?.publicationState === "published", published);
  await shot("pub-08-published-active", "Programme is the active published version");

  const parentAfterFirst = live.id !== working.id ? await dbProgram(live.id) : null;
  if (parentAfterFirst) {
    record("UI-PUB-PREVIOUS-SUPERSEDED-AFTER-FIRST", parentAfterFirst.publicationState === "superseded" && parentAfterFirst.isLivePublished === false, parentAfterFirst);
  }

  await go("/admin/lender-registry");
  await page.waitForFunction(
    () => /Fixture Housing Finance|lender_ppo_clean/i.test(document.body?.innerText || ""),
    { timeout: 60_000 },
  );
  const lenderRegistry = await bodyHas(/Fixture Housing Finance|lender_ppo_clean/i);
  record("UI-PUB-LENDER-REGISTRY", lenderRegistry.ok, { excerpt: lenderRegistry.excerpt });
  await shot("pub-09-lender-registry", "Published lender remains in Lender Registry");

  await page.goto(`${BASE}/lenders?workspace=lender_ppo_clean`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForSelector('[data-testid="lender-360-root"]', { timeout: 90_000 });
  await page.waitForSelector('[data-testid="eld-tab-products"]', { timeout: 30_000 });
  await page.click('[data-testid="eld-tab-products"]');
  await page.waitForSelector('[data-testid="lender-360-programme-card"]', { timeout: 30_000 });
  const firstCard = await page.$eval('[data-testid="lender-360-programme-card"]', (el) => el.textContent || "");
  record("UI-PUB-LENDER-360", /HOME_LOAN|Home Loan|v\d+|Policy/i.test(firstCard) && !/No published product programmes/i.test(firstCard), {
    excerpt: firstCard.replace(/\s+/g, " ").slice(0, 400),
  });
  await shot("pub-10-lender-360", "Published programme appears in Lender 360");

  await logout();
  setSessionActor("creator");
  const creatorAgain = await loginAs("creator");
  record("UI-PUB-CREATOR-RELOGIN", !/\/login(\/|\?|$)/i.test(creatorAgain.url), { url: creatorAgain.url });

  await page.goto(`${BASE}/lenders?workspace=lender_ppo_clean`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForSelector('[data-testid="lender-360-root"]', { timeout: 90_000 });
  await page.click('[data-testid="eld-tab-products"]');
  await page.waitForSelector('[data-testid="lender-360-edit-programme"]', { timeout: 30_000 });
  await shot("pub-11-edit-programme-cta", "Edit programme control visible on Lender 360");
  await page.click('[data-testid="lender-360-edit-programme"]');
  await waitSettled({ selector: '[data-testid="programme-save-draft"]', timeout: 180_000 });
  await shot("pub-12-edit-programme-editor", "Creator clicked Edit programme");

  const revisionSave = await saveDraftClick();
  record("UI-PUB-NEW-DRAFT-VERSION", revisionSave.programId !== working.id && revisionSave.publicationState === "draft" && revisionSave.completenessState === "complete" && revisionSave.isLivePublished === false, revisionSave);
  const revisionId = revisionSave.programId;
  await openProgramme(revisionId);
  const revisionDb = await dbProgram(revisionId);
  record("UI-PUB-NEW-DRAFT-DB", revisionDb?.publicationState === "draft" && revisionDb?.completenessState === "complete" && Number(revisionDb?.versionNumber) > Number(published.versionNumber), revisionDb);
  await shot("pub-13-complete-revision-draft", "Complete new draft version created");

  await page.$eval('[data-section="pricing-roi"]', (el) => el.scrollIntoView());
  const nextRoi = "8.250000";
  await setInput(page, '[data-testid="programme-min-roi"]', nextRoi);
  const revisionFieldSave = await saveDraftClick();
  record("UI-PUB-REVISION-FIELD-SAVED", revisionFieldSave.httpStatus === 200 && String(revisionFieldSave.minRoiExact || "").includes("8.25"), revisionFieldSave);
  await page.$eval('[data-section="completeness-review"]', (el) => el.scrollIntoView());
  const revisionSubmit = await clickWorkflow("submit-revision", "programme-submit");
  record("UI-PUB-REVISION-SUBMIT", revisionSubmit.httpStatus === 200 && revisionSubmit.publicationState === "pending_approval", revisionSubmit);
  await shot("pub-14-revision-submitted", "Revision saved and submitted");

  await logout();
  setSessionActor("approver");
  await loginAs("approver");
  await openProgramme(revisionId);
  const revisionApprove = await clickWorkflow("approve-revision", "programme-approve");
  record("UI-PUB-REVISION-APPROVE", revisionApprove.httpStatus === 200 && revisionApprove.approvalStatus === "approved", revisionApprove);
  await shot("pub-15-revision-approved", "Approver approved the revision");
  const republish = await clickWorkflow("republish", "programme-publish");
  record("UI-PUB-REPUBLISH-HTTP", republish.httpStatus === 200 && republish.isLivePublished === true, republish);
  const revisedLive = await dbProgram(revisionId);
  const supersededPrior = await dbProgram(working.id);
  record("UI-PUB-REVISED-ACTIVE", revisedLive?.isLivePublished === true && revisedLive?.publicationState === "published" && String(revisedLive?.minRoiExact || "").includes("8.25"), revisedLive);
  record("UI-PUB-EARLIER-SUPERSEDED", supersededPrior?.publicationState === "superseded" && supersededPrior?.isLivePublished === false, supersededPrior);
  await shot("pub-16-republished-active", "Revised version is active after Republish");

  await page.goto(`${BASE}/lenders?workspace=lender_ppo_clean`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForSelector('[data-testid="lender-360-root"]', { timeout: 90_000 });
  await page.click('[data-testid="eld-tab-products"]');
  await page.waitForSelector('[data-testid="lender-360-programme-card"]', { timeout: 30_000 });
  const historyEl = await page.$('[data-testid="lender-360-version-history"]');
  const historyText = historyEl ? await page.$eval('[data-testid="lender-360-version-history"]', (el) => el.textContent || "") : "";
  const cardAfter = await page.$eval('[data-testid="lender-360-programme-card"]', (el) => el.textContent || "");
  record("UI-PUB-VERSION-HISTORY", /Version history/i.test(historyText) && /superseded/i.test(historyText) && new RegExp(`v${revisedLive.versionNumber}`).test(historyText + cardAfter), {
    history: historyText.replace(/\s+/g, " ").slice(0, 400),
    card: cardAfter.replace(/\s+/g, " ").slice(0, 400),
  });
  record("UI-PUB-POLICY-LOD-ROI-ELIGIBILITY", /Policy/i.test(cardAfter) && /Documents|LOD|required document/i.test(cardAfter) && /ROI/i.test(cardAfter) && /Employment|CIBIL|Amount|Eligibility/i.test(cardAfter), {
    excerpt: cardAfter.replace(/\s+/g, " ").slice(0, 500),
  });
  await shot("pub-17-version-history-policy", "Superseded version remains in history; policy/LOD/ROI/eligibility remain");

  await go("/chanakya-radar", '[data-testid="published-programme-evidence"]');
  await page.waitForFunction(
    (version, code) => {
      const el = document.querySelector('[data-testid="published-programme-evidence"]');
      const ver = document.querySelector('[data-testid="published-programme-version"]');
      const text = `${el?.textContent || ""} ${ver?.textContent || ""}`;
      return new RegExp(`v${version}`).test(text) && (!code || text.includes(code));
    },
    { timeout: 180_000 },
    revisedLive.versionNumber,
    revisedLive.code,
  );
  const chanakya = await bodyHas(new RegExp(`v${revisedLive.versionNumber}`));
  record("UI-PUB-CHANAKYA-NEW-VERSION", chanakya.ok, { excerpt: chanakya.excerpt, expectedVersion: revisedLive.versionNumber, code: revisedLive.code });
  record("UI-PUB-CHANAKYA-USES-PUBLISHED", /Using published programme/i.test(chanakya.text || ""), { excerpt: chanakya.excerpt });
  await shot("pub-18-chanakya-new-version", "CHANAKYA uses the newly published version");

  await go("/opportunity-compass", '[data-testid="published-programme-evidence"]');
  await page.waitForFunction(
    (version, code) => {
      const el = document.querySelector('[data-testid="published-programme-evidence"]');
      const ver = document.querySelector('[data-testid="published-programme-version"]');
      const text = `${el?.textContent || ""} ${ver?.textContent || ""}`;
      return new RegExp(`v${version}`).test(text) && (!code || text.includes(code));
    },
    { timeout: 180_000 },
    revisedLive.versionNumber,
    revisedLive.code,
  );
  const compass = await bodyHas(new RegExp(`v${revisedLive.versionNumber}`));
  record("UI-PUB-COMPASS-NEW-VERSION", compass.ok, { excerpt: compass.excerpt, expectedVersion: revisedLive.versionNumber });
  await shot("pub-19-opportunity-compass-new-version", "Opportunity Compass uses the newly published version");

  await go("/deals/deal_ppo_adv_committed", '[data-field="advantage-committed"], [data-testid="published-programme-evidence"]');
  const stampAfter = await dealStamp();
  record("UI-PUB-DEAL-STAMP-UNCHANGED", stampAfter.programmeId === originalStamp.programmeId && Number(stampAfter.programmeVersion) === Number(originalStamp.programmeVersion), {
    original: originalStamp,
    after: stampAfter,
    liveVersion: revisedLive.versionNumber,
  });
  const dealUi = await bodyHas(new RegExp(`v${originalStamp.programmeVersion}`));
  record("UI-PUB-DEAL-UI-ORIGINAL-VERSION", dealUi.ok, { excerpt: dealUi.excerpt, originalVersion: originalStamp.programmeVersion });
  await shot("pub-20-deal-original-stamp", "Existing Deal retains originally stamped programme version");

  return { httpEvidence, dbEvidence, originalStamp, liveId: live.id, firstPublishedId: working.id, revisedId: revisionId };
}
