"use client";

import { reportClass, reportComment, reportPeriod } from "@/lib/monitoring/logic";
import { BtnBack, SectionTitle } from "@/components/monitoring/ui";
import type { MonitoringDashboard } from "@/types/database";

export function ReportsView({
  data,
  onBack,
}: {
  data: MonitoringDashboard;
  onBack: () => void;
}) {
  const reports = data.monitoringReport ?? [];

  return (
    <section>
      <SectionTitle>মনিটরিং রিপোর্ট</SectionTitle>
      <div className="my-4 overflow-hidden rounded-lg border-y border-teal-200 bg-teal-50 p-2">
        <p className="text-center text-sm text-black">
          আজকের তথ্যভিত্তিক রিপোর্ট (অডিট-যোগ্য মন্তব্য)
        </p>
      </div>
      <div className="space-y-3">
        {reports.length === 0 ? (
          <p className="text-center text-gray-500">আজ কোনো মনিটরিং রিপোর্ট নেই।</p>
        ) : (
          reports.map((r, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm"
            >
              <p className="font-semibold text-gray-800">
                {reportPeriod(r)} — {reportClass(r)}
              </p>
              <p className="mt-1 text-gray-700">{reportComment(r)}</p>
            </div>
          ))
        )}
      </div>
      <BtnBack onClick={onBack} />
    </section>
  );
}
