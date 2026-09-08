/**
 * Remote web push stays disabled unless a real VAPID/provider configuration exists.
 * Missing keys must never be presented as live push.
 */

export function isEmployeePwaRemotePushConfigured(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  const provider = process.env.NEXT_PUBLIC_WEB_PUSH_PROVIDER?.trim();
  return Boolean(publicKey && provider);
}

export function employeePwaPushStatus(): {
  remotePushEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  configurationRequired: boolean;
} {
  const remotePushEnabled = isEmployeePwaRemotePushConfigured();
  return {
    remotePushEnabled,
    inAppNotificationsEnabled: true,
    configurationRequired: !remotePushEnabled,
  };
}
