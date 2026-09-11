type Props = {
  title?: string;
  className?: string;
};

/** HTML gift-card face — avoids SVG text / image-cache issues */
export function GiftCardVisual({
  title = "Hediye Kartı",
  className = "",
}: Props) {
  return (
    <div
      className={`relative flex aspect-[10/7] flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#5a7a4f] to-[#3d5a34] text-center shadow-sm ${className}`}
      role="img"
      aria-label={title}
    >
      <div className="pointer-events-none absolute inset-4 rounded-2xl border border-white/25" />
      <p className="font-serif text-2xl font-extrabold tracking-tight text-[#fffaf5] sm:text-3xl">
        CimcimKids
      </p>
      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-white/85 sm:text-base">
        {title}
      </p>
      <div className="mt-5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/50">
        <span className="text-lg leading-none text-white/70" aria-hidden>
          +
        </span>
      </div>
    </div>
  );
}
