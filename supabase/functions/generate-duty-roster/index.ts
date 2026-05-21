// Generates daily monitor duty roster and persists to duty_roster_daily.
// Invoke via cron (daily ~05:00 Asia/Dhaka) or POST with optional ?date=YYYY-MM-DD
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const DAYS_BN = [
  "রবিবার",
  "সোমবার",
  "মঙ্গলবার",
  "বুধবার",
  "বৃহস্পতিবার",
  "শুক্রবার",
  "শনিবার",
];
const WORK_DAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার"];
const TEACHING_PERIODS = [
  "১ম ঘণ্টা",
  "২য় ঘণ্টা",
  "৩য় ঘণ্টা",
  "৪র্থ ঘণ্টা",
  "৫ম ঘণ্টা",
  "৬ষ্ঠ ঘণ্টা",
  "৭ম ঘণ্টা",
  "৮ম ঘণ্টা",
];

type Teacher = {
  index_no: string;
  teacher_fn: string;
  weekly_class_count: number;
};

type MonitorRow = {
  teacher_index: string;
  monitor_day: string;
  status: string;
  role: string | null;
};

type DutyAssignment = { name: string; index: string };

function getWeekNumber(d: Date): { year: number; week: number } {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { year: target.getUTCFullYear(), week };
}

