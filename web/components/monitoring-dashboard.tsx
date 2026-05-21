"use client";

import { useMonitoringDashboard } from "@/lib/hooks/use-monitoring-dashboard";
import { toBengaliNumber } from "@/lib/bengali";

export function MonitoringDashboard() {
  const { data, isLoading, isError, error, refetch, date } = useMonitoringDashboard();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">সেটআপ প্রয়োজন</p>
        <p className="mt-1">
          <code className="text-xs">web/.env.local</code> এ Supabase URL ও anon key যোগ করুন।
          বিস্তারিত: <code className="text-xs">README-SUPABASE.md</code>
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"
          role="status"
          aria-label="লোড হচ্ছে"
        />
        <p className="text-[var(--color-primary)]">ডেটা লোড হচ্ছে…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-red-800">
          {(error as Error)?.message ?? "ডেটা লোড করা যায়নি।"}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 cursor-pointer rounded-md bg-red-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-red-700"
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  const rosterEntries = Object.entries(data.dutyRoster ?? {});
  const teachers = data.allTeachers?.length ?? 0;
  const reports = data.todaysAttendance?.length ?? 0;

  return (
    <div className="space-y-6">
      <header className="text-center">
        <p className="text-xs text-[var(--color-muted)]">
          {data.meta?.dayBn} · {date}
        </p>
        <h1 className="text-xl font-bold text-[var(--color-primary)]">
          ক্লাস মনিটরিং
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          শিবগঞ্জ ফাযিল ডিগ্রী মাদ্রাসা
        </p>
      </header>

      <section className="grid grid-cols-3 gap-3 text-center">
        <StatCard label="শিক্ষক" value={toBengaliNumber(teachers)} />
        <StatCard label="আজকের রিপোর্ট" value={toBengaliNumber(reports)} />
        <StatCard label="মনিটর ডিউটি" value={toBengaliNumber(rosterEntries.length)} />
      </section>

      {rosterEntries.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-teal-800">আজকের ডিউটি রোস্টার</h2>
          <ul className="divide-y divide-gray-100">
            {rosterEntries.map(([period, monitor]) => (
              <li
                key={period}
                className="flex justify-between py-2 text-sm"
              >
                <span className="font-medium">{period}</span>
                <span>
                  {monitor.name} ({monitor.index})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">পরবর্তী ধাপ</p>
        <p className="mt-1 text-[var(--color-muted)]">
          মূল পাতার বাকি UI (ক্লাস কার্ড, মনিটর লগইন, রিপোর্ট জমা) legacy{" "}
          <code className="text-xs">index.html</code> থেকে ধাপে ধাপে এখানে স্থানান্তর করা হবে।
          Realtime ও RPC ইতিমধ্যে সংযুক্ত।
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-2 py-3 shadow-sm">
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p className="text-lg font-bold text-[var(--color-primary)]">{value}</p>
    </div>
  );
}
