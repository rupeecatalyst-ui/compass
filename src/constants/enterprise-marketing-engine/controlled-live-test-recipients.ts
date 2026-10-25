/**
 * Frozen Product Owner allowlist for isolated live Marketing test_send.
 * Not a domain wildcard. Campaign audiences never read this list.
 */
export const MARKETING_CONTROLLED_LIVE_TEST_RECIPIENTS = [
  "rahulakapoor@gmail.com",
  "rahul@rupeecatalyst.com",
  "rupeecatalyst@gmail.com",
] as const;

export type MarketingControlledLiveTestRecipient =
  (typeof MARKETING_CONTROLLED_LIVE_TEST_RECIPIENTS)[number];

export const MARKETING_CONTROLLED_TEST_SEND_ENV =
  "ENTERPRISE_MARKETING_CONTROLLED_TEST_SEND_ENABLED" as const;
