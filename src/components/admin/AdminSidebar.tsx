"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Store,
  LogOut,
  BarChart3,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useAdminNotifications } from "./useAdminNotifications";

const nav = [
  { href: "/admin", label: "Kontrol Paneli", icon: LayoutDashboard, exact: true },
  { href: "/admin/analytics", label: "İstatistikler", icon: BarChart3 },
  { href: "/admin/orders", label: "Siparişler", icon: ShoppingCart, badge: true },
  { href: "/admin/products", label: "Ürünler", icon: Package },
  { href: "/admin/customers", label: "Müşteriler", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { count } = useAdminNotifications();

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-[#1a1f1a] text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bamboo text-sm font-bold">
            AB
          </div>
          <div>
            <p className="font-semibold leading-tight">AryaBamboo</p>
            <p className="text-[10px] text-white/50">Yönetim Paneli</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {nav.map(({ href, label, icon: Icon, exact, badge }) => {
          const active = exact
            ? pathname === href
            : pathname.startsWith(href);
          const showBadge = badge && count > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-white/15 font-medium text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {showBadge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-white/10 p-3">
        <Link
          href="/tr"
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <Store className="h-4 w-4" />
          Mağazayı Görüntüle
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
