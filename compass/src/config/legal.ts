import { siteConfig } from "@/config/site";

export const legalContent = {
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "29 August 2026",
    sections: [
      {
        heading: "Introduction",
        body: `Rupee Catalyst ("we", "us", "our") operates the COMPASS customer platform. ${siteConfig.legalOperatorStatement} This Privacy Policy explains how we collect, use, store and protect personal information when you use our website and application journeys.`,
      },
      {
        heading: "Information we collect",
        body: `When you use COMPASS, we may collect: your name, mobile number, email address, city, loan requirements, employment and income information, property or business details you choose to share, documents you upload, and technical information such as browser type and session identifiers. We collect this information only when you voluntarily provide it through our journeys or contact channels.`,
      },
      {
        heading: "How we use your information",
        body: `We use your information to: understand your borrowing or investment requirements; provide guidance and recommendations through our enterprise systems; prepare and process loan applications; communicate with you about your request; coordinate with suitable financial institutions after you provide consent; improve our services; and comply with applicable law.`,
      },
      {
        heading: "Mobile number and OTP",
        body: `When you provide your mobile number, we may use it to identify your profile, send one-time passwords when OTP verification is enabled, and contact you regarding your application. By providing your mobile number, you consent to being contacted by Rupee Catalyst for application-related communication.`,
      },
      {
        heading: "Sharing with financial institutions",
        body: `We do not share your personal information with banks, NBFCs or other financial institutions without your consent, except where required by law. When you proceed with a lender recommendation and provide consent, we may share relevant application information necessary to evaluate your request.`,
      },
      {
        heading: "Document upload",
        body: `Documents you upload through COMPASS are stored in our enterprise document repository and used solely for processing your application, verification and lender submission where applicable. Please upload only documents that belong to you or that you are authorised to share.`,
      },
      {
        heading: "Data retention",
        body: `We retain your information for as long as necessary to fulfil the purposes described in this policy, manage your application, meet legal obligations, and resolve disputes.`,
      },
      {
        heading: "Your rights",
        body: `You may request access to, correction of, or deletion of your personal information by contacting us at ${siteConfig.contactEmail}. We will respond within a reasonable timeframe subject to applicable law.`,
      },
      {
        heading: "Contact",
        body: `For privacy-related queries, contact us at ${siteConfig.contactEmail} or ${siteConfig.contactPhone}. Office: ${siteConfig.officeAddress}.`,
      },
    ],
  },
  terms: {
    title: "Terms and Conditions",
    lastUpdated: "29 August 2026",
    sections: [
      {
        heading: "Acceptance",
        body: `By accessing or using COMPASS, you agree to these Terms and Conditions. If you do not agree, please do not use the platform.`,
      },
      {
        heading: "Nature of service",
        body: `COMPASS is a customer-facing platform operated by Rupee Catalyst. ${siteConfig.legalOperatorStatement} We provide financial guidance, application facilitation and document collection services. We are not a bank, NBFC, HFC or lender. Loan approval, rates, terms and disbursement decisions are made solely by the relevant financial institution.`,
      },
      {
        heading: "Indicative information",
        body: `Interest rates, EMI estimates, eligibility indicators, lender recommendations and COMPASS Advantage amounts displayed on COMPASS are indicative and subject to verification, credit assessment and the policies of the relevant lender. Nothing on COMPASS constitutes a guarantee of approval, pricing or disbursement.`,
      },
      {
        heading: "Your responsibilities",
        body: `You agree to provide accurate and complete information. You are responsible for the documents you upload and for reviewing your application before final submission.`,
      },
      {
        heading: "Intellectual property",
        body: `All content, branding, design and software on COMPASS are owned by Rupee Catalyst or its licensors. You may not copy, modify or distribute our materials without written permission.`,
      },
      {
        heading: "Limitation of liability",
        body: `To the fullest extent permitted by law, Rupee Catalyst shall not be liable for any indirect, incidental or consequential damages arising from your use of COMPASS or reliance on indicative information provided through the platform.`,
      },
      {
        heading: "Governing law",
        body: `These terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.`,
      },
      {
        heading: "Contact",
        body: `Questions about these terms: ${siteConfig.contactEmail} · ${siteConfig.contactPhone}. Office: ${siteConfig.officeAddress}.`,
      },
    ],
  },
  disclaimer: {
    title: "Disclaimer",
    lastUpdated: "29 August 2026",
    sections: [
      {
        heading: "General",
        body: `The information on COMPASS is provided for general guidance only. It does not constitute financial, legal or tax advice. You should seek independent professional advice before making financial decisions.`,
      },
      {
        heading: "No guarantee",
        body: `Rupee Catalyst does not guarantee loan approval, specific interest rates, COMPASS Advantage amounts, processing timelines or lender outcomes. ${siteConfig.legalOperatorStatement} ${siteConfig.notALenderDisclosure}`,
      },
      {
        heading: "Lender relationships",
        body: `References to banks, NBFCs or other institutions on our website describe our lending ecosystem and relationships. They do not represent a personalised recommendation unless explicitly presented as such after your application analysis through our enterprise systems.`,
      },
      {
        heading: "Illustrative content",
        body: `Examples, sample lender cards labelled as illustrative, and educational document checklists are for explanation only. They are not personalised recommendations or binding document requirements.`,
      },
      {
        heading: "Third-party links",
        body: `COMPASS may link to external websites. We are not responsible for the content or practices of third-party sites.`,
      },
      {
        heading: "Grievance / contact",
        body: `For concerns or grievances, contact Rupee Catalyst at ${siteConfig.contactEmail} or ${siteConfig.contactPhone}. Office: ${siteConfig.officeAddress}.`,
      },
    ],
  },
} as const;

/** Journey submission consent — shown on review step before final submit. */
export const journeyConsent = {
  privacy:
    "I agree to the Privacy Policy and consent to Rupee Catalyst processing my information for this application.",
  lenderShare:
    "I consent to sharing relevant application information with financial institutions where I choose to proceed.",
  declarations:
    "I confirm the information provided is accurate and I accept the Terms and Conditions and Disclaimer.",
} as const;
