"use client";

import { personalLeaveToday } from "@/lib/monitoring/logic";
import { parseClientDate, formatMyDate } from "@/lib/monitoring/time";
import { BtnBack, SectionTitle } from "@/components/monitoring/ui";
import type { MonitoringDashboard } from "@/types/database";

export function OnLeaveView({
  data,
  onBack,
}: {
  data: MonitoringDashboard;
  onBack: () => void;
}) {
  const list = personalLeaveToday(data);

  return (
    <section>
      <SectionTitle>ছুটিতে আছেন যারা</SectionTitle>
      <div className="space-y-4">
        {list.length === 0 ? (
          <p className="text-center text-gray-500">আজ কোনো শিক্ষক ব্যক্তিগত ছুটিতে নেই।</p>
        ) : (
          list.map((t, i) => {
            const start = parseClientDate(t.LeaveStart);
            const end = parseClientDate(t.LeaveEnd);
            const range =
              start && end
                ? `${formatMyDate(start)} থেকে ${formatMyDate(end)}`
                : "তারিখ পাওয়া যায়নি";
            return (
              <div
                key={`${t.Index}-${i}`}
                className="space-y-1 rounded-xl bg-yellow-100 p-4 text-center shadow-md"
              >
                <p className="text-lg font-bold">{t.TeacherFN ?? "নাম নেই"}</p>
                <p className="text-sm">পদবী: {t.Designation ?? "তথ্য নেই"}</p>
                <p className="text-sm">ছুটির ধরন: {t.LeaveType ?? "অনির্দিষ্ট"}</p>
                <p className="text-sm">সময়কাল: {range}</p>
                {t.Comment ? (
                  <p className="mt-1 rounded bg-yellow-50 p-2 text-sm">
                    <strong>বদলি শিক্ষক:</strong> {t.Comment}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
      <BtnBack onClick={onBack} />
    </section>
  );
}
