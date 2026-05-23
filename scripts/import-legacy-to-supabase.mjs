/**
 * Import legacy MySQL (via sfdm.xyz API) into Supabase.
 *
 * Prerequisites:
 * 1. web/.env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * 2. Upload api/export_for_supabase.php to production OR deploy updated api.php
 * 3. Run: npm run import:legacy --prefix web
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const LEGACY_API =
  process.env.LEGACY_API_URL || "https://sfdm.xyz/api/api.php";
const LEGACY_EXPORT_URL =
  process.env.LEGACY_EXPORT_URL || "https://sfdm.xyz/api/export_for_supabase.php";
const IMPORT_SECRET =
  process.env.LEGACY_IMPORT_SECRET || "madrasha-supabase-import";

const WORK_DAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার"];
const CLASS_NAMES = [
  "১ম শ্রেণি", "২য় শ্রেণি", "৩য় শ্রেণি", "৪র্থ শ্রেণি", "৫ম শ্রেণি",
  "৬ষ্ঠ শ্রেণি", "৭ম শ্রেণি", "৮ম শ্রেণি", "৯ম শ্রেণি", "১০ম শ্রেণি",
  "আলিম ১ম বর্ষ", "আলিম ২য় বর্ষ",
  "ফাযিল ১ম বর্ষ", "ফাযিল ২য় বর্ষ", "ফাযিল ৩য় বর্ষ",
];

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(join(ROOT, "web", ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in web/.env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchJson(url, options) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(120_000) });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON from ${url}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

async function fetchFullExport() {
  const urls = [
    `${LEGACY_EXPORT_URL}?import_secret=${encodeURIComponent(IMPORT_SECRET)}`,
    `${LEGACY_API}?action=export_for_supabase&import_secret=${encodeURIComponent(IMPORT_SECRET)}`,
  ];
  for (const url of urls) {
    try {
      console.log("Fetching full export:", url.split("?")[0]);
      const json = await fetchJson(url);
      if (json.status === "success" && json.data) {
        console.log("Export counts:", json.counts);
        return json.data;
      }
    } catch (e) {
      console.warn("Export failed:", e.message);
    }
  }
  return null;
}

async function fetchLegacyBundle() {
  console.log("Using fallback APIs (partial — upload export_for_supabase.php for full data)…");

  const main = await fetchJson(`${LEGACY_API}?action=get_all_data&v=${Date.now()}`);
  const admin = await fetchJson(LEGACY_API, {
    method: "POST",
    body: new URLSearchParams({ action: "getAllDataForAdmin" }),
  });

  const leaveReport = await fetchJson(LEGACY_API, {
    method: "POST",
    body: new URLSearchParams({
      action: "generateReport",
      reportSubtype: "leave",
      timeframe: "daily",
      date: new Date().toISOString().slice(0, 10),
    }),
  });

  const routine = [];
  const refDates = {
    রবিবার: "2026-05-17",
    সোমবার: "2026-05-18",
    মঙ্গলবার: "2026-05-19",
    বুধবার: "2026-05-20",
    বৃহস্পতিবার: "2026-05-21",
  };
  for (const day of WORK_DAYS) {
    const d = refDates[day];
    const body = new URLSearchParams({ action: "getMonitoringDataForDate", date: d });
    const res = await fetchJson(LEGACY_API, { method: "POST", body });
    for (const row of res.data?.routine ?? []) {
      routine.push({
        Day: day,
        Period: row.Period,
        Class: row.Class,
        Subject: row.Sub ?? row.Subject,
        TeacherIndex: row.TeacherIndex ?? null,
      });
    }
  }

  const students = [];
  for (const className of CLASS_NAMES) {
    try {
      const res = await fetchJson(
        `${LEGACY_API}?action=get_students_by_class&className=${encodeURIComponent(className)}`,
      );
      for (const s of res.students ?? []) {
        students.push({
          Roll: s.roll,
          Name: s.name,
          Gender: s.gender,
          Class: className,
        });
      }
    } catch {
      /* class may be empty */
    }
  }

  const leaves = (leaveReport.data ?? []).map((l) => ({
    TeacherIndex: l.IndexNo,
    LeaveStart: l.LeaveStart,
    LeaveEnd: l.LeaveEnd,
    LeaveType: l.LeaveType,
    Comment: l.Comment,
  }));

  const sm = main.data?.specialMessages ?? admin.data?.specialMessages ?? {};
  const special_messages = Object.entries(sm).map(([MessageKey, MessageValue]) => ({
    MessageKey,
    MessageValue: MessageValue ?? "",
  }));

  const saved = admin.data?.savedMessages ?? [];
  const saved_messages = saved.map((m) => ({
    id: m.ID ?? m.id,
    message_text: m.Message ?? m.message_text,
  }));

  return {
    teachers: main.data?.allTeachers ?? [],
    monitoring_team: main.data?.monitoringTeam ?? admin.data?.monitoringTeam ?? [],
    routine,
    leaves,
    reports: main.data?.monitoringReport ?? [],
    students,
    student_monthly_attendance: [],
    special_messages,
    saved_messages,
    duty_history: [],
    temporary_duties: [],
  };
}

