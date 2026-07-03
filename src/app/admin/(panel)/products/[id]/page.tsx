"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import type { Product } from "@/lib/products";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then(setProduct);
  }, [id]);

  return (
    <>
      <AdminHeader title="Ürün Düzenle" />
      <main className="flex-1 overflow-y-auto p-6">
        {product ? (
          <ProductForm product={product} />
        ) : (
          <p className="text-gray-400">Yükleniyor...</p>
        )}
      </main>
    </>
  );
}
