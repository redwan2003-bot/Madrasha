"use client";

import { CurrentClassesView } from "@/components/monitoring/views/current-classes";
import { MainHubView } from "@/components/monitoring/views/main-hub";
import { MonitorView } from "@/components/monitoring/views/monitor";
import { NextClassesView } from "@/components/monitoring/views/next-classes";
import { OnLeaveView } from "@/components/monitoring/views/on-leave";
import { ReportsView } from "@/components/monitoring/views/reports";
import { TeacherListView } from "@/components/monitoring/views/teacher-list";
import { TeacherEntryView } from "@/components/monitoring/views/teacher-entry";
import { BatchSubmitBar } from "@/components/monitoring/batch-submit-bar";
import { useMonitoringDashboard } from "@/lib/hooks/use-monitoring-dashboard";
import { useLiveClock } from "@/lib/hooks/use-live-clock";
import { INSTITUTION } from "@/lib/monitoring/constants";
import {
  formatBnWeekday,
  formatClockNow,
  formatMyDate,
  formatTime,
  getCurrentPeriod,
  getNextPeriod,
  getOffHoursMessage,
  getSchoolDayMode,
  getNextWorkingDayInfo,
  parseClientDate,
} from "@/lib/monitoring/time";
import { hasSupabaseClientEnv } from "@/lib/supabase/env";
import { useEffect, useRef, useState } from "react";

export type MonitorViewId =
  | "main"
  | "current"
  | "next"
  | "teachers"
  | "leave"
  | "monitor"
  | "reports"
  | "teacher-entry";

export function MonitoringApp() {
  const { data, isLoading, isError, error, refetch } = useMonitoringDashboard();
  const now = useLiveClock();
  const [view, setView] = useState<MonitorViewId>("main");
  const lastPeriod = useRef<string | null>(null);

  useEffect(() => {
    const name = getCurrentPeriod(now)?.name ?? "off";
    if (lastPeriod.current !== null && lastPeriod.current !== name) {
      refetch();
    }
    lastPeriod.current = name;
  }, [now, refetch]);

  if (!hasSupabaseClientEnv()) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">সেটআপ প্রয়োজন</p>
        <p className="mt-1">`web/.env.local` এ Supabase কী যোগ করুন।</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        <p className="text-[var(--color-primary)]">ডেটা লোড হচ্ছে…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-red-800">{(error as Error)?.message ?? "ডেটা লোড করা যায়নি।"}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 cursor-pointer rounded-md bg-red-600 px-4 py-2 text-white"
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  if (view !== "main") {
    return (
      <div className="relative mx-auto w-full max-w-sm rounded-xl border border-gray-200 bg-gray-100 p-6 shadow-2xl">
        <BatchSubmitBar onSubmitted={() => refetch()} />
        {view === "current" && (
          <CurrentClassesView
            data={data}
            now={now}
            currentPeriod={getCurrentPeriod(now)}
            onBack={() => setView("main")}
          />
        )}
        {view === "next" && (
          <NextClassesView
            data={data}
            nextPeriod={getNextPeriod(getCurrentPeriod(now))}
            onBack={() => setView("main")}
          />
        )}
        {view === "teachers" && (
          <TeacherListView data={data} onBack={() => setView("main")} />
        )}
        {view === "leave" && <OnLeaveView data={data} onBack={() => setView("main")} />}
        {view === "monitor" && (
          <MonitorView data={data} now={now} onBack={() => setView("main")} />
        )}
        {view === "reports" && (
          <ReportsView data={data} onBack={() => setView("main")} />
        )}
        {view === "teacher-entry" && (
          <TeacherEntryView data={data} onBack={() => setView("main")} />
        )}
      </div>
    );
  }

  const currentPeriod = getCurrentPeriod(now);
  const dayMode = getSchoolDayMode(data, now);
  const officeLetter =
    data.specialMessages?.officeLetter ??
    data.specialMessages?.office_letter;

  return (
    <div className="mx-auto w-full max-w-sm rounded-xl border border-gray-200 bg-gray-100 p-6 shadow-2xl">
      <div className="text-center">
        <h1 className="text-xl text-gray-800">{INSTITUTION.name}</h1>
        <p className="text-sm text-gray-600">{INSTITUTION.address}</p>
      </div>

      <h2 className="mb-6 mt-4 text-center text-2xl font-bold text-teal-700">
        ক্লাস মনিটরিং অ্যাপ
      </h2>

      {officeLetter ? (
        <div className="my-4 overflow-hidden rounded-lg border-y border-yellow-300 bg-yellow-100 p-2">
          <p className="whitespace-nowrap text-blue-900" style={{ fontSize: "1.03em" }}>
            {officeLetter}
          </p>
        </div>
      ) : null}

      <div className="mb-6 flex items-center justify-between text-md text-black">
        <div className="space-y-2 text-left">
          <p>
            <strong>তারিখ:</strong> {formatMyDate(now)}
          </p>
          <p>
            <strong>বার:</strong> {formatBnWeekday(now)}
          </p>
          <p>
            <strong>সময়:</strong> {formatClockNow(now)}
          </p>
        </div>
        <img
          src={INSTITUTION.logoUrl}
          alt="লোগো"
          width={80}
          height={80}
          className="h-20 w-20 rounded-full border-2 border-teal-200 shadow-md"
        />
      </div>

      <HolidayBanner data={data} dayMode={dayMode} now={now} />

      {dayMode.mode === "normal" && (
        <>
          {currentPeriod ? (
            <div className="mb-8 rounded-lg border border-teal-200 bg-teal-50 p-3 text-center text-teal-700">
              <p>
                <strong>এখন চলছে:</strong>{" "}
                <span className="font-normal text-black">{currentPeriod.name}</span>
              </p>
            </div>
          ) : (
            <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <p className="text-red-600">{getOffHoursMessage(data, now)}</p>
            </div>
          )}
          <MainHubView onNavigate={setView} />
          <BatchSubmitBar onSubmitted={() => refetch()} />
        </>
      )}
    </div>
  );
}

