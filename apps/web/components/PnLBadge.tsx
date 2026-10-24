"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface PnLBadgeProps {
  value: number; // Monetary PnL in INR
  percentage?: number; // Optional return percentage
  size?: "sm" | "md" | "lg";
  showCurrency?: boolean;
}

export function PnLBadge({
  value,
  percentage,
  size = "md",
  showCurrency = true,
}: PnLBadgeProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const formattedAmount = Math.abs(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = isPositive ? "+" : isNegative ? "-" : "";
  const currencySymbol = showCurrency ? "₹" : "";

  const sizeClasses = {
    sm: "text-xs gap-1 py-0.5 px-1.5",
    md: "text-sm gap-1.5 py-1 px-2.5",
    lg: "text-base gap-2 py-1.5 px-3",
  }[size];

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }[size];

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold rounded-md border ${sizeClasses} ${
        isPositive
          ? "text-[var(--profit)] bg-[var(--profit)]/10 border-[var(--profit)]/30"
          : isNegative
          ? "text-[var(--loss)] bg-[var(--loss)]/10 border-[var(--loss)]/30"
          : "text-[var(--text-muted)] bg-[var(--border)]/30 border-[var(--border)]"
      }`}
      aria-label={`${isPositive ? "Profit of" : isNegative ? "Loss of" : "Break-even"} ${currencySymbol}${formattedAmount}`}
    >
      {/* Explicit direction indicator for colorblind accessibility */}
      {isPositive && <ArrowUpRight className={`${iconSizes} stroke-[2.5]`} />}
      {isNegative && <ArrowDownRight className={`${iconSizes} stroke-[2.5]`} />}
      {isNeutral && <Minus className={`${iconSizes} stroke-[2]`} />}

      {/* Numerical value with explicit +/- sign */}
      <span>
        {sign}
        {currencySymbol}
        {formattedAmount}
      </span>

      {/* Percentage tag if provided */}
      {percentage !== undefined && (
        <span className="opacity-80 text-[0.85em]">
          ({sign}
          {Math.abs(percentage).toFixed(2)}%)
        </span>
      )}
    </span>
  );
}
