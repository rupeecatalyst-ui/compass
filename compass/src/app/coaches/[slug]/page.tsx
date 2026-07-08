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
  return {
    title: coach.title,
    description: coach.subheadline,
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
