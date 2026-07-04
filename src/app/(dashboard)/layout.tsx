import { DashboardLayout } from "@/layouts/dashboard-layout";

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
