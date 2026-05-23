import { toBengaliNumber } from "@/lib/bengali";
import { getCurrentPeriod } from "@/lib/monitoring/time";

export type ReportFormState = {
  ok: boolean;
  noStudents: boolean;
  absent: boolean;
  late: boolean;
  lateMin: string;
  early: boolean;
  earlyMin: string;
  extra: boolean;
  extraText: string;
};

export function buildMonitorReportText(state: ReportFormState): string {
  const parts: string[] = [];
  if (state.ok) parts.push("ঠিক আছে");
  if (state.noStudents) parts.push("শিক্ষার্থী নেই");
  if (state.absent) parts.push("শিক্ষক অনুপস্থিত");
  if (state.late && state.lateMin) {
    parts.push(`${toBengaliNumber(state.lateMin)} মিনিট পরে প্রবেশ`);
  }
  if (state.early && state.earlyMin) {
    parts.push(`${toBengaliNumber(state.earlyMin)} মিনিট আগে প্রস্থান`);
  }
  if (state.extra && state.extraText.trim()) {
    parts.push(`আরও তথ্য: ${state.extraText.trim()}`);
  }
  return parts.join(", ") || "ক্লাস পর্যবেক্ষণ করা হয়েছে।";
}

export function reportPayloadFromForm(params: {
  monitorIndex: string;
  period: string;
  className: string;
  teacherName: string;
  attendance: number;
  reportText: string;
  date?: Date;
}) {
  const now = params.date ?? new Date();
  const d = now.toISOString().slice(0, 10);
  const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;
  return {
    Date: d,
    Time: t,
    Period: params.period,
    Class: params.className,
    TeacherName: params.teacherName,
    NumberOfAttend: params.attendance,
    monitorIndex: params.monitorIndex,
    monitorReport: params.reportText,
  };
}

export function currentPeriodName(now = new Date()): string {
  return getCurrentPeriod(now)?.name ?? "N/A";
}
