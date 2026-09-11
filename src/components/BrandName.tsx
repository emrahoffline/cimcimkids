import Image from "next/image";

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
  /** Hide the panda mark (text only). */
  textOnly?: boolean;
};

/** Renders "CimcimKids" with rainbow letter colors and optional panda logo. */
export function BrandName({ className = "", textOnly = false }: Props) {
  const letters = "CimcimKids".split("");

  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      {!textOnly && (
        <Image
          src="/images/panda.png"
          alt=""
          width={36}
          height={36}
          className="h-8 w-8 shrink-0 rounded-full object-cover sm:h-9 sm:w-9"
          priority
        />
      )}
      <span className="min-w-0 truncate" aria-label="CimcimKids">
        {letters.map((letter, i) => (
          <span
            key={`${letter}-${i}`}
            style={{ color: RAINBOW[i % RAINBOW.length] }}
          >
            {letter}
          </span>
        ))}
      </span>
    </span>
  );
}
