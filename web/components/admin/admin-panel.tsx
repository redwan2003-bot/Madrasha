"use client";

import { TeacherPicker } from "@/components/shared/teacher-picker";
import { createClient } from "@/lib/supabase/client";
import { useMonitoringDashboard } from "@/lib/hooks/use-monitoring-dashboard";
import type { TeacherPublic } from "@/types/database";
import { useEffect, useState } from "react";

const MESSAGE_KEYS = [
  { key: "OfficeLetter", label: "স্ক্রলিং নোটিশ (মূল পাতা)" },
  { key: "fridayMessage", label: "শুক্রবার বার্তা" },
  { key: "saturdayMessage", label: "শনিবার বার্তা" },
  { key: "MssToTeachers", label: "শিক্ষকদের বার্তা" },
  { key: "LeaveMessage", label: "ছুটির পাতার বার্তা" },
  { key: "MonitorInstruction", label: "মনিটর নির্দেশনা" },
];

const DAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার"];

export function AdminPanel() {
  const [tab, setTab] = useState<"manage" | "monitoring">("manage");
  const [teacher, setTeacher] = useState<TeacherPublic | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [msgKey, setMsgKey] = useState(MESSAGE_KEYS[0].key);
  const [msgText, setMsgText] = useState("");
  const [savedMsgs, setSavedMsgs] = useState<{ id: number; message_text: string }[]>([]);

  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveType, setLeaveType] = useState("নৈমিত্তিক");
  const [leaveComment, setLeaveComment] = useState("");

  const [monDays, setMonDays] = useState<string[]>([]);
  const [monRole, setMonRole] = useState("");
  const [monStatus, setMonStatus] = useState<"On" | "Off">("On");

  const [editName, setEditName] = useState("");
  const [editAddr, setEditAddr] = useState("");
  const [editSub, setEditSub] = useState("");
  const [editMobile, setEditMobile] = useState("");

  const [monDate, setMonDate] = useState(new Date().toISOString().slice(0, 10));
  const { refetch } = useMonitoringDashboard();

  useEffect(() => {
    const supabase = createClient();
    supabase.from("special_messages").select("message_key, message_value").then(({ data }) => {
      const row = data?.find((r) => r.message_key === msgKey);
      if (row) setMsgText(row.message_value ?? "");
    });
    supabase.from("saved_messages").select("id, message_text").order("id", { ascending: false }).then(({ data }) => {
      if (data) setSavedMsgs(data as { id: number; message_text: string }[]);
    });
  }, [msgKey]);

  useEffect(() => {
    if (!teacher) return;
    setEditName(teacher.TeacherFN);
    setEditAddr(teacher.TcrAddress ?? "");
    setEditSub(teacher.TeacherSub ?? "");
    setEditMobile(teacher.MobileNo ?? "");
    const supabase = createClient();
    supabase
      .from("monitoring_team")
      .select("monitor_day, role, status")
      .eq("teacher_index", teacher.IndexNo)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMonDays((data.monitor_day ?? "").split(",").map((s: string) => s.trim()).filter(Boolean));
          setMonRole(data.role ?? "");
          setMonStatus((data.status as "On" | "Off") ?? "On");
        } else {
          setMonDays([]);
          setMonRole("");
          setMonStatus("On");
        }
      });
  }, [teacher]);

  async function saveMessage() {
    const supabase = createClient();
    const { error } = await supabase
      .from("special_messages")
      .upsert({ message_key: msgKey, message_value: msgText });
    setMsg(error ? error.message : "সিস্টেম বার্তা আপডেট হয়েছে");
  }

  async function addSavedMessage() {
    if (!msgText.trim()) return;
    const supabase = createClient();
    await supabase.from("saved_messages").insert({ message_text: msgText });
    const { data } = await supabase.from("saved_messages").select("id, message_text").order("id", { ascending: false });
    if (data) setSavedMsgs(data as { id: number; message_text: string }[]);
    setMsg("নতুন বার্তা সংরক্ষিত");
  }

  async function deleteSaved(id: number) {
    const supabase = createClient();
    await supabase.from("saved_messages").delete().eq("id", id);
    setSavedMsgs((s) => s.filter((x) => x.id !== id));
  }

  async function addLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!teacher) return;
    const supabase = createClient();
    const { error } = await supabase.from("leaves").insert({
      teacher_index: teacher.IndexNo,
      leave_start: leaveStart,
      leave_end: leaveEnd,
      leave_type: leaveType,
      comment: leaveComment,
    });
    setMsg(error ? error.message : "ছুটি যোগ হয়েছে");
  }

  async function saveMonitor(e: React.FormEvent) {
    e.preventDefault();
    if (!teacher) return;
    const supabase = createClient();
    const payload = {
      teacher_index: teacher.IndexNo,
      monitor_day: monDays.join(", "),
      role: monRole || null,
      status: monStatus,
    };
    const { error } = await supabase.from("monitoring_team").upsert(payload, { onConflict: "teacher_index" });
    setMsg(error ? error.message : "মনিটর দায়িত্ব সংরক্ষিত");
  }

  async function saveTeacher(e: React.FormEvent) {
    e.preventDefault();
    if (!teacher) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("teachers")
      .update({
        teacher_fn: editName,
        tcr_address: editAddr,
        teacher_sub: editSub,
        mobile_no: editMobile,
      })
      .eq("index_no", teacher.IndexNo);
    setMsg(error ? error.message : "শিক্ষক তথ্য আপডেট");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-teal-800">অ্যাডমিন প্যানেল</h1>
      </header>

      <nav className="flex gap-2 border-b">
        {(
          [
            ["manage", "ব্যবস্থাপনা"],
            ["monitoring", "মনিটরিং"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`cursor-pointer border-b-2 px-4 py-2 text-sm font-medium ${
              tab === id ? "border-teal-600 text-teal-800" : "border-transparent text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {msg && <p className="rounded bg-teal-50 p-2 text-center text-sm text-teal-900">{msg}</p>}

      {tab === "manage" && (
        <div className="space-y-6">
          <TeacherPicker selected={teacher} onSelect={setTeacher} />

          <section className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">বার্তা নিয়ন্ত্রণ</h3>
            <select value={msgKey} onChange={(e) => setMsgKey(e.target.value)} className="mb-2 w-full rounded border p-2">
              {MESSAGE_KEYS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
            <textarea value={msgText} onChange={(e) => setMsgText(e.target.value)} rows={3} className="w-full rounded border p-2" />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={saveMessage} className="flex-1 cursor-pointer rounded bg-teal-600 py-2 text-white">সিস্টেম বার্তা আপডেট</button>
              <button type="button" onClick={addSavedMessage} className="flex-1 cursor-pointer rounded bg-indigo-600 py-2 text-white">সংরক্ষিত বার্তা যোগ</button>
            </div>
            <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-sm">
              {savedMsgs.map((m) => (
                <li key={m.id} className="flex justify-between gap-2 rounded bg-gray-50 p-2">
                  <span className="truncate">{m.message_text}</span>
                  <button type="button" onClick={() => deleteSaved(m.id)} className="cursor-pointer text-red-600">মুছুন</button>
                </li>
              ))}
            </ul>
          </section>

          <form onSubmit={addLeave} className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">ছুটি যোগ</h3>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} className="rounded border p-2" required />
              <input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} className="rounded border p-2" required />
            </div>
            <input value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full rounded border p-2" />
            <textarea value={leaveComment} onChange={(e) => setLeaveComment(e.target.value)} className="w-full rounded border p-2" rows={2} />
            <button type="submit" disabled={!teacher} className="w-full cursor-pointer rounded bg-teal-600 py-2 text-white disabled:opacity-50">ছুটি যোগ করুন</button>
          </form>

          <form onSubmit={saveMonitor} className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">মনিটর দায়িত্ব</h3>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((d) => (
                <label key={d} className="flex cursor-pointer items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={monDays.includes(d)}
                    onChange={(e) =>
                      setMonDays((prev) =>
                        e.target.checked ? [...prev, d] : prev.filter((x) => x !== d),
                      )
                    }
                  />
                  {d.slice(0, 3)}
                </label>
              ))}
            </div>
            <input value={monRole} onChange={(e) => setMonRole(e.target.value)} placeholder="ভূমিকা (টিম প্রধান)" className="w-full rounded border p-2" />
            <select value={monStatus} onChange={(e) => setMonStatus(e.target.value as "On" | "Off")} className="w-full rounded border p-2">
              <option value="On">On</option>
              <option value="Off">Off</option>
            </select>
            <button type="submit" disabled={!teacher} className="w-full cursor-pointer rounded bg-teal-600 py-2 text-white disabled:opacity-50">দায়িত্ব সেভ</button>
          </form>

          <form onSubmit={saveTeacher} className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">শিক্ষক সম্পাদন</h3>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded border p-2" placeholder="নাম" />
            <textarea value={editAddr} onChange={(e) => setEditAddr(e.target.value)} className="w-full rounded border p-2" rows={2} placeholder="ঠিকানা" />
            <input value={editSub} onChange={(e) => setEditSub(e.target.value)} className="w-full rounded border p-2" placeholder="বিষয়" />
            <input value={editMobile} onChange={(e) => setEditMobile(e.target.value)} className="w-full rounded border p-2" placeholder="মোবাইল" />
            <button type="submit" disabled={!teacher} className="w-full cursor-pointer rounded bg-teal-600 py-2 text-white disabled:opacity-50">আপডেট</button>
          </form>
        </div>
      )}

      {tab === "monitoring" && (
        <div className="space-y-4">
          <label className="block text-sm font-medium">তারিখ</label>
          <input type="date" value={monDate} onChange={(e) => setMonDate(e.target.value)} className="rounded border p-2" />
          <MonitoringDayView date={monDate} onRefresh={() => refetch()} />
        </div>
      )}
    </div>
  );
}

function MonitoringDayView({ date }: { date: string; onRefresh: () => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("get_monitoring_dashboard", { p_date: date }).then(({ data: d }) => {
      setData(d as Record<string, unknown>);
    });
  }, [date]);

  const roster = (data?.dutyRoster ?? data?.duty_roster) as Record<string, { name: string; index: string }> | undefined;
  const team = (data?.monitoringTeam ?? data?.monitoring_team) as { TeacherFN?: string; teacher_index?: string; Role?: string; role?: string }[] | undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-3">
        <h4 className="mb-2 font-bold text-center">ডিউটি তালিকা</h4>
        {!roster || Object.keys(roster).length === 0 ? (
          <p className="text-center text-sm text-gray-500">ডিউটি নেই</p>
        ) : (
          <table className="w-full border text-sm">
            <tbody>
              {Object.entries(roster).map(([p, m]) => (
                <tr key={p} className="border-t">
                  <td className="p-2 font-medium">{p}</td>
                  <td className="p-2 text-blue-700">{m.name} ({m.index})</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="rounded-lg border bg-white p-3">
        <h4 className="mb-2 font-bold text-center">মনিটরিং টিম</h4>
        <ul className="space-y-2 text-sm">
          {(team ?? []).map((m, i) => (
            <li key={i} className="rounded bg-teal-50 p-2 text-center">
              {m.TeacherFN ?? m.teacher_index} — {m.Role ?? m.role ?? "সদস্য"}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
