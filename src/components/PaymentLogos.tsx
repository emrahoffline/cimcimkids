type Variant = "band" | "iyzico";

const ASSETS: Record<
  Variant,
  { src: string; width: number; height: number; className: string }
> = {
  band: {
    src: "/images/payments/logo-band.svg",
    width: 429,
    height: 32,
    className: "h-8 w-auto max-w-full",
  },
  iyzico: {
    src: "/images/payments/iyzico-ile-ode.svg",
    width: 210,
    height: 31,
    className: "h-7 w-auto max-w-[210px]",
  },
};

export function PaymentLogos({
  variant,
  alt,
  className,
}: {
  variant: Variant;
  alt: string;
  className?: string;
}) {
  const asset = ASSETS[variant];
  return (
    // Official iyzico pack SVGs; <img> keeps vector logos unoptimized.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.src}
      alt={alt}
      width={asset.width}
      height={asset.height}
      className={className ?? asset.className}
    />
  );
}