async function truncateTables() {
  console.log("Clearing existing data (service role)…");
  const steps = [
    () => supabase.from("student_monthly_attendance").delete().gte("id", 0),
    () => supabase.from("reports").delete().gte("id", 0),
    () => supabase.from("leaves").delete().gte("id", 0),
    () => supabase.from("temporary_duties").delete().gte("id", 0),
    () => supabase.from("duty_roster_daily").delete().gte("duty_date", "2000-01-01"),
    () => supabase.from("duty_history").delete().gte("id", 0),
    () => supabase.from("routine").delete().gte("id", 0),
    () => supabase.from("monitoring_team").delete().gte("id", 0),
    () => supabase.from("saved_messages").delete().gte("id", 0),
    () => supabase.from("special_messages").delete().neq("message_key", ""),
    () => supabase.from("students").delete().gte("id", 0),
    () => supabase.from("teachers").delete().neq("index_no", ""),
  ];
  for (const run of steps) {
    const { error } = await run();
    if (error) console.warn("  truncate:", error.message);
  }
}

async function batchUpsert(table, rows, options = {}) {
  const size = options.batchSize ?? 200;
  let done = 0;
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const { error } = await supabase.from(table).upsert(chunk, options.upsert);
    if (error) throw new Error(`${table}: ${error.message}`);
    done += chunk.length;
    process.stdout.write(`  ${table}: ${done}/${rows.length}\r`);
  }
  if (rows.length) console.log(`  ${table}: ${rows.length} rows`);
}

function mapTeachers(rows) {
  const seen = new Set();
  const out = [];
  for (const t of rows) {
    const index_no = (t.IndexNo ?? t.index_no ?? "").trim();
    if (!index_no || seen.has(index_no)) continue;
    seen.add(index_no);
    out.push({
      index_no,
      teacher_fn: t.TeacherFN ?? t.teacher_fn ?? index_no,
      designation: t.Designation ?? t.designation ?? null,
      teacher_sub: t.TeacherSub ?? t.teacher_sub ?? null,
      tcr_address: t.TcrAddress ?? t.tcr_address ?? null,
      mobile_no: t.MobileNo ?? t.mobile_no ?? null,
      grade: t.Grade ?? t.grade ?? null,
      role: t.Role ?? t.role ?? "Teacher",
      photo_url: t.TcrPhoto ?? t.PhotoUrl ?? t.photo_url ?? null,
    });
  }
  return out;
}

function mapMonitoringTeam(rows) {
  return rows
    .filter((m) => m.TeacherIndex ?? m.teacher_index)
    .map((m) => ({
      teacher_index: m.TeacherIndex ?? m.teacher_index,
      monitor_day: m.MonitorDay ?? m.monitor_day ?? "",
      role: m.Role ?? m.role ?? m.monComment ?? null,
      status: (m.Status ?? m.status ?? "On") === "Off" ? "Off" : "On",
      mon_comment: m.monComment ?? m.mon_comment ?? null,
    }));
}

function mapRoutine(rows) {
  return rows
    .filter((r) => r.Day && r.Period && r.Class)
    .map((r) => ({
      day: r.Day ?? r.day,
      period: r.Period ?? r.period,
      class: r.Class ?? r.class,
      subject: r.Subject ?? r.Sub ?? r.subject ?? null,
      teacher_index: r.TeacherIndex ?? r.teacher_index ?? null,
    }));
}

function mapLeaves(rows) {
  return rows
    .filter((l) => (l.TeacherIndex ?? l.teacher_index) && l.LeaveStart)
    .map((l) => ({
      teacher_index: l.TeacherIndex ?? l.teacher_index,
      leave_start: l.LeaveStart ?? l.leave_start,
      leave_end: l.LeaveEnd ?? l.leave_end,
      leave_type: l.LeaveType ?? l.leave_type ?? null,
      comment: l.Comment ?? l.comment ?? null,
    }));
}

function mapReports(rows) {
  return rows.map((r) => ({
    report_date: r.ReportDate ?? r.report_date,
    report_time: (r.ReportTime ?? r.report_time ?? "10:00:00").toString().slice(0, 8),
    period: r.Period ?? r.period ?? "N/A",
    class: r.Class ?? r.class ?? "",
    teacher_name: r.TeacherName ?? r.teacher_name ?? null,
    attendance: r.NumberOfAttend ?? r.Attendance ?? r.attendance ?? null,
    monitor_report_text: r.MonitorReportText ?? r.monitor_report_text ?? r.monitorReport ?? null,
    monitor_index: r.MonitorIndex ?? r.monitor_index ?? null,
    submitted_by_index: r.MonitorIndex ?? r.submitted_by_index ?? r.monitor_index ?? null,
  }));
}

