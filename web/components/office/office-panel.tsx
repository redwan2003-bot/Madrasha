"use client";

import { MonthlyAttendanceForm } from "@/components/office/monthly-attendance-form";
import { TeacherPicker } from "@/components/shared/teacher-picker";
import { createClient } from "@/lib/supabase/client";
import type { TeacherPublic } from "@/types/database";
import { useState } from "react";

const LEAVE_TYPES = [
  "নৈমিত্তিক",
  "অসুস্থতাজনিত",
  "প্রশিক্ষণ",
  "অফিস ডিউটি",
  "উত্তরপত্র গ্রহণ",
  "সরকারি কাজ",
  "ব্যক্তিগত ছুটি",
];

export function OfficePanel() {
  const [tab, setTab] = useState<"leave" | "attendance">("leave");
  const [teacher, setTeacher] = useState<TeacherPublic | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!teacher || !start || !end) return;
    setMsg(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("office_submit_leave", {
      p_teacher_index: teacher.IndexNo,
      p_start: start,
      p_end: end,
      p_leave_type: leaveType,
      p_comment: comment,
    });
    if (error) setMsg(error.message);
    else setMsg((data as { message?: string })?.message ?? "ছুটি জমা হয়েছে");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-amber-900">অফিস প্যানেল</h1>
        <p className="text-sm text-gray-600">ছুটি ও মাসিক হাজিরা ব্যবস্থাপনা</p>
      </header>

      <nav className="flex gap-2 border-b">
        {(
          [
            ["leave", "ছুটি জমা"],
            ["attendance", "মাসিক হাজিরা"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 cursor-pointer border-b-2 py-2 text-sm font-medium ${
              tab === id ? "border-amber-800 text-amber-900" : "border-transparent text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "leave" && (
        <div className="space-y-4">
          <TeacherPicker selected={teacher} onSelect={setTeacher} />
          <form onSubmit={submitLeave} className="space-y-3 rounded-lg border p-4">
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded border p-2" required />
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded border p-2" required />
            </div>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full rounded border p-2">
              {LEAVE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="বদলি শিক্ষক / মন্তব্য…"
              className="w-full rounded border p-2"
              rows={2}
            />
            <button type="submit" disabled={!teacher} className="w-full cursor-pointer rounded-lg bg-teal-600 py-2 text-white disabled:opacity-50">
              ছুটি জমা দিন
            </button>
            {msg && <p className="text-center text-sm">{msg}</p>}
          </form>
        </div>
      )}

      {tab === "attendance" && <MonthlyAttendanceForm />}
    </div>
  );
}
