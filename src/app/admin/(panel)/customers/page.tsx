"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import type { Customer } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { adminCustomerPath } from "@/lib/shopper";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then(setCustomers);
  }, []);

  return (
    <>
      <AdminHeader title="Müşteriler" />
      <main className="admin-main">
        <div className="space-y-3 md:hidden">
          {customers.length === 0 && (
            <div className="admin-card px-4 py-8 text-center text-sm text-gray-400">
              Henüz müşteri kaydı yok
            </div>
          )}
          {customers.map((c) => (
            <Link
              key={c.id}
              href={adminCustomerPath(c.email)}
              className="admin-card block space-y-1 p-4"
            >
              <p className="break-words font-medium text-gray-900">
                {c.name ?? c.email}
              </p>
              <p className="break-all text-xs text-gray-400">{c.email}</p>
              <p className="text-xs text-gray-500">
                {c.orderCount} sipariş · {formatPrice(c.totalSpent, "tr")}
              </p>
            </Link>
          ))}
        </div>

        <div className="admin-card hidden overflow-hidden md:block">
          <div className="admin-table-wrap">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th>Müşteri</th>
                  <th>E-posta</th>
                  <th>Sipariş</th>
                  <th>Toplam Harcama</th>
                  <th>Son Giriş</th>
                  <th>Kayıt</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      Henüz müşteri kaydı yok
                    </td>
                  </tr>
                )}
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">
                      <Link
                        href={adminCustomerPath(c.email)}
                        className="text-bamboo underline decoration-bamboo/40 underline-offset-2 hover:decoration-bamboo"
                      >
                        {c.name ?? c.email}
                      </Link>
                    </td>
                    <td>{c.email}</td>
                    <td>{c.orderCount}</td>
                    <td className="whitespace-nowrap">
                      {formatPrice(c.totalSpent, "tr")}
                    </td>
                    <td className="whitespace-nowrap text-gray-400">
                      {new Date(c.lastLoginAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="whitespace-nowrap text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
