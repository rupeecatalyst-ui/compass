/**
 * CO-CATALYST-ONE-REFINEMENT-002 — LOD contact readiness verifier.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateDocumentRequestLodReadiness } from "../src/lib/document-requests/lod-readiness.ts";
import {
  resolveLodContact,
  resolveLodContactReadiness,
} from "../src/lib/document-requests/resolve-lod-contact.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  const abs = join(root, rel);
  assert.ok(existsSync(abs), `Missing: ${rel}`);
  return readFileSync(abs, "utf8");
}

function mustContain(rel, needle) {
  assert.ok(read(rel).includes(needle), `${rel}: expected "${needle}"`);
}

function mustNotContain(rel, needle) {
  assert.ok(!read(rel).includes(needle), `${rel}: must not contain "${needle}"`);
}

const companyBorrower = {
  kind: "company",
  displayName: "Oxygen Biochem Pvt Ltd",
  companyId: "co-oxygen",
  companyName: "Oxygen Biochem Pvt Ltd",
  partyId: "company:co-oxygen",
  partyEntityId: "co-oxygen",
};

const companyParticipant = {
  id: "p-company",
  entityType: "company",
  entityId: "co-oxygen",
  name: "Oxygen Biochem Pvt Ltd",
  role: "company",
  constitution: "private_limited",
};

function director(overrides = {}) {
  return {
    id: "p-director",
    entityType: "individual",
    entityId: "contact-director",
    name: "Asha Director",
    role: "other",
    relationship: "Director",
    mobile: "9876543210",
    email: "director@oxygen.example",
    ...overrides,
  };
}

function baseLodInput(overrides = {}) {
  return {
    customerName: "Oxygen Biochem Pvt Ltd",
    productLabel: "Home Loan",
    employmentType: "company",
    constitution: "private_limited",
    borrower: companyBorrower,
    participants: [companyParticipant, director()],
    ...overrides,
  };
}

function run() {
  console.log("CO-CATALYST-ONE-REFINEMENT-002 — LOD contact readiness verifier\n");

  // CASE 1 — Director with valid mobile + email
  {
    const readiness = resolveLodContactReadiness({
      borrower: companyBorrower,
      participants: [companyParticipant, director()],
    });
    assert.equal(readiness.ready, true, "CASE 1 readiness");
    const gate = evaluateDocumentRequestLodReadiness(baseLodInput());
    assert.equal(gate.canGenerate, true, "CASE 1 LOD READY");
    assert.ok(gate.resolvedContact?.email.includes("director@"), "CASE 1 resolved email");
  }
  console.log("CASE 1 PASS — company + director contact → LOD READY");

  // CASE 2 — Authorized signatory
  {
    const signatory = director({
      id: "p-signatory",
      role: "authorized_signatory",
      relationship: "Authorised Signatory",
      name: "Ravi Signatory",
      email: "signatory@oxygen.example",
    });
    const gate = evaluateDocumentRequestLodReadiness(
      baseLodInput({ participants: [companyParticipant, signatory] }),
    );
    assert.equal(gate.canGenerate, true, "CASE 2");
    assert.equal(gate.resolvedContact?.participantRole, "authorized_signatory");
  }
  console.log("CASE 2 PASS — authorized signatory → LOD READY");

  // CASE 3 — Co-applicant
  {
    const coApplicant = director({
      id: "p-co",
      role: "co_applicant",
      relationship: "Co-applicant",
      name: "Meera Co",
      email: "co@oxygen.example",
    });
    const gate = evaluateDocumentRequestLodReadiness(
      baseLodInput({ participants: [companyParticipant, coApplicant] }),
    );
    assert.equal(gate.canGenerate, true, "CASE 3");
  }
  console.log("CASE 3 PASS — co-applicant → LOD READY");

  // CASE 4 — mobile only
  {
    const partial = director({ email: "" });
    const readiness = resolveLodContactReadiness({
      borrower: companyBorrower,
      participants: [companyParticipant, partial],
    });
    assert.equal(readiness.ready, false, "CASE 4 readiness");
    assert.ok(readiness.missingChannels.includes("email"), "CASE 4 missing email");
    const gate = evaluateDocumentRequestLodReadiness(
      baseLodInput({ participants: [companyParticipant, partial] }),
    );
    assert.equal(gate.canGenerate, false, "CASE 4 gate");
  }
  console.log("CASE 4 PASS — mobile only → CONTACT NOT READY");

  // CASE 5 — email only
  {
    const partial = director({ mobile: "" });
    const readiness = resolveLodContactReadiness({
      borrower: companyBorrower,
      participants: [companyParticipant, partial],
    });
    assert.equal(readiness.ready, false, "CASE 5 readiness");
    assert.ok(readiness.missingChannels.includes("mobile"), "CASE 5 missing mobile");
  }
  console.log("CASE 5 PASS — email only → CONTACT NOT READY");

  // CASE 6 — multiple persons, one complete
  {
    const incomplete = director({ id: "p-a", mobile: "9876543210", email: "" });
    const complete = director({
      id: "p-b",
      name: "Backup Contact",
      email: "backup@oxygen.example",
    });
    const gate = evaluateDocumentRequestLodReadiness(
      baseLodInput({ participants: [companyParticipant, incomplete, complete] }),
    );
    assert.equal(gate.canGenerate, true, "CASE 6");
  }
  console.log("CASE 6 PASS — multiple linked persons, one complete → LOD READY");

  // CASE 7 — individual borrower own contact
  {
    const individualBorrower = {
      kind: "individual",
      displayName: "Rahul Sharma",
      primaryContactId: "contact-rahul",
      primaryContactName: "Rahul Sharma",
      primaryContactMobile: "9988776655",
      primaryContactEmail: "rahul@example.com",
      partyId: "contact:contact-rahul",
      partyEntityId: "contact-rahul",
    };
    const gate = evaluateDocumentRequestLodReadiness({
      customerName: "Rahul Sharma",
      productLabel: "Home Loan",
      employmentType: "salaried",
      borrower: individualBorrower,
      participants: [],
      contactRegistry: {
        mobile: "9988776655",
        email: "rahul@example.com",
      },
    });
    assert.equal(gate.canGenerate, true, "CASE 7");
  }
  console.log("CASE 7 PASS — individual borrower → LOD READY");

  // CASE 8 — no eligible human with both
  {
    const gate = evaluateDocumentRequestLodReadiness(
      baseLodInput({
        participants: [
          companyParticipant,
          director({ mobile: "", email: "" }),
        ],
      }),
    );
    assert.equal(gate.canGenerate, false, "CASE 8");
    assert.ok(
      gate.chanakyaMessage?.includes("Loan Structure"),
      "CASE 8 company wording",
    );
  }
  console.log("CASE 8 PASS — no eligible contact → blocker shown");

  // CASE 9 — contact ready but product missing
  {
    const gate = evaluateDocumentRequestLodReadiness(
      baseLodInput({ productLabel: "" }),
    );
    assert.equal(gate.canGenerate, false, "CASE 9");
    assert.ok(
      gate.gaps.some((gap) => gap.field === "product" || gap.field === "edie.product"),
      "CASE 9 product gap",
    );
  }
  console.log("CASE 9 PASS — other mandatory field still blocks LOD");

  // CASE 10 — no company mutation helpers in resolver
  {
    mustNotContain(
      "src/lib/document-requests/resolve-lod-contact.ts",
      "company.mobile",
    );
    mustNotContain(
      "src/lib/document-requests/resolve-lod-contact.ts",
      "primaryContactMobile =",
    );
    mustContain(
      "src/lib/document-requests/resolve-lod-contact.ts",
      "Never copies person contact into company records",
    );
  }
  console.log("CASE 10 PASS — no copy/mutation into company record");

  // CASE 11 — CHANAKYA PII redaction unchanged
  {
    const evidence = read("src/lib/chanakya-enterprise-read-context/evidence-projections.ts");
    assert.ok(evidence.includes("[REDACTED]"), "CASE 11 redacted placeholder");
    assert.ok(
      evidence.includes('g.field !== "mobile" && g.field !== "email"'),
      "CASE 11 mobile/email gaps stripped from AI",
    );
    assert.ok(
      evidence.includes("contactChannels: CHANAKYA_FIELD_AVAILABILITY.REDACTED"),
      "CASE 11 contact channels redacted",
    );
  }
  console.log("CASE 11 PASS — CHANAKYA/AI PII redaction unchanged");

  // Priority — authorized signatory before director
  {
    const resolved = resolveLodContact({
      borrower: companyBorrower,
      participants: [
        companyParticipant,
        director({ role: "other", relationship: "Director", email: "dir@oxygen.example" }),
        director({
          id: "p-sign",
          role: "authorized_signatory",
          relationship: "Authorised Signatory",
          name: "Sign First",
          email: "sign-first@oxygen.example",
        }),
      ],
    });
    assert.equal(resolved?.email, "sign-first@oxygen.example", "priority signatory");
  }
  console.log("BONUS PASS — authorized signatory priority over director");

  console.log("\nALL CASES PASS");
}

run();
