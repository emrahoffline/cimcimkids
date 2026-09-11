import { getConfiguredProviders } from "@/lib/auth";
import { AdminLoginClient } from "@/components/AdminLoginClient";

export default function AdminLoginPage() {
  const hasGoogle = getConfiguredProviders().includes("google");
  return <AdminLoginClient hasGoogle={hasGoogle} />;
}
