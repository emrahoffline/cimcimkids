"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { formatPrice } from "@/lib/products";
import {
  mapsHref,
  telHref,
  whatsappHref,
} from "@/lib/contact-links";

const statusLabels: Record<string, string> = {
  pending_payment: "Ödeme Bekleniyor",
  pending: "Beklemede",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  cancelled: "İptal",
};

type Profile = {
  email: string;
  name: string;
  image: string | null;
  phone: string | null;
  address: string | null;
  hasAccount: boolean;
  newsletter: boolean;
  createdAt?: string;
  lastLoginAt: string | null;
  stats: {
    orderCount: number;
    paidOrderCount: number;
    cancelledCount: number;
    totalSpent: number;
    itemsPurchased: number;
    averageOrder: number;
    favoriteCount: number;
    cartCount: number;
    cartValue: number;
    lastOrderAt: string | null;
  };
  orders: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
    items: { productId: string; name: string; quantity: number }[];
  }[];
  purchasedItems: {
    productId: string;
    name: string;
    image: string;
    quantity: number;
    total: number;
  }[];
  cart: {
    id: string;
    slug: string;
    name: string;
    price: number;
    image: string;
    quantity: number;
    colorLabel?: string;
    ageLabel?: string;
  }[];
  favorites: {
    id: string;
    slug: string;
    image: string;
    price: number;
    name: string;
  }[];
};

function ContactLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="inline-flex items-center gap-1.5 text-olive hover:underline"
    >
      {children}
    </a>
  );
}

function ProductRow({
  image,
  name,
  meta,
  right,
}: {
  image?: string;
  name: string;
  meta?: string;
  right?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg object-cover bg-gray-100"
        />
      ) : (
        <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-100" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{name}</p>
        {meta && <p className="text-xs text-gray-500">{meta}</p>}
      </div>
      {right && (
        <p className="shrink-0 text-sm font-medium text-gray-700">{right}</p>
      )}
    </div>
  );
}

