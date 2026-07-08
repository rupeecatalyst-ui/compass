import Image from "next/image";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/logo.asset.json";

interface RupeeCatalystLogoProps {
  className?: string;
  size?: number;
}

export function RupeeCatalystLogo({ className, size = 28 }: RupeeCatalystLogoProps) {
  return (
    <Image
      src={logoAsset.url}
      alt="Rupee Catalyst"
      width={size}
      height={size}
      className={cn("rounded-sm", className)}
      priority
    />
  );
}

