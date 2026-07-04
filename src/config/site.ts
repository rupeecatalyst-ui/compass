import { env } from "@/config/env";

export const siteConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  description: "Financial Operating System by Rupee Catalyst",
  url: env.NEXT_PUBLIC_APP_URL,
  company: "Rupee Catalyst",
  version: "0.1.0",
} as const;
