"use client";

import { ClassCards } from "@/components/monitoring/class-cards";
import type { ClassPeriod } from "@/lib/monitoring/constants";
import { formatTime } from "@/lib/monitoring/time";
import { BtnBack, SectionTitle } from "@/components/monitoring/ui";
import type { MonitoringDashboard } from "@/types/database";

export function NextClassesView({
  data,
  nextPeriod,
  onBack,
}: {
  data: MonitoringDashboard;
  nextPeriod: ClassPeriod | null;
  onBack: () => void;
}) {
  return (
    <section>
      <SectionTitle>একনজরে পরবর্তী ক্লাসসমূহ</SectionTitle>
      {nextPeriod ? (
        <>
          <div className="mb-6 space-y-2 text-center text-md text-gray-700">
            <p>
              <strong>পরবর্তী পিরিয়ড:</strong>{" "}
              <span className="font-normal text-black">{nextPeriod.name}</span>
            </p>
            <p>
              <strong>সময়কাল:</strong>{" "}
              <span className="font-normal text-black">
                {formatTime(nextPeriod.start)} থেকে {formatTime(nextPeriod.end)}
              </span>
            </p>
          </div>
          <ClassCards data={data} periodName={nextPeriod.name} variant="next" />
        </>
      ) : (
        <p className="text-center text-lg text-gray-500">এখন কোনো ক্লাস চলছে না।</p>
      )}
      <BtnBack onClick={onBack} />
    </section>
  );
}
