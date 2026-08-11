/**
 * Multilingual Intelligence Engine constants (CO-AI-114 / Sprint AI-14).
 * Curated localisation catalogues — behaviour engines stay language-agnostic.
 */

import type { EaiLanguageCode } from "@/types/enterprise-ai-multilingual";
import type { EaiToneCategoryId } from "@/types/enterprise-ai-domain-governance";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "./domain-governance";

export const EAI_MULTILINGUAL_ENGINE_VERSION = "1.0.0-ai14";

export const EAI_SUPPORTED_LANGUAGES: readonly EaiLanguageCode[] = [
  "en",
  "hi",
  "mr",
] as const;

export function isEaiLanguageSupported(
  code: string | undefined | null,
): code is EaiLanguageCode {
  return code === "en" || code === "hi" || code === "mr";
}

/**
 * Semantic identity key for outside-domain refusal.
 * Localised strings must keep identical meaning across en / hi / mr.
 */
export const EAI_OUTSIDE_DOMAIN_REFUSAL_MEANING_KEY =
  "outside_domain.not_trained_for_subject" as const;

/**
 * Domain Boundary localisation — identical meaning, curated translations.
 * English remains the platform canonical SSOT (`EAI_OUTSIDE_DOMAIN_REFUSAL`).
 */
export const EAI_OUTSIDE_DOMAIN_REFUSAL_BY_LANGUAGE: Record<
  EaiLanguageCode,
  string
> = {
  en: EAI_OUTSIDE_DOMAIN_REFUSAL,
  hi: "मैं इस विषय के लिए प्रशिक्षित नहीं हूँ।",
  mr: "मी या विषयासाठी प्रशिक्षित नाही.",
};

/** All allowed facing refusal strings (any language). */
export const EAI_OUTSIDE_DOMAIN_REFUSAL_VARIANTS: readonly string[] = [
  EAI_OUTSIDE_DOMAIN_REFUSAL_BY_LANGUAGE.en,
  EAI_OUTSIDE_DOMAIN_REFUSAL_BY_LANGUAGE.hi,
  EAI_OUTSIDE_DOMAIN_REFUSAL_BY_LANGUAGE.mr,
];

/** Customer Tone Library — localised lines (same category order / behaviour). */
export const EAI_TONE_LIBRARY_LOCALISED: Record<
  EaiLanguageCode,
  Partial<Record<EaiToneCategoryId, readonly string[]>>
> = {
  en: {},
  hi: {
    home_loan: ["घर खरीदना महत्वपूर्ण है।", "आइए आपके विकल्प देखें।"],
    balance_transfer: ["आइए आपकी उधारी लागत कम करें।"],
    loan_against_property: ["आइए आपके व्यवसाय की वृद्धि का समर्थन करें।"],
    business_loan: ["आइए आपके व्यवसाय की वित्त व्यवस्था बढ़ाएँ।"],
    working_capital: ["आइए आपके नकदी प्रवाह को मजबूत करें।"],
    personal_loan: ["आइए पर्सनल लोन विकल्प देखें।"],
    eligibility: ["मुझे कुछ विवरण जाँचने दें।"],
    documents: ["एक दस्तावेज़ शेष है।"],
    waiting: ["आपकी सिफारिश तैयार हो रही है।"],
    recommendation: ["यह स्पष्ट अगला कदम है।"],
    completion: ["आपका विश्लेषण तैयार है।"],
  },
  mr: {
    home_loan: ["घर खरेदी करणे महत्त्वाचे आहे.", "चला तुमचे पर्याय पाहू."],
    balance_transfer: ["चला तुमचा कर्ज खर्च कमी करू."],
    loan_against_property: ["चला तुमच्या व्यवसायाच्या वाढीस मदत करू."],
    business_loan: ["चला तुमच्या व्यवसायाचे वित्त मजबूत करू."],
    working_capital: ["चला तुमचा रोख प्रवाह मजबूत करू."],
    personal_loan: ["चला वैयक्तिक कर्ज पर्याय पाहू."],
    eligibility: ["मला काही तपशील तपासू द्या."],
    documents: ["एक कागदपत्र बाकी आहे."],
    waiting: ["तुमची शिफारस तयार होत आहे."],
    recommendation: ["हा स्पष्ट पुढचा टप्पा आहे."],
    completion: ["तुमचे विश्लेषण तयार आहे."],
  },
};

/** Partner Tone Library — localised (professional / advisory). */
export const EAI_PARTNER_TONE_LIBRARY_LOCALISED: Record<
  EaiLanguageCode,
  Partial<Record<EaiToneCategoryId, readonly string[]>>
