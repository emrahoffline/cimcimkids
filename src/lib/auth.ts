import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { timingSafeEqual } from "crypto";
import { isAdminEmail } from "./admin";
import { getCustomerByEmail, upsertCustomer } from "./db";
import { verifyPassword } from "./password";

const providers: NextAuthOptions["providers"] = [];

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

const isProd = process.env.NODE_ENV === "production";
const adminDevPassword = process.env.ADMIN_DEV_PASSWORD?.trim();
const allowAdminPasswordLogin =
  !!adminDevPassword &&
  (!isProd || process.env.ALLOW_ADMIN_PASSWORD_LOGIN === "true");

function safeEqualString(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

providers.push(
  CredentialsProvider({
    id: "credentials",
    name: "E-posta",
    credentials: {
      email: { label: "E-posta", type: "email" },
      password: { label: "Şifre", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.toLowerCase().trim();
      const password = credentials?.password ?? "";
      if (!email || !password) return null;

      if (
        allowAdminPasswordLogin &&
        isAdminEmail(email) &&
        safeEqualString(password, adminDevPassword!)
      ) {
        await upsertCustomer({
          email,
          name: "Admin",
          role: "admin",
        });
        return { id: `admin_${email}`, email, name: "Admin" };
      }

      const customer = await getCustomerByEmail(email);
      if (!customer?.passwordHash) return null;

      const ok = await verifyPassword(password, customer.passwordHash);
      if (!ok) return null;

      await upsertCustomer({
        email: customer.email,
        name: customer.name,
        image: customer.image,
        role: isAdminEmail(email) ? "admin" : customer.role,
      });

      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      };
    },
  })
);

if (allowAdminPasswordLogin) {
  providers.push(
    CredentialsProvider({
      id: "admin-password",
      name: "Admin şifre",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;
        if (!isAdminEmail(email)) return null;
        if (!safeEqualString(password, adminDevPassword!)) return null;
        return {
          id: `admin_${email}`,
          email,
          name: "Admin",
        };
      },
    })
  );
}

if (!process.env.NEXTAUTH_SECRET) {
  console.warn(
    "[Auth] NEXTAUTH_SECRET eksik! .env.local dosyasını oluşturun."
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
  const list: string[] = ["credentials"];
  if (
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim()
  ) {
    list.push("google");
  }
  if (process.env.APPLE_ID?.trim() && process.env.APPLE_SECRET?.trim()) {
    list.push("apple");
  }
  if (allowAdminPasswordLogin) {
    list.push("admin-password");
  }
  return list;
}

export function isAdminPasswordLoginEnabled() {
  return allowAdminPasswordLogin;
}
