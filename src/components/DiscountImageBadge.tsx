type Props = {
  percent: number | null;
  compact?: boolean;
};

export function DiscountImageBadge({ percent, compact = false }: Props) {
  if (percent == null || percent <= 0) return null;

  return (
    <span
      className={`pointer-events-none absolute left-2 top-3 z-20 flex items-center justify-center bg-red-600 font-bold text-white drop-shadow-md ${
        compact
          ? "h-14 w-14 text-base sm:h-16 sm:w-16 sm:text-lg"
          : "h-20 w-20 text-2xl sm:h-24 sm:w-24 sm:text-3xl"
      }`}
      style={{
        clipPath:
          "polygon(50% 0%,60.9% 9.4%,75% 6.7%,79.7% 20.3%,93.3% 25%,90.6% 39.1%,100% 50%,90.6% 60.9%,93.3% 75%,79.7% 79.7%,75% 93.3%,60.9% 90.6%,50% 100%,39.1% 90.6%,25% 93.3%,20.3% 79.7%,6.7% 75%,9.4% 60.9%,0% 50%,9.4% 39.1%,6.7% 25%,20.3% 20.3%,25% 6.7%,39.1% 9.4%)",
      }}
      aria-label={`%${percent} indirim`}
    >
      -{percent}%
    </span>
  );
}
