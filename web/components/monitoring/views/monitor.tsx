"use client";

import { MonitorFormModal } from "@/components/monitoring/monitor-form-modal";
import {
  useSavedReports,
  type SavedReport,
} from "@/components/monitoring/batch-submit-bar";
import { BtnBack, SectionTitle } from "@/components/monitoring/ui";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { CLASS_PERIODS } from "@/lib/monitoring/constants";
import {
  teamDay,
  teamIndex,
  teamRole,
  uniqueDutyMonitors,
} from "@/lib/monitoring/logic";
import {
  formatBnWeekday,
  getCurrentPeriod,
  isAfterSchool,
} from "@/lib/monitoring/time";
import type { MonitoringDashboard, TeacherPublic } from "@/types/database";
import Link from "next/link";
import { useState } from "react";

export function MonitorView({
  data,
  now,
  onBack,
}: {
  data: MonitoringDashboard;
  now: Date;
  onBack: () => void;
}) {
  const { data: profile } = useUserProfile();
  const { add } = useSavedReports();
  const [activeMonitor, setActiveMonitor] = useState<TeacherPublic | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const roster = data.dutyRoster ?? {};
  const entries = Object.entries(roster);
  const afterSchool = isAfterSchool(now);
  const teachingPeriods = CLASS_PERIODS.filter(
    (p) => !["সমাবেশ ও প্রস্তুতি", "টিফিন"].includes(p.name),
  );
  const currentPeriod = getCurrentPeriod(now);
  const dayBn = formatBnWeekday(now);
  const monitorIndices = uniqueDutyMonitors(data);

  const canOpenForm = (index: string) => {
    if (!profile) return false;
    if (profile.role === "admin" || profile.role === "office") return true;
    return profile.teacher_index === index;
  };

  function openForm(index: string) {
    const teacher = (data.allTeachers ?? []).find((t) => t.IndexNo === index);
    if (!teacher) return;
    if (!profile) {
      setHint("মনিটর ফর্মের জন্য Google দিয়ে লগইন করুন।");
      return;
    }
    if (!canOpenForm(index)) {
      setHint("আপনার প্রোফাইল এই মনিটরের সাথে মিলছে না, অথবা আজ ডিউটিতে নেই।");
      return;
    }
    setHint(null);
    setActiveMonitor(teacher);
    setFormOpen(true);
  }

  return (
    <section>
      <SectionTitle>ক্লাস মনিটর করুন</SectionTitle>

      {hint && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-900">
          {hint}{" "}
          <Link href="/login" className="font-medium text-teal-700 underline">
            লগইন
          </Link>
        </p>
      )}

      <h4 className="mb-2 mt-4 text-center text-xl font-bold text-gray-800">
        আজকের ডিউটি তালিকা
      </h4>
      <div className="mb-6 rounded-lg bg-white p-3 shadow-inner">
        {afterSchool ? (
          <p className="rounded-lg bg-yellow-100 p-3 text-center text-gray-600">
            আজকের ডিউটি সময় শেষ।
          </p>
        ) : entries.length === 0 ? (
          <p className="text-center text-gray-500">আজ কোনো ডিউটি তালিকা তৈরি হয়নি।</p>
        ) : (
          <>
            <p className="mb-2 text-center text-xs text-red-600">
              অ্যাপ দ্বারা স্বয়ংক্রিয়ভাবে নির্ধারিত।
            </p>
            <table className="w-full border-collapse border text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border py-2 text-center">পিরিয়ড</th>
                  <th className="border px-2 py-2 text-center">মনিটর</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([period, m]) => (
                  <tr key={period} className="hover:bg-gray-50">
                    <td className="border py-2 text-center font-semibold">{period}</td>
                    <td className="border px-2 py-2 text-center text-blue-700">
                      {m.name} ({m.index})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <h4 className="mb-2 mt-8 text-center text-xl font-bold text-gray-800">আজকের মনিটরগণ</h4>
      <div className="space-y-4">
        {afterSchool ? (
          <p className="text-center text-gray-500">মনিটরিং সময় আজকের মতো সমাপ্ত।</p>
        ) : monitorIndices.length === 0 ? (
          <p className="text-center text-gray-500">আজ কোনো মনিটরের দায়িত্ব নির্ধারিত নেই।</p>
        ) : (
          monitorIndices.map((index) => {
            const teacher = (data.allTeachers ?? []).find((t) => t.IndexNo === index);
            if (!teacher) return null;
            const perm = (data.monitoringTeam ?? []).find(
              (m) => teamIndex(m) === index,
            );
            const isPermanent =
              perm && teamDay(perm).includes(dayBn);
            const role = isPermanent
              ? teamRole(perm) || "টিম সদস্য"
              : "সাময়িক দায়িত্ব";
            const assigned = new Set(
              (data.routine ?? [])
                .filter((c) => c.TeacherFN === teacher.TeacherFN && c.Sub)
                .map((c) => c.Period),
            );
            const off = teachingPeriods
              .filter((p) => !assigned.has(p.name))
              .map((p) => p.name)
              .join(", ");
            const busy =
              currentPeriod && assigned.has(currentPeriod.name);

            return (
              <button
                key={index}
                type="button"
                onClick={() => openForm(index)}
                className={`w-full cursor-pointer space-y-2 rounded-xl p-4 text-center shadow-md transition-colors ${
                  busy
                    ? "border border-red-200 bg-red-100"
                    : "bg-teal-50 hover:bg-teal-100"
                }`}
              >
                <p className="text-xl font-bold text-teal-800">
                  {teacher.TeacherFN} ({teacher.IndexNo})
                </p>
                <p
                  className={`text-md ${
                    role === "টিম প্রধান"
                      ? "font-bold text-purple-700"
                      : role === "সাময়িক দায়িত্ব"
                        ? "font-bold text-orange-700"
                        : "text-gray-700"
                  }`}
                >
                  {role}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>অফ পিরিয়ড:</strong> {off || "নেই"}
                </p>
                <p className="text-xs text-teal-700">রিপোর্ট দিতে ট্যাপ করুন</p>
              </button>
            );
          })
        )}
      </div>

      {activeMonitor && (
        <MonitorFormModal
          open={formOpen}
          monitor={activeMonitor}
          data={data}
          onClose={() => setFormOpen(false)}
          onSuccess={() => setFormOpen(false)}
          onSaveBatch={(payload) => add(payload as SavedReport)}
        />
      )}

      <BtnBack onClick={onBack} />
    </section>
  );
}
