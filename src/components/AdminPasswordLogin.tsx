"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function AdminPasswordLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const callbackUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/admin`
        : "/admin";

    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      callbackUrl,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("E-posta veya şifre hatalı.");
      return;
    }

    // Full navigation avoids stale Server Action / client cache after deploy
    window.location.assign(callbackUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-center text-xs font-medium text-gray-500">
        Yönetici e-posta ve şifre ile giriş
      </p>
      <input
        type="email"
        required
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-olive"
        placeholder="Admin e-posta"
      />
      <input
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-olive"
        placeholder="Şifre"
      />
      {error && <p className="text-center text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#1a1f1a] text-sm font-medium text-white transition hover:bg-black disabled:opacity-60"
      >
        {loading ? "Giriş yapılıyor..." : "Şifre ile giriş"}
      </button>
    </form>
  );
}
