"use client";

import { CLASS_LEVELS, CLASS_STRUCTURE } from "@/lib/monitoring/class-structure";
import { createClient } from "@/lib/supabase/client";
import { useMemo, useState } from "react";

const MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

type StudentRow = { id: number; roll: string; name: string; gender: string | null };

export function MonthlyAttendanceForm() {
  const [level, setLevel] = useState("");
  const [className, setClassName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [values, setValues] = useState<Record<string, { days: string; comment: string }>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const classes = useMemo(
    () => (level ? CLASS_STRUCTURE[level] ?? [] : []),
    [level],
  );

  async function loadStudents() {
    if (!className) return;
    setMsg(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("students")
      .select("id, roll, name, gender")
      .eq("class", className)
      .order("roll");
    if (error) {
      setMsg(error.message);
      return;
    }
    const list = (data ?? []) as StudentRow[];
    setRows(list);
    const init: Record<string, { days: string; comment: string }> = {};
    for (const s of list) init[s.roll] = { days: "", comment: "" };
    setValues(init);

    const ids = list.map((s) => s.id);
    if (ids.length) {
      const { data: att } = await supabase
        .from("student_monthly_attendance")
        .select("student_id, days_present, comment")
        .eq("year", year)
        .eq("month", month)
        .in("student_id", ids);
      const idToRoll = Object.fromEntries(list.map((s) => [s.id, s.roll]));
      const next = { ...init };
      for (const a of att ?? []) {
        const roll = idToRoll[a.student_id as number];
        if (roll) next[roll] = { days: String(a.days_present ?? ""), comment: a.comment ?? "" };
      }
      setValues(next);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!className || rows.length === 0) return;
    setBusy(true);
    setMsg(null);
    const payload = rows.map((s) => ({
      roll: s.roll,
      days_present: values[s.roll]?.days ? Number(values[s.roll].days) : 0,
      comment: values[s.roll]?.comment ?? "",
    }));
    const supabase = createClient();
    const { data, error } = await supabase.rpc("upsert_monthly_attendance", {
      p_year: year,
      p_month: month,
      p_class: className,
      p_rows: payload,
    });
    setBusy(false);
    if (error) setMsg(error.message);
    else setMsg((data as { message?: string })?.message ?? "সংরক্ষিত");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <select value={level} onChange={(e) => { setLevel(e.target.value); setClassName(""); }} className="rounded border p-2">
          <option value="">স্তর</option>
          {CLASS_LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select value={className} onChange={(e) => setClassName(e.target.value)} className="rounded border p-2" disabled={!level}>
          <option value="">শ্রেণি</option>
          {classes.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded border p-2">
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="rounded border p-2">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </div>
      <button type="button" onClick={loadStudents} className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-white">
        শিক্ষার্থী লোড করুন
      </button>
      {rows.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">রোল</th>
                <th className="p-2">নাম</th>
                <th className="p-2">দিন</th>
                <th className="p-2">মন্তব্য</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2 text-center">{s.roll}</td>
                  <td className="p-2">{s.name}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      className="w-14 rounded border p-1 text-center"
                      value={values[s.roll]?.days ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [s.roll]: { ...v[s.roll], days: e.target.value },
                        }))
                      }
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className="w-full rounded border p-1"
                      value={values[s.roll]?.comment ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [s.roll]: { ...v[s.roll], comment: e.target.value },
                        }))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="submit" disabled={busy || rows.length === 0} className="w-full cursor-pointer rounded-lg bg-teal-600 py-2 text-white disabled:opacity-50">
        {busy ? "জমা হচ্ছে…" : "মাসিক হাজিরা জমা দিন"}
      </button>
      {msg && <p className="text-center text-sm text-gray-700">{msg}</p>}
    </form>
  );
}
