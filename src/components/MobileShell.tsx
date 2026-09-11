"use client";

import { useState } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileMenuDrawer } from "./MobileMenuDrawer";
import { AnalyticsTracker } from "./AnalyticsTracker";
import { ShopperSync } from "./ShopperSync";
import { SiteChatbot } from "./SiteChatbot";
import { FreeShippingBanner } from "./FreeShippingBanner";
import { CartAddedToast } from "./CartAddedToast";

export function MobileShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <AnalyticsTracker />
      <ShopperSync />
      <div className="sticky top-0 z-40 safe-top">
        <FreeShippingBanner />
        <Header />
      </div>
      <main className="mobile-main flex-1">{children}</main>
      <Footer />
      <MobileBottomNav onMenuOpen={() => setMenuOpen(true)} />
      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="chat-dock">
        <SiteChatbot />
      </div>
      <CartAddedToast />
    </>
  );
}
