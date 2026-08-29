import type { MetadataRoute } from "next";
import { pwaConfig, PWA_ICON_SIZES } from "@/config/pwa";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  const base = siteConfig.url.replace(/\/$/, "");

  return {
    id: `${base}/`,
    name: pwaConfig.name,
    short_name: pwaConfig.shortName,
    description: pwaConfig.description,
    start_url: pwaConfig.startUrl,
    scope: "/",
    display: pwaConfig.display,
    orientation: pwaConfig.orientation,
    theme_color: pwaConfig.themeColor,
    background_color: pwaConfig.backgroundColor,
    lang: "en-IN",
    dir: "ltr",
    categories: ["finance", "business"],
    icons: [
      ...PWA_ICON_SIZES.map((size) => ({
        src: `${pwaConfig.iconBasePath}/icon-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any" as const,
      })),
      {
        src: `${pwaConfig.iconBasePath}/icon-512x512-maskable.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
