"use client";

import { StarRating } from "./StarRating";
import type { ReviewSummary } from "@/lib/reviews";

export function ProductRatingBadge({
  summary,
  compact = false,
}: {
  summary?: ReviewSummary | null;
  compact?: boolean;
}) {
  if (!summary || summary.count <= 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-slate-600">
      <StarRating value={summary.average} size="sm" />
      <span className={`font-medium tabular-nums ${compact ? "text-xs" : "text-sm"}`}>
        {summary.average.toFixed(1)}
      </span>
      <span className={`text-slate-400 ${compact ? "text-[11px]" : "text-xs"}`}>
        ({summary.count})
      </span>
    </div>
  );
}
