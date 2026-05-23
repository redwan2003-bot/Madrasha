"use client";

import { CLASS_LEVELS, CLASS_STRUCTURE } from "@/lib/monitoring/class-structure";
import {
  buildMonitorReportText,
  currentPeriodName,
  reportPayloadFromForm,
  type ReportFormState,
} from "@/lib/monitoring/report-builder";
import { createClient } from "@/lib/supabase/client";
import type { MonitoringDashboard, TeacherPublic } from "@/types/database";
import { useEffect, useMemo, useState } from "react";

const NON_CLASS_PERIODS = ["সমাবেশ ও প্রস্তুতি", "টিফিন"];

export function MonitorFormModal({
  open,
  monitor,
  data,
  onClose,
  onSuccess,
  onSaveBatch,
}: {
  open: boolean;
  monitor: TeacherPublic;
  data: MonitoringDashboard;
  onClose: () => void;
  onSuccess: () => void;
  onSaveBatch: (payload: ReturnType<typeof reportPayloadFromForm>) => void;
}) {
  const period = currentPeriodName();
  const isClassTime = Boolean(period && !NON_CLASS_PERIODS.includes(period));

  const [level, setLevel] = useState("");
  const [className, setClassName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [attendance, setAttendance] = useState("");
  const [report, setReport] = useState<ReportFormState>({
    ok: false,
    noStudents: false,
    absent: false,
    late: false,
    lateMin: "",
    early: false,
    earlyMin: "",
    extra: false,
    extraText: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classesForLevel = useMemo(
    () => (level ? CLASS_STRUCTURE[level] ?? [] : []),
    [level],
  );

  useEffect(() => {
    if (!open) return;
    setLevel("");
    setClassName("");
    setTeacherName("");
    setAttendance("");
    setReport({
      ok: false,
      noStudents: false,
      absent: false,
      late: false,
      lateMin: "",
      early: false,
      earlyMin: "",
      extra: false,
      extraText: "",
    });
    setError(null);
  }, [open, monitor.IndexNo]);

  useEffect(() => {
    if (!className) {
      setTeacherName("");
      return;
    }
    const row = (data.routine ?? []).find(
      (r) => r.Period === period && r.Class === className,
    );
    setTeacherName(row?.TeacherFN ?? "শিক্ষক পাওয়া যায়নি");
  }, [className, data.routine, period]);

  if (!open) return null;

  function buildPayload() {
    return reportPayloadFromForm({
      monitorIndex: monitor.IndexNo,
      period,
      className,
      teacherName,
      attendance: Number(attendance),
      reportText: buildMonitorReportText(report),
    });
  }

  function saveBatch() {
    if (!className || !attendance) {
      setError("শ্রেণি ও উপস্থিতি পূরণ করুন।");
      return;
    }
    onSaveBatch(buildPayload());
    onClose();
  }

  async function submit() {
    if (!className || !attendance) {
      setError("শ্রেণি ও উপস্থিতি পূরণ করুন।");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const payload = buildPayload();

    const { data: result, error: rpcError } = await supabase.rpc(
      "submit_monitor_report",
      {
        p_date: payload.Date,
        p_period: payload.Period,
        p_class: payload.Class,
        p_teacher_name: payload.TeacherName,
        p_attendance: payload.NumberOfAttend,
        p_monitor_report: payload.monitorReport,
        p_monitor_index: payload.monitorIndex,
      },
    );

    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    const res = result as { status?: string; message?: string };
    if (res?.status === "error") {
      setError(res.message ?? "জমা দেওয়া যায়নি");
      return;
    }
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-center text-xl text-teal-700">মনিটর ফর্ম</h3>
        {!isClassTime && (
          <p className="mb-3 rounded-md border-l-4 border-yellow-500 bg-yellow-100 p-3 text-center text-sm text-yellow-800">
            এখন ক্লাস পর্যবেক্ষণের সময় নয় ({period})।
          </p>
        )}
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700">স্তর</label>
            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setClassName("");
              }}
              className="mt-1 w-full cursor-pointer rounded-md border p-2"
              disabled={!isClassTime}
            >
              <option value="">-- স্তর --</option>
              {CLASS_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">শ্রেণি</label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="mt-1 w-full cursor-pointer rounded-md border p-2"
              disabled={!level || !isClassTime}
            >
              <option value="">-- শ্রেণি --</option>
              {classesForLevel.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">ক্লাসের শিক্ষক</label>
            <input
              readOnly
              value={teacherName}
              className="mt-1 w-full rounded-md border bg-white p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">শিক্ষার্থী উপস্থিতি</label>
            <input
              type="number"
              min={0}
              value={attendance}
              onChange={(e) => setAttendance(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
              disabled={!isClassTime}
            />
          </div>
          <ReportCheckboxes state={report} onChange={setReport} disabled={!isClassTime} />
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg bg-gray-500 px-4 py-2 text-white"
            >
              বন্ধ
            </button>
            <button
              type="button"
              onClick={saveBatch}
              disabled={!isClassTime}
              className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              সেভ করুন
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !isClassTime}
              className="cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {busy ? "জমা হচ্ছে…" : "জমা দিন"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportCheckboxes({
  state,
  onChange,
  disabled,
}: {
  state: ReportFormState;
  onChange: (s: ReportFormState) => void;
  disabled: boolean;
}) {
  const set = (patch: Partial<ReportFormState>) => onChange({ ...state, ...patch });
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-gray-700">রিপোর্ট</legend>
      {[
        ["ok", "ঠিক আছে"],
        ["noStudents", "শিক্ষার্থী নেই"],
        ["absent", "শিক্ষক অনুপস্থিত"],
      ].map(([key, label]) => (
        <label key={key} className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={state[key as keyof ReportFormState] as boolean}
            onChange={(e) => set({ [key]: e.target.checked })}
          />
          <span>{label}</span>
        </label>
      ))}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={state.late}
          onChange={(e) => set({ late: e.target.checked })}
        />
        <input
          type="number"
          className="w-16 rounded border p-1 text-center"
          value={state.lateMin}
          onChange={(e) => set({ lateMin: e.target.value })}
        />
        <span>মিনিট পরে প্রবেশ</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={state.early}
          onChange={(e) => set({ early: e.target.checked })}
        />
        <input
          type="number"
          className="w-16 rounded border p-1 text-center"
          value={state.earlyMin}
          onChange={(e) => set({ earlyMin: e.target.value })}
        />
        <span>মিনিট আগে প্রস্থান</span>
      </label>
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          className="mt-1"
          checked={state.extra}
          onChange={(e) => set({ extra: e.target.checked })}
        />
        <textarea
          rows={2}
          className="w-full rounded border p-1"
          placeholder="আরও তথ্য…"
          value={state.extraText}
          onChange={(e) => set({ extraText: e.target.value })}
        />
      </label>
    </fieldset>
  );
}
