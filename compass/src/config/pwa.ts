import { siteConfig } from "@/config/site";

/** COMPASS PWA configuration — public-safe constants only. */
export const pwaConfig = {
  name: "COMPASS by Rupee Catalyst",
  shortName: "COMPASS",
  description: siteConfig.description,
  startUrl: "/",
  display: "standalone" as const,
  themeColor: "#06080d",
  backgroundColor: "#06080d",
  orientation: "portrait-primary" as const,
  iconBasePath: "/pwa/icons",
  installPromptCopy:
    "Install COMPASS for easier access to your application and updates.",
  iosInstallSteps: "Tap Share, then Add to Home Screen.",
} as const;

export const PWA_ICON_SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512] as const;

export const PWA_SENSITIVE_PATH_PREFIXES = ["/api/", "/api/journey"] as const;

export const PWA_PUBLIC_OFFLINE_PATHS = [
  "/",
  "/about",
  "/borrow",
  "/contact",
  "/privacy",
  "/terms",
  "/disclaimer",
] as const;
