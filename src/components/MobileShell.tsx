"use client";

import { useState } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileMenuDrawer } from "./MobileMenuDrawer";
import { AnalyticsTracker } from "./AnalyticsTracker";

export function MobileShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <AnalyticsTracker />
      <Header />
      <main className="mobile-main flex-1">{children}</main>
      <Footer />
      <MobileBottomNav onMenuOpen={() => setMenuOpen(true)} />
      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
