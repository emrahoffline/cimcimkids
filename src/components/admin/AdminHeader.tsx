"use client";

import { useSession } from "next-auth/react";
import { AdminNotifications } from "./AdminNotifications";

export function AdminHeader({ title }: { title: string }) {
  const { data: session } = useSession();

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <AdminNotifications />
        <span className="rounded-full bg-olive/10 px-2.5 py-0.5 text-xs font-medium text-olive">
          Admin
        </span>
        <span className="text-sm text-gray-600">{session?.user?.email}</span>
      </div>
    </header>
  );
}
