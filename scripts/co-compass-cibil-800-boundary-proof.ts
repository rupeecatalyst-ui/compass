/**
 * Home Loan CIBIL 800+ boundary proof.
 * Public matching uses the band's lower bound. Governed eligibility uses the
 * closed top band [800, 900]. Neither path invents lenders or ignores a
 * published maximum below that band.
 */
import assert from "node:assert/strict";
import { projectPublicProgrammeMatchInput } from "../src/lib/compass-customer-gateway/public-programme-match";
import { matchPublishedProgramme } from "../src/lib/product-programme-operations/match-published";
import { approxCibilBandToLowerBound } from "../src/lib/product-programme-operations/cibil-band";
import type { EnterpriseLenderProgramRecord } from "../src/types/enterprise-lender-registry";

function programme(patch: Partial<EnterpriseLenderProgramRecord> = {}): EnterpriseLenderProgramRecord {
  return {
    id: "hl",
    code: "HL",
    label: "Home Loan",
    lenderId: "lender",
    productCode: "HOME_LOAN",
    versionNumber: 1,
    enabled: true,
    isDeleted: false,
    isLivePublished: true,
    publicationState: "published",
    completenessState: "complete",
    employmentTypes: ["salaried"],
    legalConstitutions: [],
    residencyEligibility: [],
    eligibleStates: [],
    eligibleCities: [],
    propertyCategories: [],
    constructionStatuses: [],
    propertyTypes: [],
    transactionTypes: [],
    minCibil: 700,
    maxCibil: 900,
    ...patch,
  } as EnterpriseLenderProgramRecord;
}

function projected(band: string, employment = "salaried") {
  return projectPublicProgrammeMatchInput({
    productCode: "HOME_LOAN",
    productLabel: "Home Loan",
    requiredAmountLabel: "5000000",
    borrowerFields: {
      employmentTypeCode: employment,
      approxCibilScore: band,
      residency: "resident",
      ageYears: "35",
    },
    productFields: {},
  });
}

assert.equal(approxCibilBandToLowerBound("750_799"), 750);
assert.equal(approxCibilBandToLowerBound("800_plus"), 800);
assert.equal(projected("800_plus").cibil, 800);
assert.equal(projected("750_799").cibil, 750);

const salaried = programme();
const selfEmployed = programme({ employmentTypes: ["self-employed-professional"] });
for (const band of ["750_799", "800_plus"]) {
  assert.equal(matchPublishedProgramme(salaried, projected(band)).matched, true, band);
  assert.equal(
    matchPublishedProgramme(selfEmployed, projected(band, "self-employed-professional")).matched,
    true,
    `self-employed ${band}`,
  );
  assert.equal(
    matchPublishedProgramme(salaried, projected(band, "self-employed-professional")).matched,
    false,
    `salaried programme rejects self-employed ${band}`,
  );
}

for (const score of [799, 800, 801, 900]) {
  assert.equal(matchPublishedProgramme(salaried, { ...projected("800_plus"), cibil: score }).matched, true, String(score));
}
assert.equal(matchPublishedProgramme(salaried, { ...projected("800_plus"), cibil: 901 }).matched, false);
assert.equal(
  matchPublishedProgramme(programme({ maxCibil: 799 }), projected("800_plus")).matched,
  false,
);
assert.match(
  matchPublishedProgramme(programme({ maxCibil: 799 }), projected("800_plus")).reason,
  /CIBIL is outside programme range/,
);

console.log("co-compass-cibil-800-boundary-proof: pass");
