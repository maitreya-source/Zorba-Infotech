import React from "react";

interface ZorbaLogoProps {
  className?: string;
  size?: number | string;
  variant?: "icon" | "full" | "monochrome";
  showSubtitle?: boolean;
}

/**
 * Reusable high-resolution vector SVG Logo for Zorba Infotech
 * Features:
 * - Vertically elongated arch dome container (ry=95 taller contour)
 * - Color variant: Red & Green dots + Vibrant Orange Circle 'O' + White Z & RBA
 * - Monochrome variant (for thermal print/B&W): Solid Grey round dots & 'O' + White Z & RBA on Black Dome
 */
export function ZorbaLogoIcon({ className = "h-9 w-9", isMonochrome = false }: { className?: string; isMonochrome?: boolean }) {
  return (
    <svg
      viewBox="0 0 180 130"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Zorba Logo Icon"
    >
      <defs>
        {/* Background Dark Arch Gradient */}
        <linearGradient id="zorbaArchGrad" x1="90" y1="0" x2="90" y2="130" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isMonochrome ? "#000000" : "#0B0F19"} />
          <stop offset="100%" stopColor={isMonochrome ? "#000000" : "#1E293B"} />
        </linearGradient>

        {/* Solid Full Orange Circle Gradient */}
        <radialGradient id="solidOrangeGrad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(63, 92) scale(11)">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EA580C" />
        </radialGradient>

        {/* Red Indicator Dot Gradient */}
        <radialGradient id="redDotGrad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(72, 50) scale(9)">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="100%" stopColor="#DC2626" />
        </radialGradient>

        {/* Green Indicator Dot Gradient */}
        <radialGradient id="greenDotGrad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(108, 50) scale(9)">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#16A34A" />
        </radialGradient>
      </defs>

      {/* Taller Vertically Elongated Arch Dome Container Shape (rx=80, ry=95) */}
      <path
        d="M 10 118 A 80 95 0 0 1 170 118 Z"
        fill="url(#zorbaArchGrad)"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Inner Subtle Rim Accent */}
      <path
        d="M 15 116 A 75 90 0 0 1 165 116"
        fill="none"
        stroke={isMonochrome ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.22)"}
        strokeWidth="1.5"
      />

      {/* 2 Indicator Dots: Solid Grey (#64748B) in Monochrome mode, Red/Green in Color mode */}
      <circle cx="72" cy="52" r="8.5" fill={isMonochrome ? "#64748B" : "url(#redDotGrad)"} stroke={isMonochrome ? "#475569" : "#7F1D1D"} strokeWidth="1" />
      {!isMonochrome && <circle cx="70" cy="50" r="2.5" fill="#FFFFFF" opacity="0.7" />}

      <circle cx="108" cy="52" r="8.5" fill={isMonochrome ? "#64748B" : "url(#greenDotGrad)"} stroke={isMonochrome ? "#475569" : "#14532D"} strokeWidth="1" />
      {!isMonochrome && <circle cx="106" cy="50" r="2.5" fill="#FFFFFF" opacity="0.7" />}

      {/* Perfectly Balanced Typography Baseline (y=104) */}
      <g
        fill="#FFFFFF"
        fontFamily="Arial Black, Impact, 'Trebuchet MS', system-ui, sans-serif"
        fontWeight="900"
        fontSize="31"
      >
        {/* White Letter Z */}
        <text x="36" y="104" textAnchor="middle">Z</text>

        {/* Round 'O': Solid Grey (#64748B) in Monochrome mode, Orange in Color mode */}
        <circle
          cx="63"
          cy="93.5"
          r="11"
          fill={isMonochrome ? "#64748B" : "url(#solidOrangeGrad)"}
          stroke={isMonochrome ? "#475569" : "#EA580C"}
          strokeWidth="0.5"
        />

        {/* White Letter R */}
        <text x="90" y="104" textAnchor="middle">R</text>

        {/* White Letter B */}
        <text x="117" y="104" textAnchor="middle">B</text>

        {/* White Letter A */}
        <text x="144" y="104" textAnchor="middle">A</text>
      </g>
    </svg>
  );
}

export default function ZorbaLogo({
  className = "h-9 w-auto",
  variant = "full",
  showSubtitle = false,
}: ZorbaLogoProps) {
  if (variant === "icon") {
    return <ZorbaLogoIcon className={className} />;
  }

  if (variant === "monochrome") {
    return <ZorbaLogoIcon className={className} isMonochrome={true} />;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <ZorbaLogoIcon className="h-9 w-9 shrink-0 drop-shadow-md" />
      <div className="flex flex-col leading-none">
        <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
          ZORBA
        </span>
        {showSubtitle ? (
          <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mt-0.5">
            INFOTECH
          </span>
        ) : (
          <span className="text-[11px] font-bold text-primary tracking-wide">
            Infotech
          </span>
        )}
      </div>
    </div>
  );
}
