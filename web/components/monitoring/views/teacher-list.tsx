"use client";

import { TEACHER_FILTER_OPTIONS } from "@/lib/monitoring/constants";
import { filterTeachers } from "@/lib/monitoring/logic";
import { toBengaliNumber } from "@/lib/bengali";
import { BtnBack, SectionTitle } from "@/components/monitoring/ui";
import type { MonitoringDashboard } from "@/types/database";
import { useState } from "react";

export function TeacherListView({
  data,
  onBack,
}: {
  data: MonitoringDashboard;
  onBack: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const teachers = filterTeachers(data.allTeachers ?? [], filter);

  return (
    <section>
      <SectionTitle>শিক্ষক-কর্মচারি তালিকা</SectionTitle>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-4 w-full cursor-pointer rounded-lg border bg-white p-3 text-center"
      >
        {TEACHER_FILTER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="space-y-4 pb-20">
        {teachers.length === 0 ? (
          <p className="text-center text-gray-500">এই ক্যাটাগরিতে কোনো শিক্ষক/কর্মচারী নেই।</p>
        ) : (
          teachers.map((t) => (
            <div
              key={t.IndexNo}
              className="space-y-2 rounded-xl bg-[#F8FFEB] p-4 text-center shadow-md"
            >
              <p className="text-xl font-bold text-green-700">{t.TeacherFN}</p>
              <p className="text-lg text-purple-800">
                {t.Designation}
                {t.TeacherSub ? `, ${t.TeacherSub}` : ""}
              </p>
              <p className="text-md text-black">ইনডেক্স: {t.IndexNo}</p>
              <p className="text-md text-black">স্তর: {t.Grade ?? "তথ্য নেই"}</p>
              {t.Grade !== "কর্মচারি ৪র্থ গ্রেড" &&
                t.Grade !== "কর্মচারি ৩য় গ্রেড" && (
                  <p className="text-md text-black">
                    সাপ্তাহিক ক্লাস সংখ্যা: {toBengaliNumber(t.weeklyClassCount)}টি
                  </p>
                )}
              {t.MobileNo && (
                <a
                  href={`tel:${t.MobileNo}`}
                  className="inline-block cursor-pointer rounded-full bg-teal-600 px-3 py-2 text-sm text-white"
                >
                  কল করুন
                </a>
              )}
            </div>
          ))
        )}
      </div>
      <BtnBack onClick={onBack} />
    </section>
  );
}
