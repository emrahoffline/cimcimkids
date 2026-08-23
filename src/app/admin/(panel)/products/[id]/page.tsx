"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import { OutfitForm } from "@/components/admin/OutfitForm";
import type { Product } from "@/lib/types";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then(setProduct);
  }, [id]);

  const isOutfit = product?.kind === "outfit";

  return (
    <>
      <AdminHeader title={isOutfit ? "Kombin Düzenle" : "Ürün Düzenle"} />
      <main className="admin-main">
        {product ? (
          isOutfit ? (
            <OutfitForm product={product} />
          ) : (
            <ProductForm product={product} />
          )
        ) : (
          <p className="text-gray-400">Yükleniyor...</p>
        )}
      </main>
    </>
  );
}