> = {
  en: {},
  hi: {
    home_loan: ["होम लोन ब्रीफिंग तैयार है।", "अगला: केस पैरामीटर समीक्षा।"],
    balance_transfer: ["बीटी अवसर पहचाना गया।", "बकाया और ईएमआई पुष्टि करें।"],
    loan_against_property: ["एलएपी केस संरचना समीक्षा आवश्यक है।"],
    business_loan: ["व्यवसाय वित्त केस दर्ज।"],
    working_capital: ["कार्यशील पूंजी ब्रीफ तैयार।"],
    personal_loan: ["पर्सनल लोन पैरामीटर समीक्षाधीन।"],
    eligibility: ["पात्रता इनपुट आवश्यक।"],
    documents: ["दस्तावेज़ चेकलिस्ट अधूरी।"],
    waiting: ["पार्टनर सिफारिश तैयार हो रही है।"],
    recommendation: ["अनुशंसित पार्टनर अगला कदम।"],
    completion: ["पार्टनर विश्लेषण पूर्ण।"],
  },
  mr: {
    home_loan: ["गृहकर्ज ब्रीफिंग तयार आहे.", "पुढे: केस पॅरामीटर तपासा."],
    balance_transfer: ["बीटी संधी ओळखली.", "थकबाकी आणि ईएमआय पुष्टी करा."],
    loan_against_property: ["एलएपी केस रचना तपासणी आवश्यक."],
    business_loan: ["व्यवसाय वित्त केस नोंद."],
    working_capital: ["कार्यरत भांडवल ब्रीफ तयार."],
    personal_loan: ["वैयक्तिक कर्ज पॅरामीटर तपासणीत."],
    eligibility: ["पात्रता इनपुट आवश्यक."],
    documents: ["कागदपत्र यादी अपूर्ण."],
    waiting: ["पार्टनर शिफारस तयार होत आहे."],
    recommendation: ["शिफारस केलेली पार्टनर पुढची पायरी."],
    completion: ["पार्टनर विश्लेषण पूर्ण."],
  },
};

/**
 * Phrase map → canonical English for Domain Boundary / engines.
 * Enables Hindi / Marathi / mixed utterances without changing engine logic.
 */
export const EAI_CANONICAL_PHRASE_MAP: readonly {
  pattern: RegExp;
  english: string;
  languages: readonly EaiLanguageCode[];
}[] = [
  {
    pattern: /बैलेंस\s*ट्रांसफर|बॅलन्स\s*ट्रान्सफर|बैलन्स\s*ट्रान्सफर/i,
    english: "Balance Transfer",
    languages: ["hi", "mr"],
  },
  {
    pattern: /होम\s*लोन|गृह\s*कर्ज|हाउसिंग\s*लोन/i,
    english: "Home loan",
    languages: ["hi", "mr"],
  },
  {
    pattern: /ईएमआई|इएमआई|EMI/i,
    english: "EMI",
    languages: ["hi", "mr", "en"],
  },
  {
    pattern: /दस्तावेज|दस्तावेज़|कागदपत्र|डॉक्यूमेंट/i,
    english: "loan documents checklist",
    languages: ["hi", "mr"],
  },
  {
    pattern: /पात्रता|एलीजिबिलिटी/i,
    english: "loan eligibility",
    languages: ["hi", "mr"],
  },
  {
    pattern: /पर्सनल\s*लोन|वैयक्तिक\s*कर्ज/i,
    english: "Personal loan",
    languages: ["hi", "mr"],
  },
  {
    pattern: /बिजनेस\s*लोन|व्यवसाय\s*(लोन|कर्ज)/i,
    english: "Business loan",
    languages: ["hi", "mr"],
  },
  {
    pattern: /क्रिकेट|फुटबॉल|राजनीति|राजकारण|जोक्स?/i,
    english: "cricket politics joke",
    languages: ["hi", "mr"],
  },
  {
    pattern: /\bmujhe\b|\bchahiye\b|\bkya\b|\bhai\b/i,
    english: " ",
    languages: ["hi"],
  },
];

/** Common English facing fragments → localised (response body localisation). */
export const EAI_RESPONSE_PHRASE_LOCALISATION: Record<
  EaiLanguageCode,
  readonly { from: RegExp; to: string }[]
> = {
  en: [],
  hi: [
    { from: /Let me check a few details\.?/gi, to: "मुझे कुछ विवरण जाँचने दें।" },
    {
      from: /Confirm case parameters next\.?/gi,
      to: "अगला: केस पैरामीटर पुष्टि करें।",
    },
    {
      from: /Balance Transfer moves your loan\.?/gi,
      to: "बैलेंस ट्रांसफर आपका लोन स्थानांतरित करता है।",
    },
    {
      from: /Let's reduce your borrowing cost\.?/gi,
      to: "आइए आपकी उधारी लागत कम करें।",
    },
  ],
  mr: [
    { from: /Let me check a few details\.?/gi, to: "मला काही तपशील तपासू द्या." },
    {
      from: /Confirm case parameters next\.?/gi,
      to: "पुढे: केस पॅरामीटर पुष्टी करा.",
    },
    {
      from: /Balance Transfer moves your loan\.?/gi,
      to: "बॅलन्स ट्रान्सफर तुमचे कर्ज हलवते.",
    },
    {
      from: /Let's reduce your borrowing cost\.?/gi,
      to: "चला तुमचा कर्ज खर्च कमी करू.",
    },
  ],
};
