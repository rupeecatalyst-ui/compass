import { AuthGuard } from "@/components/auth/auth-guard";
import { ROLES } from "@/constants/roles";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={[ROLES.SUPER_ADMIN]}>{children}</AuthGuard>;
}
