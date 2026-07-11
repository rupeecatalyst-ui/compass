/**
 * EIAE authentication provider and policy constants.
 */

import { EIAE_PERSONA_CODES } from "./personas";
import type {
  EiaeAuthenticationPolicyDefinition,
  EiaeAuthenticationProviderDefinition,
} from "@/types/enterprise-identity-access-engine";

export const EIAE_AUTH_PROVIDER_CODES = {
  MOBILE_OTP: "mobile_otp",
  EMAIL_OTP: "email_otp",
  PASSWORD: "password",
} as const;

export const EIAE_AUTH_POLICY_LEVELS = {
  GLOBAL: "global",
  BUSINESS_UNIT: "business_unit",
  PERSONA: "persona",
  INDIVIDUAL: "individual",
} as const;

export const EIAE_DEFAULT_AUTH_PROVIDERS: EiaeAuthenticationProviderDefinition[] = [
  { id: "eiae-auth-mobile-otp", providerCode: EIAE_AUTH_PROVIDER_CODES.MOBILE_OTP, label: "Mobile OTP", description: "One-time password via mobile.", providerType: "otp_mobile", enabled: true, sortOrder: 1 },
  { id: "eiae-auth-email-otp", providerCode: EIAE_AUTH_PROVIDER_CODES.EMAIL_OTP, label: "Email OTP", description: "One-time password via email.", providerType: "otp_email", enabled: true, sortOrder: 2 },
  { id: "eiae-auth-password", providerCode: EIAE_AUTH_PROVIDER_CODES.PASSWORD, label: "Password", description: "Password-based authentication.", providerType: "password", enabled: true, sortOrder: 3 },
];

/** Hierarchical policy seed — global → business unit → persona → individual. */
export const EIAE_DEFAULT_AUTH_POLICIES: EiaeAuthenticationPolicyDefinition[] = [
  {
    id: "eiae-policy-global",
    policyLevel: "global",
    scopeRef: "*",
    label: "Global Authentication Policy",
    description: "Platform-wide default authentication providers.",
    providerCodes: [EIAE_AUTH_PROVIDER_CODES.MOBILE_OTP, EIAE_AUTH_PROVIDER_CODES.EMAIL_OTP, EIAE_AUTH_PROVIDER_CODES.PASSWORD],
    precedence: 1,
    enabled: true,
  },
  {
    id: "eiae-policy-persona-customer",
    policyLevel: "persona",
    scopeRef: EIAE_PERSONA_CODES.CUSTOMER,
    label: "Customer Persona Policy",
    description: "Customer-specific authentication override.",
    providerCodes: [EIAE_AUTH_PROVIDER_CODES.MOBILE_OTP, EIAE_AUTH_PROVIDER_CODES.EMAIL_OTP],
    precedence: 10,
    enabled: true,
  },
  {
    id: "eiae-policy-persona-super-admin",
    policyLevel: "persona",
    scopeRef: EIAE_PERSONA_CODES.SUPER_ADMIN,
    label: "Super Admin Persona Policy",
    description: "Super admin authentication requirements.",
    providerCodes: [EIAE_AUTH_PROVIDER_CODES.PASSWORD, EIAE_AUTH_PROVIDER_CODES.EMAIL_OTP],
    precedence: 10,
    enabled: true,
  },
];
