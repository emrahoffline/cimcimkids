import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <>
      <AdminHeader title="Yeni Ürün" />
      <main className="admin-main">
        <ProductForm />
      </main>
    </>
  );
}
