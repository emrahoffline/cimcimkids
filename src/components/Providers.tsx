"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ShopperStateSync } from "./ShopperStateSync";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ShopperStateSync />
      {children}
    </SessionProvider>
  );
}
