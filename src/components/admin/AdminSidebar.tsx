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
  Mail,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useAdminNotifications } from "./useAdminNotifications";
import { useAdminNav } from "./AdminShell";

const nav = [
  { href: "/admin", label: "Kontrol Paneli", icon: LayoutDashboard, exact: true },
  { href: "/admin/analytics", label: "İstatistikler", icon: BarChart3 },
  { href: "/admin/orders", label: "Siparişler", icon: ShoppingCart, badge: true },
  { href: "/admin/products", label: "Ürünler", icon: Package },
  { href: "/admin/customers", label: "Müşteriler", icon: Users },
  { href: "/admin/subscribers", label: "E-posta Aboneleri", icon: Mail },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { count } = useAdminNotifications();
  const { open, closeNav } = useAdminNav();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] shrink-0 flex-col bg-[#1a1f1a] text-white transition-transform duration-200 md:static md:z-auto md:w-60 md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:py-5">
        <Link href="/admin" onClick={closeNav} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bamboo text-sm font-bold">
            CK
          </div>
          <div>
            <p className="font-semibold leading-tight">CimcimKids</p>
            <p className="text-[10px] text-white/50">Yönetim Paneli</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={closeNav}
          className="rounded-lg p-2 text-white/70 hover:bg-white/10 md:hidden"
          aria-label="Menüyü kapat"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map(({ href, label, icon: Icon, exact, badge }) => {
          const active = exact
            ? pathname === href
            : pathname.startsWith(href);
          const showBadge = badge && count > 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={closeNav}
              className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
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
          onClick={closeNav}
          className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <Store className="h-4 w-4" />
          Mağazayı Görüntüle
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
