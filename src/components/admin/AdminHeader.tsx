"use client";

import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import { AdminNotifications } from "./AdminNotifications";
import { useAdminNav } from "./AdminShell";

export function AdminHeader({ title }: { title: string }) {
  const { data: session } = useSession();
  const { openNav } = useAdminNav();

  return (
    <header className="safe-top sticky top-0 z-30 flex min-h-14 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={openNav}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 md:hidden"
          aria-label="Menüyü aç"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold text-gray-900 sm:text-lg">
          {title}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <AdminNotifications />
        <span className="hidden rounded-full bg-olive/10 px-2.5 py-0.5 text-xs font-medium text-olive sm:inline">
          Admin
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm text-gray-600 sm:inline lg:max-w-xs">
          {session?.user?.email}
        </span>
      </div>
    </header>
  );
}