function parseDate(input: string | null): Date {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const today = parseDate(dateParam);
  const todayStr = today.toISOString().slice(0, 10);
  const todayBn = DAYS_BN[today.getDay()];

  if (!WORK_DAYS.includes(todayBn)) {
    await supabase.from("duty_roster_daily").delete().eq("duty_date", todayStr);
    return json({ status: "success", message: "Non work day", roster: {} });
  }

  const { data: teachersRaw, error: teachersErr } = await supabase.rpc(
    "teachers_with_weekly_class_counts",
  );
  if (teachersErr) return json({ status: "error", message: teachersErr.message }, 500);

  const teacherMap = new Map<string, Teacher>();
  for (const t of teachersRaw ?? []) {
    teacherMap.set(t.index_no, {
      index_no: t.index_no,
      teacher_fn: t.teacher_fn,
      weekly_class_count: Number(t.weekly_class_count ?? 0),
    });
  }

  const { data: team, error: teamErr } = await supabase
    .from("monitoring_team")
    .select("*");
  if (teamErr) return json({ status: "error", message: teamErr.message }, 500);

  const { data: leaves, error: leavesErr } = await supabase
    .from("leaves")
    .select("teacher_index")
    .lte("leave_start", todayStr)
    .gte("leave_end", todayStr);
  if (leavesErr) return json({ status: "error", message: leavesErr.message }, 500);

  const onLeave = new Set((leaves ?? []).map((l) => l.teacher_index));

  const { data: routineRows, error: routineErr } = await supabase
    .from("routine")
    .select("period, teacher_index")
    .eq("day", todayBn);
  if (routineErr) return json({ status: "error", message: routineErr.message }, 500);

  const schedule = new Map<string, string[]>();
  for (const row of routineRows ?? []) {
    if (!row.teacher_index) continue;
    const list = schedule.get(row.teacher_index) ?? [];
    list.push(row.period);
    schedule.set(row.teacher_index, list);
  }

  const monitors = (team as MonitorRow[])
    .filter(
      (m) =>
        m.status === "On" &&
        m.monitor_day.includes(todayBn) &&
        !onLeave.has(m.teacher_index),
    )
    .map((m) => {
      const t = teacherMap.get(m.teacher_index);
      const offPeriods =
        TEACHING_PERIODS.length * WORK_DAYS.length -
        (t?.weekly_class_count ?? 0);
      return {
        ...m,
        teacher_fn: t?.teacher_fn ?? "Unknown",
        priorityScore: 0 - offPeriods,
      };
    });

  if (monitors.length === 0) {
    await supabase.from("duty_roster_daily").delete().eq("duty_date", todayStr);
    return json({ status: "success", message: "No monitors", roster: {} });
  }

  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lw = getWeekNumber(lastWeek);

  const { data: doubleDuty } = await supabase
    .from("duty_history")
    .select("teacher_index")
    .eq("year", lw.year)
    .eq("week_number", lw.week)
    .eq("duty_type", "Double");

  const doubleSet = new Set((doubleDuty ?? []).map((d) => d.teacher_index));
  for (const m of monitors) {
    if (doubleSet.has(m.teacher_index)) m.priorityScore += 1000;
  }
  monitors.sort((a, b) => a.priorityScore - b.priorityScore);

  const assignments: DutyAssignment[] = [];
  if (monitors.length >= TEACHING_PERIODS.length) {
    for (let i = 0; i < TEACHING_PERIODS.length; i++) {
      assignments.push({
        name: monitors[i].teacher_fn,
        index: monitors[i].teacher_index,
      });
    }
  } else {
    for (const m of monitors) {
      assignments.push({ name: m.teacher_fn, index: m.teacher_index });
    }
    const remaining = TEACHING_PERIODS.length - monitors.length;
    for (let i = 0; i < remaining; i++) {
      const m = monitors[i % monitors.length];
      assignments.push({ name: m.teacher_fn, index: m.teacher_index });
    }
  }

  const roster: Record<string, DutyAssignment> = {};
  let unassigned = [...assignments];
  const seed = parseInt(todayStr.replace(/-/g, ""), 10);
  let rngState = seed;

  const rand = () => {
    rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
    return rngState / 0x7fffffff;
  };

  for (const period of TEACHING_PERIODS) {
    const available = unassigned.filter(
      (d) => !(schedule.get(d.index) ?? []).includes(period),
    );
    let chosen: DutyAssignment | null = null;
    if (available.length > 0) {
      chosen = available[Math.floor(rand() * available.length)];
    } else if (unassigned.length > 0) {
      chosen = unassigned[0];
    }
    if (chosen) {
      roster[period] = chosen;
      unassigned = unassigned.filter(
        (d) => !(d.index === chosen!.index && d.name === chosen!.name),
      );
    }
  }

  const cw = getWeekNumber(today);
  const finalCounts: Record<string, number> = {};
  for (const a of Object.values(roster)) {
    finalCounts[a.index] = (finalCounts[a.index] ?? 0) + 1;
  }

  for (const m of monitors) {
    const { data: existing } = await supabase
      .from("duty_history")
      .select("id")
      .eq("year", cw.year)
      .eq("week_number", cw.week)
      .eq("teacher_index", m.teacher_index)
      .maybeSingle();

    if (!existing) {
      const n = finalCounts[m.teacher_index] ?? 0;
      const dutyType = n > 1 ? "Double" : n === 1 ? "Single" : "None";
      await supabase.from("duty_history").insert({
        year: cw.year,
        week_number: cw.week,
        teacher_index: m.teacher_index,
        duty_type: dutyType,
      });
    }
  }

  const { data: tempDuties } = await supabase
    .from("temporary_duties")
    .select("period, teacher_index")
    .eq("duty_date", todayStr);

  for (const td of tempDuties ?? []) {
    const t = teacherMap.get(td.teacher_index);
    if (t && roster[td.period]) {
      roster[td.period] = { name: t.teacher_fn, index: t.index_no };
    }
  }

  await supabase.from("duty_roster_daily").delete().eq("duty_date", todayStr);

  const rows = Object.entries(roster).map(([period, a]) => ({
    duty_date: todayStr,
    period,
    teacher_index: a.index,
    teacher_name: a.name,
  }));

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("duty_roster_daily").insert(rows);
    if (insErr) return json({ status: "error", message: insErr.message }, 500);
  }

  return json({
    status: "success",
    date: todayStr,
    roster,
    rowsWritten: rows.length,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
