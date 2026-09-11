"use client";

type PaymentLogosProps = {
  className?: string;
  compact?: boolean;
};

export function PaymentLogos({ className = "", compact = false }: PaymentLogosProps) {
  if (compact) {
    return (
      <div className={`flex justify-center ${className}`}>
        <img
          src="/images/payments/iyzico-logo-band.png"
          alt="iyzico ile Öde, Mastercard, Visa, American Express, Troy"
          className="h-7 w-auto max-w-full object-contain sm:h-8"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${className}`}
      role="img"
      aria-label="Visa, Mastercard, American Express, Troy, iyzico ile Öde"
    >
      <img src="/images/payments/visa.png" alt="Visa" className="h-5 w-auto object-contain sm:h-6" />
      <img
        src="/images/payments/mastercard.png"
        alt="Mastercard"
        className="h-8 w-auto object-contain"
      />
      <img
        src="/images/payments/amex.png"
        alt="American Express"
        className="h-7 w-auto object-contain"
      />
      <img src="/images/payments/troy.png" alt="Troy" className="h-7 w-auto object-contain" />
      <img
        src="/images/payments/iyzico-ile-ode.png"
        alt="iyzico ile Öde"
        className="h-6 w-auto object-contain sm:h-7"
      />
    </div>
  );
}