function mapStudents(rows) {
  const seen = new Set();
  const out = [];
  for (const s of rows) {
    const roll = String(s.Roll ?? s.roll ?? "").trim();
    const cls = s.Class ?? s.class;
    if (!roll || !cls) continue;
    const key = `${cls}::${roll}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      roll,
      name: s.Name ?? s.name ?? roll,
      gender: s.Gender ?? s.gender ?? null,
      class: cls,
    });
  }
  return out;
}

function mapSpecialMessages(rows) {
  if (Array.isArray(rows)) {
    return rows.map((r) => ({
      message_key: r.MessageKey ?? r.message_key,
      message_value: r.MessageValue ?? r.message_value ?? "",
    }));
  }
  return Object.entries(rows).map(([message_key, message_value]) => ({
    message_key,
    message_value: message_value ?? "",
  }));
}

function mapSavedMessages(rows) {
  return rows.map((m) => ({
    message_text: m.message_text ?? m.Message ?? "",
  }));
}

function mapDutyHistory(rows) {
  return rows.map((h) => ({
    year: h.Year ?? h.year,
    week_number: h.WeekNumber ?? h.week_number,
    teacher_index: h.TeacherIndex ?? h.teacher_index,
    duty_type: h.DutyType ?? h.duty_type,
  }));
}

function mapTemporaryDuties(rows) {
  return rows.map((t) => ({
    duty_date: t.DutyDate ?? t.duty_date,
    period: t.Period ?? t.period,
    teacher_index: t.TeacherIndex ?? t.teacher_index,
  }));
}

async function importMonthlyAttendance(monthlyRows, legacyStudents) {
  if (!monthlyRows.length) return;
  const { data: dbStudents, error } = await supabase.from("students").select("id, roll, class");
  if (error) throw error;
  const legacyById = new Map(
    (legacyStudents ?? []).map((s) => [s.id, `${s.Class ?? s.class}::${String(s.Roll ?? s.roll)}`]),
  );
  const idByKey = new Map((dbStudents ?? []).map((s) => [`${s.class}::${s.roll}`, s.id]));

  const mapped = [];
  for (const a of monthlyRows) {
    const key = legacyById.get(a.student_id);
    const newId = key ? idByKey.get(key) : null;
    if (!newId) continue;
    mapped.push({
      student_id: newId,
      year: a.year ?? a.Year,
      month: a.month ?? a.Month,
      days_present: a.days_present ?? a.DaysPresent ?? 0,
      comment: a.comment ?? a.Comment ?? null,
    });
  }
  await batchUpsert("student_monthly_attendance", mapped, {
    upsert: { onConflict: "student_id,year,month" },
  });
}

async function regenerateDutyRoster() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  const url = `${supabaseUrl}/functions/v1/generate-duty-roster?date=${today}`;
  console.log("Regenerating duty roster for", today);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) console.warn("Duty roster:", body.error ?? res.status);
  else console.log("Duty roster:", body.message ?? "ok");
}

async function main() {
  const noTruncate = process.argv.includes("--no-truncate");

  let data = await fetchFullExport();
  if (!data) data = await fetchLegacyBundle();

  if (!data?.teachers?.length) {
    console.error("No teacher data fetched. Upload export_for_supabase.php to sfdm.xyz first.");
    process.exit(1);
  }

  if (!noTruncate) await truncateTables();

  const teachers = mapTeachers(data.teachers);
  await batchUpsert("teachers", teachers, { upsert: { onConflict: "index_no" } });

  await batchUpsert("monitoring_team", mapMonitoringTeam(data.monitoring_team ?? []), {
    upsert: { onConflict: "teacher_index" },
  });

  await batchUpsert("special_messages", mapSpecialMessages(data.special_messages ?? []), {
    upsert: { onConflict: "message_key" },
  });

  const saved = mapSavedMessages(data.saved_messages ?? []);
  if (saved.length) await batchUpsert("saved_messages", saved);

  await batchUpsert("routine", mapRoutine(data.routine ?? []));

  await batchUpsert("leaves", mapLeaves(data.leaves ?? []));

  const students = mapStudents(data.students ?? []);
  if (students.length) {
    await batchUpsert("students", students, { upsert: { onConflict: "class,roll" } });
  }

  const reports = mapReports(data.reports ?? []);
  if (reports.length) await batchUpsert("reports", reports);

  if (data.duty_history?.length) {
    await batchUpsert("duty_history", mapDutyHistory(data.duty_history), {
      upsert: { onConflict: "year,week_number,teacher_index" },
    });
  }

  if (data.temporary_duties?.length) {
    await batchUpsert("temporary_duties", mapTemporaryDuties(data.temporary_duties));
  }

  if (data.student_monthly_attendance?.length) {
    await importMonthlyAttendance(data.student_monthly_attendance, data.students ?? []);
  }

  await regenerateDutyRoster();

  const { count } = await supabase.from("teachers").select("*", { count: "exact", head: true });
  console.log("\nDone. Supabase teachers count:", count);
  console.log("Re-run PATCH_PANEL_PAGES.sql if admin role is not set.");
}

main().catch((e) => {
  console.error("\nImport failed:", e.message);
  process.exit(1);
});
