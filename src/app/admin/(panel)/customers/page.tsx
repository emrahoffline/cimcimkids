"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import type { Customer } from "@/lib/db";
import { formatPrice } from "@/lib/products";

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
        <div className="admin-card overflow-hidden">
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
                    <td className="font-medium">{c.name ?? "—"}</td>
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
