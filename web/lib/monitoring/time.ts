import { CLASS_PERIODS, type ClassPeriod } from "@/lib/monitoring/constants";
import { toBengaliNumber } from "@/lib/bengali";
import type { LeaveRow, MonitoringDashboard } from "@/types/database";

const TZ = "Asia/Dhaka";

export function formatMyDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).formatToParts(date);
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const year = parts.find((p) => p.type === "year")?.value ?? "00";
  return toBengaliNumber(`${day}/${month}/${year}`);
}

export function formatBnWeekday(date: Date): string {
  return new Intl.DateTimeFormat("bn-BD", { weekday: "long", timeZone: TZ }).format(
    date,
  );
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const period =
    h < 5 ? "রাত" : h < 12 ? "সকাল" : h < 14 ? "দুপুর" : h < 17 ? "বিকাল" : h < 19 ? "সন্ধ্যা" : "রাত";
  return `${period} ${toBengaliNumber(h % 12 || 12)}:${toBengaliNumber(String(m).padStart(2, "0"))}`;
}

export function formatClockNow(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return formatTime(`${h}:${m}`);
}

export function parseClientDate(input: string | Date | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date && !isNaN(input.getTime())) return input;
  if (typeof input === "string" && input.includes("/")) {
    const [d, mo, y] = input.split("/").map(Number);
    const fullYear = y < 100 ? 2000 + y : y;
    const dt = new Date(fullYear, mo - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(input);
  return isNaN(dt.getTime()) ? null : dt;
}

export function getCurrentPeriod(date: Date): ClassPeriod | null {
  const total = date.getHours() * 60 + date.getMinutes();
  for (const period of CLASS_PERIODS) {
    const [sh, sm] = period.start.split(":").map(Number);
    const [eh, em] = period.end.split(":").map(Number);
    if (total >= sh * 60 + sm && total < eh * 60 + em) return period;
  }
  return null;
}

export function getSchoolEndTime(date: Date): Date {
  const last = CLASS_PERIODS[CLASS_PERIODS.length - 1];
  const [eh, em] = last.end.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), eh, em);
}

export function isAfterSchool(date: Date): boolean {
  return date > getSchoolEndTime(date);
}

export function getNextPeriod(current: ClassPeriod | null): ClassPeriod | null {
  if (!current) return null;
  const idx = CLASS_PERIODS.findIndex((p) => p.name === current.name);
  return idx >= 0 && idx < CLASS_PERIODS.length - 1 ? CLASS_PERIODS[idx + 1] : null;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getNextWorkingDayInfo(
  data: MonitoringDashboard,
  from: Date = new Date(),
): { date: string; day: string } {
  const next = new Date(from);
  next.setDate(next.getDate() + 1);

  while (true) {
    const dow = next.getDay();
    if (dow !== 5 && dow !== 6) {
      const isHoliday = (data.onLeave ?? []).some((h) => {
        if (!h.LeaveStart || !h.LeaveEnd || h.Index) return false;
        const fromD = parseClientDate(h.LeaveStart);
        const toD = parseClientDate(h.LeaveEnd);
        const check = startOfDay(next);
        return !!(fromD && toD && check >= startOfDay(fromD) && check <= startOfDay(toD));
      });
      if (!isHoliday) break;
    }
    next.setDate(next.getDate() + 1);
  }

  return {
    date: new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long", timeZone: TZ }).format(next),
    day: new Intl.DateTimeFormat("bn-BD", { weekday: "long", timeZone: TZ }).format(next),
  };
}

export function getOffHoursMessage(data: MonitoringDashboard, now: Date): string {
  const firstTeaching = CLASS_PERIODS.find((p) => p.name.includes("ঘণ্টা"));
  if (!firstTeaching) return "";
  const [fh, fm] = firstTeaching.start.split(":").map(Number);
  const firstClass = new Date(now.getFullYear(), now.getMonth(), now.getDate(), fh, fm);
  if (now < firstClass) {
    return `ক্লাস শুরু: আজ, সকাল ${toBengaliNumber("10:30")} টায়`;
  }
  const next = getNextWorkingDayInfo(data, now);
  return `ক্লাস শুরু: ${next.date}, ${next.day} সকাল ${toBengaliNumber("10:30")} টায়`;
}

export type SchoolDayMode =
  | "normal"
  | "weekly_holiday"
  | "special_holiday"
  | "upcoming_holiday";

export function getSchoolDayMode(
  data: MonitoringDashboard,
  now: Date = new Date(),
): {
  mode: SchoolDayMode;
  holiday?: LeaveRow;
  isFriday: boolean;
  isSaturday: boolean;
} {
  const today = startOfDay(now);
  const generalHolidays = (data.onLeave ?? []).filter((h) => !h.Index);

  for (const h of generalHolidays) {
    const from = parseClientDate(h.LeaveStart);
    const to = parseClientDate(h.LeaveEnd);
    if (from && to && today >= startOfDay(from) && today <= startOfDay(to)) {
      return { mode: "special_holiday", holiday: h, isFriday: false, isSaturday: false };
    }
  }

  const schoolEnd = getSchoolEndTime(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  for (const h of generalHolidays) {
    const from = parseClientDate(h.LeaveStart);
    if (from && startOfDay(from).getTime() === tomorrow.getTime() && now > schoolEnd) {
      return { mode: "upcoming_holiday", holiday: h, isFriday: false, isSaturday: false };
    }
  }

  const isFriday = now.getDay() === 5;
  const isSaturday = now.getDay() === 6;
  if (isFriday || isSaturday) {
    return { mode: "weekly_holiday", isFriday, isSaturday };
  }

  return { mode: "normal", isFriday: false, isSaturday: false };
}
