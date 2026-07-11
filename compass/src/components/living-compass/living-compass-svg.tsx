import { LIVING_COMPASS_COLORS } from "./living-compass.constants";

interface LivingCompassSvgProps {
  /** Unique prefix for SVG defs when multiple instances render on one page. */
  instanceId: string;
}

/**
 * Engraved compass face — static geometry only.
 * Needle rotation is applied by the parent motion group.
 */
export function LivingCompassSvg({ instanceId }: LivingCompassSvgProps) {
  const glowId = `${instanceId}-glow`;
  const faceId = `${instanceId}-face`;

  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden className="h-full w-full">
      <defs>
        <radialGradient id={faceId} cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.07)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.02)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glass ring */}
      <circle
        cx="40"
        cy="40"
        r="36"
        stroke={LIVING_COMPASS_COLORS.ring}
        strokeWidth="1"
        fill={`url(#${faceId})`}
      />
      <circle cx="40" cy="40" r="33.5" stroke={LIVING_COMPASS_COLORS.ringInner} strokeWidth="0.75" />

      {/* Degree ring */}
      <circle
        cx="40"
        cy="40"
        r="28"
        stroke="rgba(45, 212, 191, 0.12)"
        strokeWidth="0.75"
        strokeDasharray="2 6"
      />

      {/* Cardinal ticks */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const inner = 30;
        const outer = deg === 0 ? 35 : 33;
        const x1 = 40 + inner * Math.sin(rad);
        const y1 = 40 - inner * Math.cos(rad);
        const x2 = 40 + outer * Math.sin(rad);
        const y2 = 40 - outer * Math.cos(rad);
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={deg === 0 ? LIVING_COMPASS_COLORS.tickMajor : LIVING_COMPASS_COLORS.tick}
            strokeWidth={deg === 0 ? 1.25 : 0.75}
            strokeLinecap="round"
          />
        );
      })}

      {/* Inter-cardinal micro ticks */}
      {[45, 135, 225, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 40 + 31 * Math.sin(rad);
        const y1 = 40 - 31 * Math.cos(rad);
        const x2 = 40 + 33 * Math.sin(rad);
        const y2 = 40 - 33 * Math.cos(rad);
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.5"
            strokeLinecap="round"
          />
        );
      })}

      {/*
        Needle is rendered by LivingCompass — this group is a placeholder anchor.
        The actual needle lives in the motion layer for independent rotation.
      */}
    </svg>
  );
}

interface LivingCompassNeedleProps {
  filterGlow?: boolean;
  glowFilterId: string;
}

/** North / south needle pair — rotates as a single unit. */
export function LivingCompassNeedle({ filterGlow = false, glowFilterId }: LivingCompassNeedleProps) {
  return (
    <g filter={filterGlow ? `url(#${glowFilterId})` : undefined}>
      <path
        d="M40 11 L44.5 40 L40 37 L35.5 40 Z"
        fill={LIVING_COMPASS_COLORS.needleNorth}
        opacity="0.95"
      />
      <path
        d="M40 69 L44.5 40 L40 43 L35.5 40 Z"
        fill={LIVING_COMPASS_COLORS.needleSouth}
      />
      <circle
        cx="40"
        cy="40"
        r="4.25"
        fill={LIVING_COMPASS_COLORS.hub}
        stroke={LIVING_COMPASS_COLORS.hubRing}
        strokeWidth="1.5"
      />
      <circle cx="40" cy="40" r="1.25" fill={LIVING_COMPASS_COLORS.needleNorth} opacity="0.85" />
    </g>
  );
}
