const MARKS = [
  {
    src: "/images/payments/iyzico-ile-ode.svg",
    alt: "iyzico ile Öde",
    width: 210,
    height: 31,
  },
  {
    src: "/images/payments/mastercard.svg",
    alt: "Mastercard",
    width: 62,
    height: 38,
  },
  {
    src: "/images/payments/visa.svg",
    alt: "Visa",
    width: 80,
    height: 26,
  },
] as const;

export function PaymentLogos({
  variant = "marks",
  alt,
  className,
}: {
  variant?: "band" | "iyzico" | "marks";
  alt?: string;
  className?: string;
}) {
  if (variant === "iyzico") {
    return (
      // Official iyzico pack SVG; <img> keeps the vector unoptimized.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/images/payments/iyzico-ile-ode.svg"
        alt={alt ?? "iyzico ile Öde"}
        width={210}
        height={31}
        className={className ?? "h-7 w-auto max-w-[210px]"}
      />
    );
  }

  const marks = (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {MARKS.map((mark) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={mark.alt}
          src={mark.src}
          alt={mark.alt}
          width={mark.width}
          height={mark.height}
          className="h-7 w-auto"
        />
      ))}
    </div>
  );

  if (variant === "band") {
    return (
      <div className="flex flex-col items-center gap-3">
        {marks}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/payments/logo-band.svg"
          alt={alt ?? "Visa, Mastercard ve iyzico ile Öde"}
          width={429}
          height={32}
          className={className ?? "h-8 w-auto max-w-full"}
        />
      </div>
    );
  }

  return marks;
}
