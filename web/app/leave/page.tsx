import { LeaveGenerator } from "@/components/leave/leave-generator";
import { RoleGate } from "@/components/shared/role-gate";

export const dynamic = "force-dynamic";

export default function LeavePage() {
  return (
    <RoleGate roles={["teacher", "monitor", "team_lead", "office", "admin"]}>
      <LeaveGenerator />
    </RoleGate>
  );
}
