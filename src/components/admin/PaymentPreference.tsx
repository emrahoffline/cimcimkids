type PaymentOrder = {
  paymentMethod?: string;
  lastFourDigits?: string;
};

export function paymentPreference(order: PaymentOrder): {
  label: string;
  tone: "cod" | "card" | "transfer";
} {
  if (order.paymentMethod === "cash_on_delivery") {
    return { label: "Kapıda nakit", tone: "cod" };
  }
  if (order.paymentMethod === "card_on_delivery") {
    return { label: "Kapıda kart", tone: "cod" };
  }
  if (order.paymentMethod === "card") {
    return {
      label: order.lastFourDigits
        ? `Sitede kart ****${order.lastFourDigits}`
        : "Sitede kart — ödeme alınmadı",
      tone: "card",
    };
  }
  return { label: "Havale/EFT", tone: "transfer" };
}

const toneClass = {
  cod: "bg-amber-100 text-amber-900",
  card: "bg-slate-100 text-slate-700",
  transfer: "bg-sky-50 text-sky-800",
} as const;

export function PaymentPreference({ order }: { order: PaymentOrder }) {
  const pref = paymentPreference(order);
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-gray-500">Ödeme tercihi</span>
      <span
        className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${toneClass[pref.tone]}`}
      >
        {pref.label}
      </span>
    </p>
  );
}
