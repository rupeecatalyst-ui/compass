import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { programmeRegistryQueryParams } from "../src/lib/enterprise-lender-registry/index.ts";
import {
  EMPTY_PROGRAMME_REGISTRY_FILTERS,
  filterProgrammeRegistry,
} from "../src/lib/product-programme-operations/registry-filters.ts";

const normal = programmeRegistryQueryParams({ pageSize: 200 });
assert.equal(normal.get("search"), null);
assert.equal(normal.get("page"), "1");
assert.equal(normal.get("pageSize"), "200");
assert.equal(normal.get("status"), "all");
assert.equal(normal.get("enabled"), "all");

const exact = programmeRegistryQueryParams({ pageSize: 200, search: " CBI_HL_SAL_001 " });
assert.equal(exact.get("search"), "CBI_HL_SAL_001");
assert.equal(exact.get("page"), "1");
assert.equal(programmeRegistryQueryParams({ pageSize: 200, search: "  " }).get("search"), null);
assert.equal(programmeRegistryQueryParams({ pageSize: 200, search: "" }).toString(), normal.toString());

const scoped = programmeRegistryQueryParams({
  page: 2,
  pageSize: 200,
  search: "CBI_HL_SAL_001",
  lenderId: "lender-1",
  lifecycleStatus: "active",
  publishedOnly: true,
});
assert.equal(scoped.get("lenderId"), "lender-1");
assert.equal(scoped.get("lifecycleStatus"), "active");
assert.equal(scoped.get("status"), "active");
assert.equal(scoped.get("enabled"), "true");
assert.equal(scoped.get("page"), "2");

const programme = {
  id: "beyond-first-page",
  code: "CBI_HL_SAL_001",
  label: "Home Loan Salaried",
  productCode: "HOME_LOAN",
  employmentTypes: ["salaried"],
  legalConstitutions: ["individual"],
  isLivePublished: true,
  publicationState: "published",
  completenessState: "complete",
  effectiveFrom: null,
  effectiveUntil: null,
};
const filters = { ...EMPTY_PROGRAMME_REGISTRY_FILTERS, productCode: "HOME_LOAN", status: "published" };
assert.deepEqual(filterProgrammeRegistry([programme], filters).map((row) => row.id), [programme.id]);
assert.deepEqual(filterProgrammeRegistry([programme], { ...filters, productCode: "LAP" }), []);
assert.deepEqual(filterProgrammeRegistry([programme], { ...filters, effectiveWindow: "expired" }), []);

const workspace = readFileSync(new URL("../src/components/catalyst-one/enterprise-mdm/product-programs-workspace.tsx", import.meta.url), "utf8");
const client = readFileSync(new URL("../src/lib/enterprise-lender-registry/index.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../src/app/api/lender-registry/programs/route.ts", import.meta.url), "utf8");
assert.match(workspace, /queryPrograms\(\{ pageSize: 200, search: debouncedSearch \|\| undefined \}\)/);
assert.match(workspace, /filterProgrammeRegistry\(programs, \{ \.\.\.filters, search: "" \}\)/);
assert.match(workspace, /No programmes match this search\./);
assert.match(workspace, /window\.setTimeout\(\(\) => setDebouncedSearch\(search\), 300\)/);
assert.match(client, /const params = programmeRegistryQueryParams\(query\)/);
assert.match(route, /requireAccessToken\(request\)/);
assert.match(route, /lenderRegistryService\.queryPrograms/);

console.log("Product Programme server-side search and existing filter checks PASS");
