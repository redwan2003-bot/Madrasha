"use client";

import { TeacherPicker } from "@/components/shared/teacher-picker";
import { toBengaliNumber } from "@/lib/bengali";
import { createClient } from "@/lib/supabase/client";
import type { TeacherPublic } from "@/types/database";
import { useState } from "react";

type LeaveRow = {
  LeaveStart: string;
  LeaveEnd: string;
  LeaveType?: string;
  Comment?: string;
};

export function LeaveGenerator() {
  const [teacher, setTeacher] = useState<TeacherPublic | null>(null);
  const [summary, setSummary] = useState<{
    monthlyLeaveDays: number;
    yearlyLeaveDays: number;
    leaves: LeaveRow[];
    teacher: TeacherPublic;
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadCard() {
    if (!teacher) return;
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_leave_card_summary", {
      p_teacher_index: teacher.IndexNo,
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    const res = data as {
      status?: string;
      message?: string;
      teacher?: TeacherPublic;
      leaves?: LeaveRow[];
      monthlyLeaveDays?: number;
      yearlyLeaveDays?: number;
    };
    if (res.status === "error") {
      setMsg(res.message ?? "ত্রুটি");
      return;
    }
    setSummary({
      teacher: res.teacher ?? teacher,
      leaves: res.leaves ?? [],
      monthlyLeaveDays: res.monthlyLeaveDays ?? 0,
      yearlyLeaveDays: res.yearlyLeaveDays ?? 0,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-teal-800">ছুটির দরখাস্ত / কার্ড</h1>
        <p className="text-sm text-gray-600">শিক্ষকের ছুটি সারাংশ ও প্রিন্টযোগ্য কার্ড</p>
      </header>

      <TeacherPicker selected={teacher} onSelect={(t) => { setTeacher(t); setSummary(null); }} />

      <button
        type="button"
        onClick={loadCard}
        disabled={!teacher || busy}
        className="w-full cursor-pointer rounded-lg bg-indigo-600 py-2 text-white disabled:opacity-50"
      >
        {busy ? "লোড…" : "ছুটি কার্ড দেখুন"}
      </button>

      {msg && <p className="text-center text-sm text-red-600">{msg}</p>}

      {summary && (
        <article
          id="leave-card-print"
          className="rounded-lg border bg-white p-8 shadow-md print:shadow-none"
        >
          <div className="text-center">
            <h2 className="text-lg font-bold">শিবগঞ্জ ফাযিল ডিগ্রী মাদ্রাসা</h2>
            <p className="text-sm">শিবগঞ্জ-৫৮১০, বগুড়া</p>
          </div>
          <h3 className="mt-6 text-center text-xl font-bold">ব্যক্তিগত ছুটি সারাংশ</h3>
          <div className="mt-4 space-y-2 text-sm">
            <p><strong>নাম:</strong> {summary.teacher.TeacherFN}</p>
            <p><strong>ইনডেক্স:</strong> {summary.teacher.IndexNo}</p>
            <p><strong>পদবি:</strong> {summary.teacher.Designation ?? "—"}</p>
            <p>
              <strong>এ মাসে ছুটি:</strong> {toBengaliNumber(summary.monthlyLeaveDays)} দিন
            </p>
            <p>
              <strong>এ বছরে ছুটি:</strong> {toBengaliNumber(summary.yearlyLeaveDays)} দিন
            </p>
          </div>
          <table className="mt-6 w-full border-collapse border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">শুরু</th>
                <th className="border p-2">শেষ</th>
                <th className="border p-2">ধরন</th>
                <th className="border p-2">মন্তব্য</th>
              </tr>
            </thead>
            <tbody>
              {summary.leaves.length === 0 ? (
                <tr>
                  <td colSpan={4} className="border p-4 text-center text-gray-500">
                    কোনো ছুটির রেকর্ড নেই
                  </td>
                </tr>
              ) : (
                summary.leaves.map((l, i) => (
                  <tr key={i}>
                    <td className="border p-2 text-center">{l.LeaveStart}</td>
                    <td className="border p-2 text-center">{l.LeaveEnd}</td>
                    <td className="border p-2">{l.LeaveType ?? "—"}</td>
                    <td className="border p-2">{l.Comment ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-6 w-full cursor-pointer rounded-lg bg-green-600 py-2 text-white print:hidden"
          >
            প্রিন্ট / PDF
          </button>
        </article>
      )}
    </div>
  );
}
