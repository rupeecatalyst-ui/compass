import { cn } from "@/lib/utils";
import {
  RUPEE_CATALYST_OFFICIAL_LOGO_ALT,
  RUPEE_CATALYST_OFFICIAL_LOGO_SRC,
} from "@/constants/rupee-catalyst-brand";

interface RupeeCatalystLogoProps {
  className?: string;
  size?: number;
}

export function RupeeCatalystLogo({ className, size = 28 }: RupeeCatalystLogoProps) {
  const height = Math.max(16, size);
  return (
    // Official raster mark — do not replace with a letterform or recolour.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={RUPEE_CATALYST_OFFICIAL_LOGO_SRC}
      alt={RUPEE_CATALYST_OFFICIAL_LOGO_ALT}
      height={height}
      draggable={false}
      className={cn("w-auto object-contain object-left", className)}
      style={{ height, width: "auto" }}
    />
  );
}
