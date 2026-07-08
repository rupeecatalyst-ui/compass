import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolDetailContent } from "@/components/pages/tool-detail-content";
import { getTool, tools } from "@/config/coaching";

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return { title: "Tool" };
  const path = `/tools/${tool.slug}`;
  return {
    title: tool.title,
    description: tool.description,
    alternates: { canonical: path },
    openGraph: {
      title: `${tool.title} | COMPASS`,
      description: tool.description,
      url: path,
    },
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  return <ToolDetailContent tool={tool} />;
}
