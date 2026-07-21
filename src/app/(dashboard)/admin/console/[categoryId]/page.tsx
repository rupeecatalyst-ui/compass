import { notFound } from "next/navigation";
import { AdministrationCategoryWorkspace } from "@/components/catalyst-one/administration-console";
import { getAdministrationCategory } from "@/constants/administration-console";

interface AdministrationCategoryPageProps {
  params: Promise<{ categoryId: string }>;
}

export default async function AdministrationCategoryPage({
  params,
}: AdministrationCategoryPageProps) {
  const { categoryId } = await params;
  const category = getAdministrationCategory(categoryId);
  if (!category) notFound();
  return <AdministrationCategoryWorkspace category={category} />;
}
