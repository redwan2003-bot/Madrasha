import { OfficePanel } from "@/components/office/office-panel";
import { RoleGate } from "@/components/shared/role-gate";

export const dynamic = "force-dynamic";

export default function OfficePage() {
  return (
    <RoleGate roles={["office", "admin"]}>
      <OfficePanel />
    </RoleGate>
  );
}
