import { StudentsPanel } from "@/components/students/students-panel";
import { RoleGate } from "@/components/shared/role-gate";

export const dynamic = "force-dynamic";

export default function StudentsPage() {
  return (
    <RoleGate roles={["teacher", "monitor", "team_lead", "office", "admin"]}>
      <StudentsPanel />
    </RoleGate>
  );
}
