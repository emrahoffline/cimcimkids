import { isAdminPasswordLoginEnabled } from "@/lib/auth";
import { AdminLoginClient } from "@/components/AdminLoginClient";

export default function AdminLoginPage() {
  return (
    <AdminLoginClient allowPasswordLogin={isAdminPasswordLoginEnabled()} />
  );
}
