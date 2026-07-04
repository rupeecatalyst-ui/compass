export { ANIMATION } from "@/constants/animations";

import { type Variants } from "framer-motion";

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export const sidebarVariants: Variants = {
  expanded: { width: 260 },
  collapsed: { width: 72 },
};

export const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.01, y: -2 },
};

export const buttonTap = { scale: 0.98 };
export const buttonHover = { scale: 1.02 };

export const defaultTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export const smoothTransition = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};
