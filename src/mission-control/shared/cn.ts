import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Local cn helper — Mission Control stays decoupled from app utils where practical. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