function HolidayBanner({
  data,
  dayMode,
  now,
}: {
  data: import("@/types/database").MonitoringDashboard;
  dayMode: ReturnType<typeof getSchoolDayMode>;
  now: Date;
}) {
  const msgs = data.specialMessages ?? {};

  if (dayMode.mode === "special_holiday" && dayMode.holiday) {
    const h = dayMode.holiday;
    return (
      <div className="mb-6 rounded-lg border-t-4 border-blue-500 bg-blue-100 px-4 py-3 text-blue-900 shadow-md">
        <div className="space-y-2 rounded-lg bg-blue-50 p-4 text-center">
          <h4 className="text-xl font-bold">{h.LeaveType}</h4>
          <p>
            <strong>সময়কাল:</strong>{" "}
            {formatMyDate(parseClientDate(h.LeaveStart) ?? now)} থেকে{" "}
            {formatMyDate(parseClientDate(h.LeaveEnd) ?? now)}
          </p>
          {h.Comment ? (
            <p className="font-semibold text-teal-700">
              <strong>কার্যক্রম:</strong> {h.Comment}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (dayMode.mode === "upcoming_holiday" && dayMode.holiday) {
    return (
      <div className="mb-6 rounded-b border-amber-400 border-t-4 bg-amber-100 p-4 text-center font-bold text-amber-900 shadow-lg">
        <strong>দৃষ্টি আকর্ষণ:</strong>
        <br />
        আগামীকাল ({formatMyDate(parseClientDate(dayMode.holiday.LeaveStart) ?? now)}){" "}
        {dayMode.holiday.LeaveType}
      </div>
    );
  }

  if (dayMode.mode === "weekly_holiday") {
    const next = getNextWorkingDayInfo(data, now);
    return (
      <div className="mb-6 space-y-4 rounded-lg bg-white p-4 text-center">
        {dayMode.isFriday ? (
          <>
            <h2 className="text-xl font-bold text-gray-800">শুক্রবার: সাপ্তাহিক ছুটি</h2>
            <img
              src="https://i.imgur.com/0nZCyOn.jpg"
              alt="জুম্মা মোবারক"
              className="mx-auto rounded-lg shadow-md"
            />
            {msgs.fridayMessage ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                {msgs.fridayMessage}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-800">শনিবার: সাপ্তাহিক ছুটি</h2>
            <img
              src="https://i.imgur.com/NMtDl2v.jpg"
              alt="সাপ্তাহিক ছুটি"
              className="mx-auto rounded-lg shadow-md"
            />
            <p className="rounded-lg bg-gray-200 p-3 font-semibold">
              পরবর্তী ক্লাস শুরু {next.date}, {next.day} সকাল ১০:৩০ টায়
            </p>
            {msgs.saturdayMessage ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-teal-800">
                {msgs.saturdayMessage}
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }

  return null;
}
