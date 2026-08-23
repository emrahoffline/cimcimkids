import { AdminHeader } from "@/components/admin/AdminHeader";
import { OutfitForm } from "@/components/admin/OutfitForm";
import { ensureOutfitsCategory } from "@/lib/db";

export default async function NewOutfitPage() {
  await ensureOutfitsCategory();
  return (
    <>
      <AdminHeader title="Yeni Kombin" />
      <main className="admin-main">
        <OutfitForm />
      </main>
    </>
  );
}
