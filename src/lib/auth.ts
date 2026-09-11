import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
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
    name: "Admin",
    credentials: {
      email: { label: "E-posta", type: "email" },
      password: { label: "Şifre", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.toLowerCase().trim();
      const password = credentials?.password ?? "";
      if (!email || !password) return null;
      if (!isAdminEmail(email)) return null;

      if (
        allowAdminPasswordLogin &&
        safeEqualString(password, adminDevPassword!)
      ) {
        await upsertCustomer({
          email,
          name: "Admin",
          role: "admin",
        });
        return { id: `admin_${email}`, email, name: "Admin" };
      }

      const admin = await getCustomerByEmail(email);
      if (!admin?.passwordHash) return null;
      const ok = await verifyPassword(password, admin.passwordHash);
      if (!ok) return null;

      await upsertCustomer({
        email: admin.email,
        name: admin.name,
        image: admin.image,
        role: "admin",
      });

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      };
    },
  })
);

if (!process.env.NEXTAUTH_SECRET) {
  console.warn(
    "[Auth] NEXTAUTH_SECRET eksik! .env.local dosyasını oluşturun."
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/admin/login",
    error: "/auth/error",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      if (!isAdminEmail(user.email)) return false;

      try {
        await upsertCustomer({
          email: user.email,
          name: user.name,
          image: user.image,
          role: "admin",
        });
      } catch (err) {
        console.error("[Auth] Admin kaydı hatası:", err);
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
        token.role = "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = "admin";
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
  return list;
}

export function isAdminPasswordLoginEnabled() {
  return true;
}
