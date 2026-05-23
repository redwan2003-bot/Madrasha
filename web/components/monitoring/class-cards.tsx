"use client";

import { attendanceForClass, reportAttendance } from "@/lib/monitoring/logic";
import { toBengaliNumber } from "@/lib/bengali";
import type { MonitoringDashboard, RoutineRow } from "@/types/database";

export function ClassCards({
  data,
  periodName,
  variant,
}: {
  data: MonitoringDashboard;
  periodName: string;
  variant: "current" | "next";
}) {
  if (["সমাবেশ ও প্রস্তুতি", "টিফিন"].includes(periodName)) {
    if (variant === "current") {
      return <p className="text-center text-gray-500">{periodName} চলছে।</p>;
    }
    return null;
  }

  const classes = (data.routine ?? []).filter(
    (c) => c.Period === periodName && c.Sub,
  );

  if (classes.length === 0) {
    return <p className="text-center text-gray-500">এই পিরিয়ডে কোনো ক্লাস পাওয়া যায়নি।</p>;
  }

  const bg = variant === "current" ? "bg-[#E8FFFB]" : "bg-[#fcf5ca]";

  return (
    <div className="space-y-4">
      {classes.map((c) => (
        <ClassCard key={`${c.Class}-${c.Period}`} data={data} row={c} bg={bg} />
      ))}
    </div>
  );
}

function ClassCard({
  data,
  row,
  bg,
}: {
  data: MonitoringDashboard;
  row: RoutineRow;
  bg: string;
}) {
  const att = attendanceForClass(data, row.Class ?? "");
  const count = att ? reportAttendance(att) : null;

  return (
    <div className={`space-y-1 rounded-xl p-4 text-center shadow-md ${bg}`}>
      <p className="text-lg font-bold text-gray-800">{row.Class}</p>
      <p className="text-md text-purple-800">{row.TeacherFN}</p>
      <p className="text-md text-gray-700">{row.Sub}</p>
      {count != null && (
        <p className="mt-1 text-sm text-gray-700">
          শিক্ষার্থী উপস্থিতি: {toBengaliNumber(count)} জন
        </p>
      )}
    </div>
  );
}
