import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import { isAdminEmail } from "./admin";
import { upsertCustomer } from "./db";

const providers = [];

const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

if (googleId && googleSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleId,
      clientSecret: googleSecret,
    })
  );
}

if (process.env.APPLE_ID && process.env.APPLE_SECRET) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_ID,
      clientSecret: process.env.APPLE_SECRET,
    })
  );
}

if (!process.env.NEXTAUTH_SECRET) {
  console.warn(
    "[Auth] NEXTAUTH_SECRET eksik! .env.local dosyasını oluşturun."
  );
}

if (providers.length === 0) {
  console.warn(
    "[Auth] OAuth sağlayıcı yok. GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET ekleyin."
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/tr/account",
    error: "/auth/error",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      try {
        const role = isAdminEmail(user.email) ? "admin" : "customer";
        await upsertCustomer({
          email: user.email,
          name: user.name,
          image: user.image,
          role,
        });
      } catch (err) {
        console.error("[Auth] Müşteri kaydı hatası:", err);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
        token.role = isAdminEmail(user.email) ? "admin" : "customer";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = (token.role as "admin" | "customer") ?? "customer";
      }
      return session;
    },
  },
};

export function getConfiguredProviders() {
  const list: string[] = [];
  if (process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()) {
    list.push("google");
  }
  if (process.env.APPLE_ID?.trim() && process.env.APPLE_SECRET?.trim()) {
    list.push("apple");
  }
  return list;
}
