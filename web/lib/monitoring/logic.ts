import { CLASS_PERIODS, TEACHING_STAFF_DESIGNATIONS } from "@/lib/monitoring/constants";
import { getCurrentPeriod } from "@/lib/monitoring/time";
import type {
  MonitoringDashboard,
  MonitoringTeamRow,
  ReportRow,
  RoutineRow,
  TeacherPublic,
} from "@/types/database";

export function teamIndex(row: MonitoringTeamRow): string {
  return row.TeacherIndex ?? row.teacher_index ?? "";
}

export function teamDay(row: MonitoringTeamRow): string {
  return row.MonitorDay ?? row.monitor_day ?? "";
}

export function teamRole(row: MonitoringTeamRow): string {
  return row.Role ?? row.role ?? "";
}

export function reportClass(r: ReportRow): string {
  return r.Class ?? r.class ?? "";
}

export function reportPeriod(r: ReportRow): string {
  return r.Period ?? r.period ?? "";
}

export function reportAttendance(r: ReportRow): number | null {
  const n = r.Attendance ?? r.attendance;
  return n != null ? Number(n) : null;
}

export function reportComment(r: ReportRow): string {
  return (r.MonitorReportText ?? r.monitor_report_text ?? "").trim();
}

export function classesForPeriod(data: MonitoringDashboard, periodName: string) {
  return (data.routine ?? []).filter((c) => c.Period === periodName && c.Sub);
}

export function attendanceForClass(
  data: MonitoringDashboard,
  className: string,
): ReportRow | undefined {
  const list = data.todaysAttendance ?? [];
  return (
    list.find((a) => reportClass(a) === className && reportPeriod(a) === "৫ম ঘণ্টা") ??
    list.find((a) => reportClass(a) === className && reportPeriod(a) === "১ম ঘণ্টা")
  );
}

export function filterTeachers(
  teachers: TeacherPublic[],
  filterValue: string,
): TeacherPublic[] {
  const map: Record<string, string> = {
    ebtedayi: "এবতেদায়ি",
    dakhil: "দাখিল",
    alim: "আলিম",
    fazil: "ফাযিল",
    grade3: "কর্মচারি ৩য় গ্রেড",
    grade4: "কর্মচারি ৪র্থ গ্রেড",
  };
  if (filterValue === "all") return teachers;
  const grade = map[filterValue];
  return teachers.filter((t) => t.Grade === grade);
}

export function personalLeaveToday(data: MonitoringDashboard) {
  return (data.onLeave ?? []).filter((l) => !!l.Index);
}

export function offPeriodTeachers(data: MonitoringDashboard, now: Date): TeacherPublic[] {
  const current = getCurrentPeriod(now);
  if (!current || ["সমাবেশ ও প্রস্তুতি", "টিফিন"].includes(current.name)) {
    return [];
  }

  const inClass = new Set(
    (data.routine ?? [])
      .filter((c) => c.Period === current.name && c.Sub)
      .map((c) => c.TeacherFN),
  );
  const onLeave = new Set(personalLeaveToday(data).map((l) => l.Index));

  return (data.allTeachers ?? []).filter((t) => {
    const isTeaching =
      t.Designation &&
      TEACHING_STAFF_DESIGNATIONS.some((d) => t.Designation!.trim().includes(d));
    return (
      isTeaching &&
      !onLeave.has(t.IndexNo) &&
      !inClass.has(t.TeacherFN)
    );
  });
}

export function nextClassForTeacher(
  data: MonitoringDashboard,
  teacher: TeacherPublic,
  currentPeriodName: string,
): RoutineRow | null {
  const idx = CLASS_PERIODS.findIndex((p) => p.name === currentPeriodName);
  for (let i = idx + 1; i < CLASS_PERIODS.length; i++) {
    const found = (data.routine ?? []).find(
      (c) =>
        c.Period === CLASS_PERIODS[i].name &&
        c.TeacherFN === teacher.TeacherFN &&
        c.Sub,
    );
    if (found) return found;
  }
  return null;
}

export function uniqueDutyMonitors(data: MonitoringDashboard): string[] {
  const roster = data.dutyRoster ?? {};
  return [...new Set(Object.values(roster).map((m) => m.index))];
}
