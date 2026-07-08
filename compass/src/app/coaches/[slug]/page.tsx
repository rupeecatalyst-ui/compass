import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CoachLandingContent } from "@/components/pages/coach-landing-content";
import { coaches, getCoach } from "@/config/coaching";
import { ROUTES } from "@/constants/routes";

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

  if (slug === "home-loan") {
    redirect(ROUTES.HOME_LOAN);
  }

  const coach = getCoach(slug);
  if (!coach) notFound();

  return <CoachLandingContent coach={coach} />;
}
