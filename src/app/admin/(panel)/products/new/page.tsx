import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <>
      <AdminHeader title="Yeni Ürün" />
      <main className="flex-1 overflow-y-auto p-6">
        <ProductForm />
      </main>
    </>
  );
}
