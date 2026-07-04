/** Shared animation presets for Framer Motion */
export const ANIMATION = {
  spring: {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
  },
  smooth: {
    type: "tween" as const,
    duration: 0.2,
    ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
  page: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
  sidebar: {
    expanded: { width: 260 },
    collapsed: { width: 72 },
    transition: { type: "spring", stiffness: 400, damping: 35 },
  },
  cardHover: {
    rest: { scale: 1, y: 0 },
    hover: { scale: 1.01, y: -2 },
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 },
  },
  slideInLeft: {
    initial: { opacity: 0, x: -16 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.25 },
  },
  stagger: {
    animate: {
      transition: { staggerChildren: 0.05 },
    },
  },
} as const;

export const STORAGE_KEYS = {
  SIDEBAR_COLLAPSED: "compass:sidebar-collapsed",
  RECENT_PAGES: "compass:recent-pages",
  FAVORITES: "compass:favorites",
  WORKSPACE: "compass:workspace",
} as const;
