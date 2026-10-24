"use client";

import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  tagline?: string;
  brandName?: string;
  variant?: "saffron" | "ink";
  className?: string;
}

export function Logo({
  size = "md",
  showWordmark = true,
  tagline,
  brandName = "TradingWave",
  variant = "saffron",
  className = "",
}: LogoProps) {
  const iconDimensions = {
    sm: { width: 28, height: 28, radius: 7 },
    md: { width: 36, height: 36, radius: 9 },
    lg: { width: 48, height: 48, radius: 12 },
  }[size];

  const textSize = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Saffron Orange Squircle Crest Icon with Rising Wave Arrow */}
      <svg
        width={iconDimensions.width}
        height={iconDimensions.height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 drop-shadow-sm"
      >
        {/* Rounded squircle background in saffron orange */}
        <rect
          width="100"
          height="100"
          rx="24"
          fill={variant === "saffron" ? "#FF7722" : "#12141C"}
        />

        {/* W Wave Path with Ascending Arrowhead */}
        <path
          d="M22 36 C23 52, 28 66, 36 66 C42 66, 46 48, 51 48 C56 48, 60 66, 66 66 C72 66, 76 52, 79 38"
          stroke="#FFFFFF"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrowhead on the right surging arm */}
        <path
          d="M68 32 L81 32 L81 45"
          stroke="#FFFFFF"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <div className="flex flex-col justify-center leading-tight">
          <div className={`font-black tracking-tight ${textSize}`}>
            <span className="text-[var(--text)] transition-colors">Trading</span>
            <span className="text-[#FF7722]">Wave</span>
          </div>
          {tagline && (
            <span className="text-[9px] tracking-[0.2em] uppercase font-semibold text-[var(--text-muted)] font-mono">
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
