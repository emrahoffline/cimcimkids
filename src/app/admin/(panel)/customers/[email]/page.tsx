"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  Heart,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  ShoppingCart,
  Star,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StarRating } from "@/components/StarRating";
import { formatPrice } from "@/lib/products";
import {
  customerTelHref,
  customerWhatsAppHref,
  formatDurationTr,
  type CustomerProfile,
} from "@/lib/shopper";

const statusLabel: Record<string, string> = {
  pending_payment: "Ödeme Bekleniyor",
  pending: "Beklemede",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  cancelled: "İptal",
};

function InfoLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`text-bamboo ${className}`}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

function ProductRow({
  image,
  name,
  meta,
}: {
  image?: string;
  name: string;
  meta: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gray-100" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium leading-snug text-gray-800">
          {name}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">{meta}</p>
      </div>
    </div>
  );
}

export default function AdminCustomerDetailPage() {
  const { email: rawEmail } = useParams<{ email: string }>();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/customers/${encodeURIComponent(rawEmail)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "Müşteri yüklenemedi");
        return data as CustomerProfile;
      })
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setProfile(null);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rawEmail]);

  const title = profile?.name || "Müşteri";

  return (
    <>
      <AdminHeader title={title} />
      <main className="admin-main space-y-4 sm:space-y-6">
        <Link
          href="/admin/orders"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Siparişlere dön
        </Link>

        {loading && <p className="text-sm text-gray-400">Yükleniyor...</p>}
        {error && !loading && (
          <div className="admin-card p-4 text-sm text-red-600 sm:p-6">{error}</div>
        )}

        {profile && (
          <>
            <section className="admin-card p-4 sm:p-6">
              <h2 className="mb-3 break-words text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">
                {profile.name}
              </h2>
              <div className="space-y-1">
                <InfoLink
                  href={`mailto:${profile.email}`}
                  className="flex min-h-[44px] items-center gap-3 no-underline"
                >
                  <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="min-w-0 break-all text-sm">{profile.email}</span>
                </InfoLink>
                {profile.phone && (
                  <div className="flex gap-2">
                    <InfoLink
                      href={customerTelHref(profile.phone)}
                      className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 no-underline"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="text-sm">{profile.phone}</span>
                    </InfoLink>
                    <InfoLink
                      href={customerWhatsAppHref(profile.phone)}
                      className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg bg-[#25D366]/10 px-3 text-sm font-medium text-[#128C7E] no-underline"
                    >
                      WhatsApp
                    </InfoLink>
                  </div>
                )}
              </div>
              {profile.shippingAddress && (
                <div className="mt-3 flex items-start gap-3 border-t border-gray-100 pt-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <p className="min-w-0 break-words text-sm leading-relaxed text-gray-700">
                    {profile.shippingAddress}
                  </p>
                </div>
              )}
              <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-sm text-gray-700">
                <p className="break-words">
                  {profile.invoiceKind === "corporate"
                    ? `Kurumsal · ${profile.companyTitle ?? ""} · VKN ${profile.taxId ?? "—"}`
                    : profile.taxId
                      ? `Bireysel · TCKN ${profile.taxId}`
                      : "Bireysel"}
                  {profile.taxOffice ? ` · ${profile.taxOffice}` : ""}
                </p>
                {profile.account && (
                  <p className="text-xs text-gray-500">
                    Kayıt{" "}
                    {new Date(profile.account.createdAt).toLocaleDateString("tr-TR")}
                    {" · "}
                    Son giriş{" "}
                    {new Date(profile.account.lastLoginAt).toLocaleDateString("tr-TR")}
                  </p>
                )}
              </div>
            </section>

            {profile.orders.length > 0 && (
              <section className="admin-card overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
                  <h3 className="font-semibold text-gray-900">Siparişler</h3>
                </div>
                <div className="divide-y divide-gray-100 md:hidden">
                  {profile.orders.map((order) => (
                    <div key={order.id} className="space-y-1.5 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-gray-900">{order.orderNumber}</p>
                        <p className="shrink-0 text-sm font-semibold text-gray-900">
                          {formatPrice(order.total, "tr")}
                        </p>
                      </div>
                      <p className="text-xs leading-relaxed text-gray-600">
                        {order.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                        <span>{statusLabel[order.status] ?? order.status}</span>
                        <span>
                          {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="admin-table-wrap hidden md:block">
                  <table className="admin-table w-full">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Ürünler</th>
                        <th>Tutar</th>
                        <th>Durum</th>
                        <th>Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.orders.map((order) => (
                        <tr key={order.id}>
                          <td className="font-medium">{order.orderNumber}</td>
                          <td className="text-xs">
                            {order.items.map((i) => (
                              <p key={`${order.id}-${i.productId}`}>
                                {i.name} × {i.quantity}
                              </p>
                            ))}
                          </td>
                          <td>{formatPrice(order.total, "tr")}</td>
                          <td>{statusLabel[order.status] ?? order.status}</td>
                          <td className="whitespace-nowrap text-gray-400">
                            {new Date(order.createdAt).toLocaleString("tr-TR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                Müşteri istatistikleri
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
                <div className="admin-card p-3 sm:p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:text-xs">
                    <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                    Sipariş
                  </p>
                  <p className="mt-1.5 text-xl font-semibold text-gray-900 sm:text-2xl">
                    {profile.stats.orderCount}
                  </p>
                  <p className="text-[11px] text-gray-500 sm:text-xs">
                    {formatPrice(profile.stats.totalSpent, "tr")}
                  </p>
                </div>
                <div className="admin-card p-3 sm:p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:text-xs">
                    <Clock3 className="h-3.5 w-3.5 shrink-0" />
                    Süre
                  </p>
                  <p className="mt-1.5 break-words text-lg font-semibold leading-tight text-gray-900 sm:text-2xl">
                    {profile.stats.timeOnSiteSec > 0
                      ? formatDurationTr(profile.stats.timeOnSiteSec)
                      : "—"}
                  </p>
                  <p className="text-[11px] leading-snug text-gray-500 sm:text-xs">
                    {profile.stats.pageViews > 0
                      ? `${profile.stats.pageViews} sayfa · ${profile.stats.sessions} oturum`
                      : "Ziyaret eşleşmedi"}
                  </p>
                </div>
                <div className="admin-card p-3 sm:p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:text-xs">
                    <Heart className="h-3.5 w-3.5 shrink-0" />
                    Favori
                  </p>
                  <p className="mt-1.5 text-xl font-semibold text-gray-900 sm:text-2xl">
                    {profile.stats.favoriteCount}
                  </p>
                </div>
                <div className="admin-card p-3 sm:p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:text-xs">
                    <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                    Sepet
                  </p>
                  <p className="mt-1.5 text-xl font-semibold text-gray-900 sm:text-2xl">
                    {profile.stats.cartCount}
                  </p>
                </div>
                <div className="admin-card p-3 sm:p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:text-xs">
                    <Star className="h-3.5 w-3.5 shrink-0" />
                    Yorum
                  </p>
                  <p className="mt-1.5 text-xl font-semibold text-gray-900 sm:text-2xl">
                    {profile.stats.reviewCount}
                  </p>
                  <p className="text-[11px] text-gray-500 sm:text-xs">
                    {profile.stats.reviewCount > 0
                      ? `Ort. ${profile.stats.reviewAverage}/5`
                      : "Henüz yok"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
                <div className="admin-card p-4 sm:p-5">
                  <h4 className="mb-1 font-semibold text-gray-900">
                    Satın aldığı ürünler
                  </h4>
                  {profile.purchasedProducts.length === 0 ? (
                    <p className="py-2 text-sm text-gray-400">Henüz yok</p>
                  ) : (
                    profile.purchasedProducts.map((p) => (
                      <ProductRow
                        key={p.productId}
                        image={p.image}
                        name={p.name}
                        meta={`${p.quantity} adet · ${formatPrice(p.revenue, "tr")}`}
                      />
                    ))
                  )}
                </div>
                <div className="admin-card p-4 sm:p-5">
                  <h4 className="mb-1 font-semibold text-gray-900">Favoriler</h4>
                  {profile.favorites.length === 0 ? (
                    <p className="py-2 text-sm text-gray-400">Henüz yok</p>
                  ) : (
                    profile.favorites.map((p) => (
                      <ProductRow
                        key={p.id}
                        image={p.image}
                        name={p.name || p.slug || p.id}
                        meta={formatPrice(p.price, "tr")}
                      />
                    ))
                  )}
                </div>
                <div className="admin-card p-4 sm:p-5">
                  <h4 className="mb-1 font-semibold text-gray-900">
                    Kasada olanlar
                  </h4>
                  {profile.cart.length === 0 ? (
                    <p className="py-2 text-sm text-gray-400">Sepet boş</p>
                  ) : (
                    profile.cart.map((p) => (
                      <ProductRow
                        key={p.id}
                        image={p.image}
                        name={[p.name, p.colorLabel, p.ageLabel]
                          .filter(Boolean)
                          .join(" · ")}
                        meta={`${p.quantity} adet · ${formatPrice(p.price, "tr")}`}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="admin-card p-4 sm:p-5">
                <h4 className="mb-1 font-semibold text-gray-900">Yorumlar</h4>
                {(profile.reviews ?? []).length === 0 ? (
                  <p className="py-2 text-sm text-gray-400">Henüz yorum yok</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {(profile.reviews ?? []).map((review) => (
                      <li
                        key={review.id}
                        className={`space-y-1.5 py-3 first:pt-2 last:pb-0 ${
                          review.hidden ? "opacity-70" : ""
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <Link
                            href={`/tr/products/${review.productSlug}`}
                            className="min-w-0 break-words text-sm font-medium text-gray-900 hover:text-olive"
                            target="_blank"
                          >
                            {review.productName}
                          </Link>
                          <StarRating value={review.rating} size="sm" />
                        </div>
                        {review.comment ? (
                          <p className="break-words text-sm leading-relaxed text-gray-700">
                            {review.comment}
                          </p>
                        ) : (
                          <p className="text-xs italic text-gray-400">
                            Yalnızca puan
                          </p>
                        )}
                        {review.images?.length ? (
                          <ul className="flex flex-wrap gap-2">
                            {review.images.map((src) => (
                              <li key={src}>
                                <a href={src} target="_blank" rel="noreferrer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={src}
                                    alt=""
                                    className="h-14 w-14 rounded-lg object-cover"
                                  />
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <p className="text-[11px] text-gray-400">
                          {review.orderNumber}
                          {" · "}
                          {new Date(review.createdAt).toLocaleString("tr-TR")}
                          {review.hidden ? " · Gizli" : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
