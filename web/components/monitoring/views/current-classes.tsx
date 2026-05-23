"use client";

import { ClassCards } from "@/components/monitoring/class-cards";
import { offPeriodTeachers } from "@/lib/monitoring/logic";
import type { ClassPeriod } from "@/lib/monitoring/constants";
import { INSTITUTION } from "@/lib/monitoring/constants";
import { formatTime } from "@/lib/monitoring/time";
import { BtnBack, SectionTitle } from "@/components/monitoring/ui";
import type { MonitoringDashboard } from "@/types/database";
import { useState } from "react";

export function CurrentClassesView({
  data,
  now,
  currentPeriod,
  onBack,
}: {
  data: MonitoringDashboard;
  now: Date;
  currentPeriod: ClassPeriod | null;
  onBack: () => void;
}) {
  const [showOff, setShowOff] = useState(false);
  const offTeachers = offPeriodTeachers(data, now);

  return (
    <section>
      <SectionTitle>একনজরে চলমান ক্লাসসমূহ</SectionTitle>
      <img
        src={INSTITUTION.logoUrl}
        alt="লোগো"
        className="mx-auto mb-4 h-20 w-20 rounded-full"
      />
      {currentPeriod && (
        <div className="mb-6 space-y-2 text-center text-md text-gray-700">
          <p>
            <strong>এখন চলছে:</strong>{" "}
            <span className="font-normal text-black">{currentPeriod.name}</span>
          </p>
          <p>
            <strong>সময়কাল:</strong>{" "}
            <span className="font-normal text-black">
              {formatTime(currentPeriod.start)} থেকে {formatTime(currentPeriod.end)}
            </span>
          </p>
        </div>
      )}
      {currentPeriod ? (
        <ClassCards data={data} periodName={currentPeriod.name} variant="current" />
      ) : (
        <p className="text-center text-lg text-gray-500">এখন কোনো ক্লাস চলছে না।</p>
      )}

      <button
        type="button"
        onClick={() => setShowOff((v) => !v)}
        className="mt-8 w-full cursor-pointer rounded-full bg-[#6d423a] py-3 text-lg text-white shadow-md transition-colors duration-200 hover:opacity-90"
      >
        এখন যাদের অফ পিরিয়ড
      </button>
      {showOff && (
        <div className="mt-4 space-y-4">
          {offTeachers.length === 0 ? (
            <p className="text-center text-gray-500">এই মুহূর্তে কোনো শিক্ষক অফ পিরিয়ডে নেই।</p>
          ) : (
            offTeachers.map((t) => (
              <div
                key={t.IndexNo}
                className="space-y-1 rounded-xl bg-[#fff3c9] p-4 text-center shadow-md"
              >
                <p className="text-lg font-bold text-gray-800">{t.TeacherFN}</p>
                <p className="text-md text-gray-700">{t.Designation}</p>
                {t.MobileNo && (
                  <a
                    href={`tel:${t.MobileNo}`}
                    className="mt-2 inline-block cursor-pointer rounded-full bg-teal-600 px-4 py-2 text-sm text-white"
                  >
                    কল করুন
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
      <BtnBack onClick={onBack} />
    </section>
  );
}
