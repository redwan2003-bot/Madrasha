"use client";

import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { createClient } from "@/lib/supabase/client";
import { toBengaliNumber } from "@/lib/bengali";
import { BtnBack, SectionTitle } from "@/components/monitoring/ui";
import type { MonitoringDashboard, TeacherPublic } from "@/types/database";
import { useEffect, useState } from "react";

export function TeacherEntryView({
  data,
  onBack,
}: {
  data: MonitoringDashboard;
  onBack: () => void;
}) {
  const { data: profile } = useUserProfile();
  const [teacher, setTeacher] = useState<TeacherPublic | null>(null);
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveType, setLeaveType] = useState("ব্যক্তিগত ছুটি");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.teacher_index) return;
    const linked = (data.allTeachers ?? []).find(
      (t) => t.IndexNo === profile.teacher_index,
    );
    if (linked) setTeacher(linked);
  }, [profile?.teacher_index, data.allTeachers]);

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveStart || !leaveEnd) return;
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("submit_leave_request", {
      p_start: leaveStart,
      p_end: leaveEnd,
      p_leave_type: leaveType,
      p_comment: "",
    });
    if (error) setMsg(error.message);
    else setMsg("ছুটির আবেদন জমা হয়েছে।");
  }

  return (
    <section>
      <SectionTitle>শিক্ষক প্রবেশ</SectionTitle>
      {!profile?.teacher_index ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-medium">প্রোফাইল লিংক নেই</p>
          <p className="mt-1 text-[var(--color-muted)]">
            অ্যাডমিনকে আপনার Google ইমেইলকে <code>teachers</code> টেবিলের ইনডেক্সের সাথে
            যুক্ত করতে বলুন (<code>profiles.teacher_index</code>)।
          </p>
        </div>
      ) : teacher ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-6 text-center shadow-md">
            <p className="text-xl font-bold text-teal-800">{teacher.TeacherFN}</p>
            <p className="text-md text-purple-800">{teacher.Designation}</p>
            <p className="text-sm text-gray-600">ইনডেক্স: {teacher.IndexNo}</p>
            <p className="text-sm text-gray-600">
              সাপ্তাহিক ক্লাস: {toBengaliNumber(teacher.weeklyClassCount)}টি
            </p>
          </div>

          <form onSubmit={submitLeave} className="space-y-3 rounded-lg border bg-white p-4">
            <h4 className="font-semibold text-teal-800">ছুটির আবেদন</h4>
            <input
              type="date"
              value={leaveStart}
              onChange={(e) => setLeaveStart(e.target.value)}
              className="w-full rounded border p-2"
              required
            />
            <input
              type="date"
              value={leaveEnd}
              onChange={(e) => setLeaveEnd(e.target.value)}
              className="w-full rounded border p-2"
              required
            />
            <input
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full rounded border p-2"
            />
            <button
              type="submit"
              className="w-full cursor-pointer rounded-full bg-teal-600 py-2 text-white"
            >
              ছুটি জমা দিন
            </button>
            {msg && <p className="text-sm text-center text-gray-700">{msg}</p>}
          </form>
        </div>
      ) : null}
      <BtnBack onClick={onBack} />
    </section>
  );
}
