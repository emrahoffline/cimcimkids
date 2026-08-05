const RAINBOW = [
  "#3b82f6", // C - blue
  "#eab308", // i - yellow
  "#f97316", // m - orange
  "#22c55e", // c - green
  "#ec4899", // i - pink
  "#a855f7", // m - purple
  "#f97316", // K - orange
  "#3b82f6", // i - blue
  "#14b8a6", // d - teal
  "#ec4899", // s - pink
] as const;

type Props = {
  className?: string;
};

/** Renders "CimcimKids" with rainbow letter colors. */
export function BrandName({ className = "" }: Props) {
  const letters = "CimcimKids".split("");

  return (
    <span className={className} aria-label="CimcimKids">
      {letters.map((letter, i) => (
        <span key={`${letter}-${i}`} style={{ color: RAINBOW[i % RAINBOW.length] }}>
          {letter}
        </span>
      ))}
    </span>
  );
}
