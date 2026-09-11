"use client";

import { useEffect, useState } from "react";
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
  Percent,
  Megaphone,
  Gift,
  Image as ImageIcon,
  Circle,
  FileText,
  ChevronDown,
  X,
  Star,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useAdminNotifications } from "./useAdminNotifications";
import { useAdminNav } from "./AdminShell";

const NAV_STORAGE_KEY = "cimcimkids-admin-nav";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: boolean;
};

type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Genel",
    items: [
      { href: "/admin", label: "Kontrol Paneli", icon: LayoutDashboard, exact: true },
      { href: "/admin/analytics", label: "İstatistikler", icon: BarChart3 },
    ],
  },
  {
    title: "Satış",
    items: [{ href: "/admin/orders", label: "Siparişler", icon: ShoppingCart, badge: true }],
  },
  {
    title: "Ürünler",
    items: [
      { href: "/admin/products", label: "Ürünler", icon: Package },
      { href: "/admin/reviews", label: "Yorumlar", icon: Star },
      { href: "/admin/discounts", label: "İndirimler", icon: Percent },
    ],
  },
  {
    title: "Finans",
    items: [
      { href: "/admin/invoices", label: "Faturalar", icon: FileText },
      { href: "/admin/gift-cards", label: "Hediye Kartları", icon: Gift },
    ],
  },
  {
    title: "Vitrin",
    items: [
      { href: "/admin/hero", label: "Hero Fotoğrafları", icon: ImageIcon },
      { href: "/admin/stories", label: "Hikayeler", icon: Circle },
      { href: "/admin/announcements", label: "Duyurular", icon: Megaphone },
    ],
  },
  {
    title: "Müşteriler",
    items: [
      { href: "/admin/customers", label: "Müşteriler", icon: Users },
      { href: "/admin/subscribers", label: "E-posta Aboneleri", icon: Mail },
    ],
  },
];

function isItemActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function defaultOpenGroups(): Record<string, boolean> {
  return Object.fromEntries(navGroups.map((group) => [group.title, true]));
}

function readOpenGroups(): Record<string, boolean> {
  const fallback = defaultOpenGroups();
  try {
    const raw = localStorage.getItem(NAV_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return fallback;
    const saved = Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")
    );
    return { ...fallback, ...saved };
  } catch {
    return fallback;
  }
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { count } = useAdminNotifications();
  const { open, closeNav } = useAdminNav();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(defaultOpenGroups);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOpenGroups(readOpenGroups());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const activeGroup = navGroups.find((group) =>
      group.items.some((item) => isItemActive(pathname, item))
    );
    if (activeGroup) {
      setOpenGroups((prev) =>
        prev[activeGroup.title] ? prev : { ...prev, [activeGroup.title]: true }
      );
    }
  }, [pathname, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(openGroups));
  }, [openGroups, ready]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

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

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navGroups.map((group) => {
          const expanded = openGroups[group.title] !== false;
          const groupId = `admin-nav-${group.title}`;
          const collapsedBadge =
            !expanded && group.items.some((item) => item.badge) && count > 0;
          return (
            <div key={group.title} role="group" aria-labelledby={groupId}>
              <button
                type="button"
                id={groupId}
                aria-expanded={expanded}
                onClick={() => toggleGroup(group.title)}
                className="flex min-h-[40px] w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 transition hover:bg-white/5 hover:text-white/80"
              >
                <span className="flex-1">{group.title}</span>
                {collapsedBadge && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                    expanded ? "" : "-rotate-90"
                  }`}
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="space-y-0.5 pb-2">
                    {group.items.map((item) => {
                      const { href, label, icon: Icon, badge } = item;
                      const active = isItemActive(pathname, item);
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
                  </div>
                </div>
              </div>
            </div>
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
