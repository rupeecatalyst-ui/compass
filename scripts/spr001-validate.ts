import { runLifeFoundationValidation } from "../src/lib/enterprise-life-engine";
import { runEcmFoundationValidation } from "../src/lib/enterprise-contact-master";
import { runEdcFoundationValidation } from "../src/lib/enterprise-dialogue-center";
import { runEteFoundationValidation } from "../src/lib/enterprise-task-engine";
import { runEnceFoundationValidation } from "../src/lib/enterprise-notification-communication-engine";
import {
  initializeEdieRegisteredFileTypes,
  registerEdieDocumentRule,
  resetEdieComposition,
  resolveEdieDocumentRulesForContext,
} from "../src/lib/enterprise-document-intelligence-engine";
import {
  computeOpportunityCompassNeedle,
  computeOpportunityPulse,
} from "../src/lib/enterprise-opportunity-compass";
import {
  configurePlatformModes,
  resetPlatformModes,
  shouldSuppressAutomation,
} from "../src/lib/enterprise-platform-modes";
import {
  listEcgSections,
  registerEcgSection,
  resetEcgComposition,
} from "../src/lib/enterprise-interface-configuration-grants";

const results = [
  ["LIFE", runLifeFoundationValidation()],
  ["ECM", runEcmFoundationValidation()],
  ["EDC", runEdcFoundationValidation()],
  ["ETE", runEteFoundationValidation()],
  ["ENCE", runEnceFoundationValidation()],
] as const;

let allPassed = true;
for (const [name, result] of results) {
  console.log(`${name}: ${result.passed ? "PASS" : "FAIL"}`);
  if (!result.passed) {
    console.log(JSON.stringify(result.details));
    allPassed = false;
  }
}

resetEdieComposition();
initializeEdieRegisteredFileTypes();
registerEdieDocumentRule({
  ruleCode: "DOC-HL-SAL",
  ruleName: "Home Loan Salaried Pack",
  productRef: "product:home-loan",
  employmentType: "salaried",
  loanStage: "processing",
  documentTypeRefs: ["pan", "salary_slip"],
  uploadMethod: "both",
  enabled: true,
  createdBy: "system",
});
const rules = resolveEdieDocumentRulesForContext({
  productRef: "product:home-loan",
  employmentType: "salaried",
  loanStage: "processing",
});
console.log(`EDIE rules: ${rules.length >= 1 ? "PASS" : "FAIL"}`);
if (rules.length < 1) allPassed = false;

const needle = computeOpportunityCompassNeedle({ completionRatio: 0.9, overdueTaskCount: 0 });
const pulse = computeOpportunityPulse({ completionRatio: 0.4, overdueTaskCount: 2 });
console.log(`Compass: ${needle.needle === "north" && pulse.label ? "PASS" : "FAIL"}`);
if (needle.needle !== "north") allPassed = false;

resetPlatformModes();
configurePlatformModes({ migrationMode: true });
console.log(`Migration suppress: ${shouldSuppressAutomation("tasks") ? "PASS" : "FAIL"}`);
if (!shouldSuppressAutomation("tasks")) allPassed = false;

resetEcgComposition();
registerEcgSection({
  sectionCode: "interface",
  sectionName: "Interface",
  kind: "interface",
  enabled: true,
  createdBy: "system",
});
registerEcgSection({
  sectionCode: "configuration",
  sectionName: "Configuration",
  kind: "configuration",
  enabled: true,
  createdBy: "system",
});
registerEcgSection({
  sectionCode: "grants",
  sectionName: "Grants",
  kind: "grants",
  enabled: true,
  createdBy: "system",
});
console.log(`ECG: ${listEcgSections().length >= 3 ? "PASS" : "FAIL"}`);
if (listEcgSections().length < 3) allPassed = false;

process.exit(allPassed ? 0 : 1);
