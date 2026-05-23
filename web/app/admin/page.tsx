import { AdminPanel } from "@/components/admin/admin-panel";
import { RoleGate } from "@/components/shared/role-gate";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <RoleGate roles={["admin"]}>
      <AdminPanel />
    </RoleGate>
  );
}
