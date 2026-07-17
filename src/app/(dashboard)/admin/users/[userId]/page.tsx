import { EnterpriseUserWorkspace } from "@/components/catalyst-one/enterprise-user-management";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      <EnterpriseUserWorkspace key={userId} userId={userId} />
    </div>
  );
}