export default function AdminCustomerDetailPage() {
  const { email: raw } = useParams<{ email: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const email = decodeURIComponent(raw);
    fetch(`/api/admin/customers/${encodeURIComponent(email)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Bulunamadı");
        setProfile(data);
      })
      .catch((err: Error) => setError(err.message));
  }, [raw]);

  return (
    <>
      <AdminHeader title={profile?.name || "Müşteri"} />
      <main className="admin-main space-y-4 sm:space-y-6">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm text-olive hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Siparişlere dön
        </Link>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {!profile && !error && <p className="text-gray-400">Yükleniyor...</p>}

        {profile && (
          <>
            <section className="admin-card p-4 sm:p-6">
              <div className="flex items-start gap-4">
                {profile.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.image}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-olive/10 text-lg font-semibold text-olive">
                    {profile.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {profile.name}
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    {profile.hasAccount ? "Kayıtlı hesap" : "Misafir sipariş"}
                    {profile.newsletter ? " · Bülten abonesi" : ""}
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    E-posta
                  </dt>
                  <dd className="mt-1 text-sm">
                    <ContactLink href={`mailto:${profile.email}`}>
                      <Mail className="h-3.5 w-3.5" />
                      {profile.email}
                    </ContactLink>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Telefon
                  </dt>
                  <dd className="mt-1 space-y-1 text-sm">
                    {profile.phone ? (
                      <>
                        <div>
                          <ContactLink href={telHref(profile.phone)}>
                            <Phone className="h-3.5 w-3.5" />
                            {profile.phone}
                          </ContactLink>
                        </div>
                        <div>
                          <ContactLink href={whatsappHref(profile.phone)}>
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </ContactLink>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Adres
                  </dt>
                  <dd className="mt-1 text-sm">
                    {profile.address ? (
                      <ContactLink href={mapsHref(profile.address)}>
                        <MapPin className="h-3.5 w-3.5" />
                        {profile.address}
                      </ContactLink>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </dd>
                </div>
                {profile.lastLoginAt && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Son giriş
                    </dt>
                    <dd className="mt-1 text-sm text-gray-700">
                      {new Date(profile.lastLoginAt).toLocaleString("tr-TR")}
                    </dd>
                  </div>
                )}
                {profile.createdAt && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      İlk kayıt / sipariş
                    </dt>
                    <dd className="mt-1 text-sm text-gray-700">
                      {new Date(profile.createdAt).toLocaleString("tr-TR")}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                İstatistikler
              </h3>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  {
                    label: "Toplam harcama",
                    value: formatPrice(profile.stats.totalSpent, "tr"),
                    icon: ShoppingBag,
                  },
                  {
                    label: "Sipariş",
                    value: String(profile.stats.orderCount),
                    sub: `${profile.stats.paidOrderCount} geçerli`,
                    icon: ShoppingBag,
                  },
                  {
                    label: "Satın alınan",
                    value: `${profile.stats.itemsPurchased} adet`,
                    icon: ShoppingBag,
                  },
                  {
                    label: "Sepet",
                    value: `${profile.stats.cartCount} ürün`,
                    sub: formatPrice(profile.stats.cartValue, "tr"),
                    icon: ShoppingCart,
                  },
                  {
                    label: "Favoriler",
                    value: String(profile.stats.favoriteCount),
                    icon: Heart,
                  },
                  {
                    label: "Ort. sipariş",
                    value: formatPrice(profile.stats.averageOrder, "tr"),
                    icon: ShoppingBag,
                  },
                ].map((card) => (
                  <div key={card.label} className="admin-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-gray-500">{card.label}</p>
                      <card.icon className="h-4 w-4 text-olive" />
                    </div>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {card.value}
                    </p>
                    {card.sub && (
                      <p className="text-xs text-gray-400">{card.sub}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-card p-4 sm:p-5">
              <h3 className="mb-3 font-semibold">Siparişler</h3>
              {profile.orders.length === 0 ? (
                <p className="text-sm text-gray-400">Sipariş yok</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table w-full">
                    <thead>
                      <tr>
                        <th>Sipariş</th>
                        <th>Ürünler</th>
                        <th>Tutar</th>
                        <th>Durum</th>
                        <th>Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.orders.map((order) => (
                        <tr key={order.id}>
                          <td className="font-medium">
                            <Link
                              href="/admin/orders"
                              className="text-olive hover:underline"
                            >
                              {order.orderNumber}
                            </Link>
                          </td>
                          <td className="text-xs">
                            {order.items.map((i) => (
                              <p key={i.productId}>
                                {i.name} × {i.quantity}
                              </p>
                            ))}
                          </td>
                          <td>{formatPrice(order.total, "tr")}</td>
                          <td>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                              {statusLabels[order.status] ?? order.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap text-gray-400">
                            {new Date(order.createdAt).toLocaleString("tr-TR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="admin-card p-4 sm:p-5">
              <h3 className="mb-3 font-semibold">Satın alınanlar</h3>
              {profile.purchasedItems.length === 0 ? (
                <p className="text-sm text-gray-400">Henüz satın alınan ürün yok</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {profile.purchasedItems.map((item) => (
                    <ProductRow
                      key={item.productId}
                      image={item.image}
                      name={item.name}
                      meta={`${item.quantity} adet`}
                      right={formatPrice(item.total, "tr")}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="admin-card p-4 sm:p-5">
              <h3 className="mb-3 font-semibold">Sepetteki ürünler</h3>
              {profile.cart.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Aktif sepet yok. Sepet, müşteri sitede giriş yaptığında
                  güncellenir.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {profile.cart.map((item) => (
                    <ProductRow
                      key={`${item.id}-${item.colorLabel}-${item.ageLabel}`}
                      image={item.image}
                      name={item.name}
                      meta={[
                        `${item.quantity} adet`,
                        item.ageLabel,
                        item.colorLabel,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      right={formatPrice(item.price * item.quantity, "tr")}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="admin-card p-4 sm:p-5">
              <h3 className="mb-3 font-semibold">Favoriler</h3>
              {profile.favorites.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Kayıtlı favori yok. Favoriler giriş yapan müşterilerde veya
                  sipariş anında kaydedilir.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {profile.favorites.map((item) => (
                    <ProductRow
                      key={item.id}
                      image={item.image}
                      name={item.name}
                      right={formatPrice(item.price, "tr")}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
