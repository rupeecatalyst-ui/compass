import { AuthGuard } from "@/components/auth/auth-guard";
import { ROLES } from "@/constants/roles";

/** CO-OPS-001 — Super Admin + Admin only. Never expose /admin/* to non-administrators. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>{children}</AuthGuard>
  );
}
