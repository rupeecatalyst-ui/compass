import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CoachLandingContent } from "@/components/pages/coach-landing-content";
import { coaches, getCoach } from "@/config/coaching";
import { PRODUCT_ROUTE_BY_COACH_SLUG } from "@/constants/routes";

interface CoachPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return coaches.map((coach) => ({ slug: coach.slug }));
}

export async function generateMetadata({ params }: CoachPageProps): Promise<Metadata> {
  const { slug } = await params;
  const coach = getCoach(slug);
  if (!coach) return { title: "Coach" };
  const path = `/coaches/${coach.slug}`;
  return {
    title: coach.title,
    description: coach.subheadline,
    alternates: { canonical: path },
    openGraph: {
      title: `${coach.title} | COMPASS`,
      description: coach.subheadline,
      url: path,
    },
  };
}

export default async function CoachPage({ params }: CoachPageProps) {
  const { slug } = await params;

  const productRoute = PRODUCT_ROUTE_BY_COACH_SLUG[slug];
  if (productRoute) {
    redirect(productRoute);
  }

  const coach = getCoach(slug);
  if (!coach) notFound();

  return <CoachLandingContent coach={coach} />;
}
