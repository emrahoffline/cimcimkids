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
          "polygon(50% 0%,61% 9%,74% 4%,81% 17%,95% 19%,94% 34%,100% 46%,90% 56%,94% 70%,81% 77%,75% 91%,61% 87%,50% 100%,39% 87%,25% 91%,19% 77%,6% 70%,10% 56%,0% 46%,6% 34%,5% 19%,19% 17%,26% 4%,39% 9%)",
      }}
      aria-label={`%${percent} indirim`}
    >
      -{percent}%
    </span>
  );
}
