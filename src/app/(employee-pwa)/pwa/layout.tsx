import { EmployeePwaShell } from "@/components/catalyst-one/employee-pwa/employee-pwa-shell";

export default function EmployeePwaLayout({ children }: { children: React.ReactNode }) {
  return <EmployeePwaShell>{children}</EmployeePwaShell>;
}
