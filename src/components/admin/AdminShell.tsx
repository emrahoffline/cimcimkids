"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";

type AdminNavContextValue = {
  open: boolean;
  openNav: () => void;
  closeNav: () => void;
  toggleNav: () => void;
};

const AdminNavContext = createContext<AdminNavContextValue | null>(null);

export function useAdminNav() {
  const ctx = useContext(AdminNavContext);
  if (!ctx) {
    throw new Error("useAdminNav must be used within AdminShell");
  }
  return ctx;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const openNav = useCallback(() => setOpen(true), []);
  const closeNav = useCallback(() => setOpen(false), []);
  const toggleNav = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AdminNavContext.Provider value={{ open, openNav, closeNav, toggleNav }}>
      <div className="flex min-h-screen">
        {/* Mobile overlay */}
        {open && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            aria-label="Menüyü kapat"
            onClick={closeNav}
          />
        )}

        <AdminSidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </AdminNavContext.Provider>
  );
}
