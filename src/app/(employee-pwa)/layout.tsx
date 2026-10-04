import type { Metadata, Viewport } from "next";
import {
  EMPLOYEE_PWA_APPLE_TOUCH_ICON,
  EMPLOYEE_PWA_DESCRIPTION,
  EMPLOYEE_PWA_MANIFEST_PATH,
  EMPLOYEE_PWA_NAME,
  EMPLOYEE_PWA_THEME_COLOR_DARK,
  EMPLOYEE_PWA_THEME_COLOR_LIGHT,
} from "@/constants/employee-pwa";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: EMPLOYEE_PWA_NAME,
  description: EMPLOYEE_PWA_DESCRIPTION,
  applicationName: EMPLOYEE_PWA_NAME,
  manifest: EMPLOYEE_PWA_MANIFEST_PATH,
  appleWebApp: {
    capable: true,
    title: EMPLOYEE_PWA_NAME,
    statusBarStyle: "default",
  },
  icons: {
    apple: EMPLOYEE_PWA_APPLE_TOUCH_ICON,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: EMPLOYEE_PWA_THEME_COLOR_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: EMPLOYEE_PWA_THEME_COLOR_DARK },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function EmployeePwaRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
