/**
 * Multilingual Intelligence Engine readiness (CO-AI-114).
 */

import {
  EAI_MULTILINGUAL_ENGINE_VERSION,
  EAI_OUTSIDE_DOMAIN_REFUSAL_BY_LANGUAGE,
  EAI_OUTSIDE_DOMAIN_REFUSAL_MEANING_KEY,
  EAI_SUPPORTED_LANGUAGES,
} from "@/constants/enterprise-ai-platform/multilingual";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type { EaiMultilingualEngineReadinessResult } from "@/types/enterprise-ai-multilingual";
import {
  ensureEaiBehaviourPackScaffolds,
  resetEaiBehaviourPackRegistry,
} from "../behaviour-packs";
import { resetEaiComposition } from "../composition";
import { runEaiSarathiConversationTurn } from "../conversation-experience/turn-orchestrator";
import { buildEaiMultilingualTurnContext } from "./compose-turn";
import { detectEaiLanguage } from "./detect";
import {
  getEaiOutsideDomainRefusalLocalised,
  isEaiOutsideDomainRefusalEquivalent,
  localiseEaiOutsideDomainRefusal,
  localiseEaiToneLines,
} from "./localisation";
import { isEaiMixedLanguageUtterance } from "./mixed-language";
import { resolveEaiLanguagePreference } from "./preference";
import { translateEaiUtteranceToCanonical } from "./translation";

export async function runEaiMultilingualEngineReadiness(): Promise<EaiMultilingualEngineReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();

  if (EAI_SUPPORTED_LANGUAGES.length !== 3) {
    errors.push("Must support exactly en, hi, mr");
  }

  for (const lang of EAI_SUPPORTED_LANGUAGES) {
    const local = localiseEaiOutsideDomainRefusal(lang);
    if (local.meaningKey !== EAI_OUTSIDE_DOMAIN_REFUSAL_MEANING_KEY) {
      errors.push(`Refusal meaning key missing for ${lang}`);
    }
    if (!isEaiOutsideDomainRefusalEquivalent(local.text)) {
      errors.push(`Localised refusal not registered for ${lang}`);
    }
    if (lang === "en" && local.text !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
      errors.push("English refusal must remain platform canonical SSOT");
    }
  }

  if (EAI_OUTSIDE_DOMAIN_REFUSAL_BY_LANGUAGE.en !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("en refusal must equal EAI_OUTSIDE_DOMAIN_REFUSAL");
  }

  const hiDetect = detectEaiLanguage("मुझे होम लोन चाहिए");
  if (hiDetect.primary !== "hi") errors.push("Hindi Devanagari must detect as hi");

  const mixed = detectEaiLanguage("Mujhe Balance Transfer chahiye");
  if (!mixed.isMixed && mixed.primary !== "hi") {
    errors.push("Hinglish BT utterance should detect hi or mixed");
  }
  if (!isEaiMixedLanguageUtterance("Mujhe Balance Transfer chahiye")) {
    warnings.push("Mixed-language helper did not flag Hinglish BT");
  }

  const pref = resolveEaiLanguagePreference({
    utterance: "Hello",
    explicitPreference: "mr",
  });
  if (pref.language !== "mr" || pref.source !== "explicit_preference") {
    errors.push("Explicit language preference must win");
  }

  const canon = translateEaiUtteranceToCanonical("मुझे बैलेंस ट्रांसफर चाहिए", "hi");
  if (!/Balance Transfer/i.test(canon.translatedText)) {
    errors.push("Translation layer must map Hindi BT to canonical English for engines");
  }

  const toneHi = localiseEaiToneLines({
    categoryId: "balance_transfer",
    audience: "customer",
    language: "hi",
    englishLines: ["Let's reduce your borrowing cost."],
  });
  if (!toneHi.text.trim() || toneHi.text === "Let's reduce your borrowing cost.") {
    errors.push("Hindi tone localisation must provide catalogue lines for BT");
  }

  const toneMrPartner = localiseEaiToneLines({
    categoryId: "balance_transfer",
    audience: "partner",
    language: "mr",
    englishLines: ["BT opportunity identified."],
  });
  if (toneMrPartner.notes.includes("fallback_english_missing_local_catalogue")) {
    errors.push("Partner Marathi BT tone catalogue missing");
  }

  const enOutside = await runEaiSarathiConversationTurn({
    utterance: "Tell me a joke about politics",
    personaPackId: "sarathi_customer",
    languagePreference: "en",
  });
  if (!enOutside.blocked || !isEaiOutsideDomainRefusalEquivalent(enOutside.facingText)) {
    errors.push("English outside-domain must remain fixed refusal meaning");
  }
  if (enOutside.facingText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("English facing refusal must stay canonical sentence");
  }

  const hiOutside = await runEaiSarathiConversationTurn({
    utterance: "मुझे क्रिकेट जोक्स सुनाओ",
    personaPackId: "sarathi_customer",
    languagePreference: "hi",
  });
  if (!hiOutside.blocked || !isEaiOutsideDomainRefusalEquivalent(hiOutside.facingText)) {
    errors.push("Hindi outside-domain must return localised identical-meaning refusal");
  }
  if (hiOutside.facingText !== getEaiOutsideDomainRefusalLocalised("hi")) {
    errors.push("Hindi facing refusal must use curated localisation");
  }

  const ctx = buildEaiMultilingualTurnContext({
    utterance: "Mujhe Balance Transfer chahiye EMI kam karni hai",
    explicitPreference: "hi",
  });
  if (!/Balance Transfer|EMI/i.test(ctx.canonicalUtterance)) {
    errors.push("Mixed-language context must enrich canonical utterance");
  }

  const btHi = await runEaiSarathiConversationTurn({
    utterance: "Mujhe Balance Transfer chahiye",
    personaPackId: "sarathi_customer",
    languagePreference: "hi",
  });
  if (btHi.blocked) {
    errors.push("Hinglish BT must remain in-domain after translation layer");
  }
  if (btHi.continuity.preferredLanguage !== "hi") {
    errors.push("Continuity must store preferred language");
  }

  const mrDocs = await runEaiSarathiConversationTurn({
    utterance: "Home loan documents checklist",
    personaPackId: "sarathi_customer",
    languagePreference: "mr",
  });
  if (mrDocs.blocked) errors.push("Marathi preference must not block in-domain EN utterance");
  if (mrDocs.continuity.preferredLanguage !== "mr") {
    errors.push("Marathi preference must persist on continuity");
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      multilingualEngineVersion: EAI_MULTILINGUAL_ENGINE_VERSION,
      languages: [...EAI_SUPPORTED_LANGUAGES],
      meaningKey: EAI_OUTSIDE_DOMAIN_REFUSAL_MEANING_KEY,
      enOutside: enOutside.facingText,
      hiOutside: hiOutside.facingText,
      btFacingPreview: btHi.facingText.slice(0, 120),
      mrPreferred: mrDocs.continuity.preferredLanguage,
      mixedCanonicalPreview: ctx.canonicalUtterance.slice(0, 120),
    },
  };
}
