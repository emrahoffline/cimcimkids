"use client";

import { Star } from "lucide-react";

type Props = {
  value: number;
  size?: "sm" | "md";
  interactive?: boolean;
  onChange?: (value: number) => void;
  label?: string;
};

export function StarRating({
  value,
  size = "md",
  interactive = false,
  onChange,
  label,
}: Props) {
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  const stars = [1, 2, 3, 4, 5];

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={interactive ? "radiogroup" : "img"}
      aria-label={label || `${value} / 5`}
    >
      {stars.map((star) => {
        const filled = star <= Math.round(value);
        const common = (
          <Star
            className={`${icon} ${
              filled ? "fill-amber-400 text-amber-400" : "fill-none text-slate-300"
            }`}
          />
        );
        if (!interactive) {
          return <span key={star}>{common}</span>;
        }
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star}`}
            className="touch-target rounded-md p-0.5"
            onClick={() => onChange?.(star)}
          >
            {common}
          </button>
        );
      })}
    </div>
  );
}
