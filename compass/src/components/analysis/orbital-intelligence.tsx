import "./orbital-intelligence.css";

/**
 * Option 7 — Orbital Intelligence.
 * Approved COMPASS analysis animation for every loan product that reaches analysis.
 * Product calculations and messages stay outside this component.
 */
export function OrbitalIntelligence() {
  return (
    <div className="orbital-intelligence" aria-hidden>
      <svg viewBox="0 0 320 320" fill="none">
        <defs>
          <filter id="orbital-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="orbital-spin">
          <g transform="rotate(-32 160 160)">
            <ellipse cx="160" cy="160" rx="124" ry="48" stroke="rgba(45,212,191,0.45)" strokeWidth="1" />
            <circle cx="284" cy="160" r="4.5" fill="rgb(45 212 191)" filter="url(#orbital-glow)" />
          </g>
        </g>

        <g className="orbital-spin-reverse">
          <g transform="rotate(38 160 160)">
            <ellipse cx="160" cy="160" rx="108" ry="40" stroke="rgba(94,234,212,0.32)" strokeWidth="1" />
            <circle cx="52" cy="160" r="3.5" fill="rgb(153 246 228)" filter="url(#orbital-glow)" />
          </g>
        </g>

        <g className="orbital-spin-slow">
          <circle cx="160" cy="160" r="86" stroke="rgba(45,212,191,0.22)" strokeWidth="1" strokeDasharray="2 7" />
          <circle cx="246" cy="160" r="3" fill="rgb(45 212 191)" opacity="0.9" filter="url(#orbital-glow)" />
        </g>
      </svg>

      <div className="orbital-core">
        <svg viewBox="0 0 80 80" className="h-14 w-14" fill="none">
          <circle cx="40" cy="40" r="30" stroke="rgba(45,212,191,0.35)" strokeWidth="1" />
          <path d="M40 14 L45 40 L40 36 L35 40 Z" fill="rgb(45 212 191)" />
          <path d="M40 66 L45 40 L40 44 L35 40 Z" fill="rgba(255,255,255,0.16)" />
          <circle cx="40" cy="40" r="4.5" fill="#06080d" stroke="rgb(45 212 191)" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}
