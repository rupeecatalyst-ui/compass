import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { ROUTES } from "@/constants/routes";

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
    ROUTES.BUSINESS_LOAN,
    ROUTES.LOAN_AGAINST_PROPERTY,
    ROUTES.WORKING_CAPITAL,
    ROUTES.CONSTRUCTION_FINANCE,
    ROUTES.LOAN_PRODUCTS,
    ROUTES.ABOUT,
    ROUTES.CONTACT,
    ROUTES.PRIVACY,
    ROUTES.TERMS,
    ROUTES.DISCLAIMER,
    ROUTES.RESOURCES,
  ].map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority:
      path === "/" || path === ROUTES.BORROW || path === ROUTES.INVEST || path === ROUTES.HOME_LOAN
        ? 1
        : 0.7,
  }));

  return staticRoutes;
}
