import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClearCartOnMount } from "@/components/ClearCartOnMount";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; order?: string }>;
};

export default async function CheckoutResultPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { status, order } = await searchParams;
  const t = await getTranslations("checkout");
  const tCart = await getTranslations("cart");
  const base = `/${locale}`;

  const outcome =
    status === "success" || status === "pending" || status === "failure"
      ? status
      : "failure";

  const title =
    outcome === "success"
      ? t("cardSuccess")
      : outcome === "pending"
        ? t("cardPending")
        : t("cardFailure");
  const note =
    outcome === "success"
      ? t("cardSuccessNote")
      : outcome === "pending"
        ? t("cardPendingNote")
        : t("cardFailureNote");

  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      {outcome === "success" ? <ClearCartOnMount /> : null}
      <div className="card space-y-4 text-center">
        <p className="text-xl font-semibold text-olive">{title}</p>
        {order ? (
          <p className="text-sm text-olive/60">
            {t("orderNumber")}: <strong>{order}</strong>
          </p>
        ) : null}
        <p className="text-sm text-olive/70">{note}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {outcome === "failure" ? (
            <Link href={`${base}/checkout`} className="btn-primary">
              {t("retryPayment")}
            </Link>
          ) : (
            <Link href={`${base}/tracking`} className="btn-primary">
              {t("trackOrder")}
            </Link>
          )}
          <Link href={`${base}/products`} className="btn-secondary">
            {tCart("continueShopping")}
          </Link>
        </div>
      </div>
    </div>
  );
}
