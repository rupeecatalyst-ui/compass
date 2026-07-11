import type { MetadataRoute } from "next";
import { coaches, tools } from "@/config/coaching";
import { siteConfig } from "@/config/site";
import { ROUTES, coachRoute, toolRoute } from "@/constants/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();

  const staticRoutes = [
    ROUTES.HOME,
    ROUTES.GET_STARTED,
    ROUTES.BORROW,
    ROUTES.INVEST,
    ROUTES.HOME_LOAN,
    ROUTES.PERSONAL_LOAN,
    ROUTES.LOAN_PRODUCTS,
    ROUTES.ABOUT,
    ROUTES.CONTACT,
    ROUTES.RESOURCES,
    ROUTES.COACHES,
    ROUTES.TOOLS,
  ].map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "/" || path === ROUTES.BORROW || path === ROUTES.INVEST ? 1 : 0.7,
  }));

  const coachRoutes = coaches
    .filter((coach) => coach.slug !== "home-loan")
    .map((coach) => ({
      url: `${base}${coachRoute(coach.slug)}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  const toolRoutes = tools.map((tool) => ({
    url: `${base}${toolRoute(tool.slug)}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...coachRoutes, ...toolRoutes];
}
