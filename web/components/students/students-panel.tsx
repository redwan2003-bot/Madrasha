"use client";

import { CLASS_LEVELS, CLASS_STRUCTURE } from "@/lib/monitoring/class-structure";
import { RoleGate } from "@/components/shared/role-gate";
import { createClient } from "@/lib/supabase/client";
import { useMemo, useState } from "react";

type Student = { id: number; roll: string; name: string; gender: string | null; class: string };

export function StudentsPanel() {
  const [tab, setTab] = useState<"list" | "add">("list");
  const [level, setLevel] = useState("");
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [newRoll, setNewRoll] = useState("");
  const [newName, setNewName] = useState("");
  const [newGender, setNewGender] = useState("ছাত্র");

  const classes = useMemo(() => (level ? CLASS_STRUCTURE[level] ?? [] : []), [level]);

  async function load() {
    if (!className) return;
    setMsg(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("students")
      .select("id, roll, name, gender, class")
      .eq("class", className)
      .order("roll");
    if (error) setMsg(error.message);
    else setStudents((data ?? []) as Student[]);
  }

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!className || !newRoll || !newName) return;
    const supabase = createClient();
    const { error } = await supabase.from("students").insert({
      roll: newRoll,
      name: newName,
      gender: newGender,
      class: className,
    });
    setMsg(error ? error.message : "শিক্ষার্থী যোগ হয়েছে");
    if (!error) {
      setNewRoll("");
      setNewName("");
      load();
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-sky-800">শিক্ষার্থী তথ্য</h1>
      </header>

      <nav className="flex gap-2 border-b">
        <button type="button" onClick={() => setTab("list")} className={`flex-1 cursor-pointer border-b-2 py-2 text-sm ${tab === "list" ? "border-sky-700 text-sky-800" : "border-transparent text-gray-500"}`}>
          তালিকা
        </button>
        <button type="button" onClick={() => setTab("add")} className={`flex-1 cursor-pointer border-b-2 py-2 text-sm ${tab === "add" ? "border-sky-700 text-sky-800" : "border-transparent text-gray-500"}`}>
          নতুন যোগ
        </button>
      </nav>

      <div className="grid grid-cols-2 gap-3">
        <select value={level} onChange={(e) => { setLevel(e.target.value); setClassName(""); }} className="rounded border p-2">
          <option value="">স্তর</option>
          {CLASS_LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select value={className} onChange={(e) => setClassName(e.target.value)} className="rounded border p-2" disabled={!level}>
          <option value="">শ্রেণি</option>
          {classes.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {tab === "list" && (
        <>
          <button type="button" onClick={load} className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-white">
            তালিকা দেখুন
          </button>
          <div className="max-h-96 overflow-y-auto rounded border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-100">
                <tr>
                  <th className="p-2">রোল</th>
                  <th className="p-2 text-left">নাম</th>
                  <th className="p-2">ধরন</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer border-t hover:bg-sky-50"
                    onClick={() => setSelected(s)}
                  >
                    <td className="p-2 text-center">{s.roll}</td>
                    <td className="p-2">{s.name}</td>
                    <td className="p-2 text-center">{s.gender ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selected && (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="font-bold text-sky-800">{selected.name}</h3>
              <p className="text-sm">রোল: {selected.roll} | শ্রেণি: {selected.class}</p>
              <p className="text-sm">লিঙ্গ: {selected.gender ?? "—"}</p>
            </div>
          )}
        </>
      )}

      {tab === "add" && (
        <RoleGate roles={["office", "admin"]} title="শিক্ষার্থী যোগ — অফিস/অ্যাডমিন">
          <form onSubmit={addStudent} className="space-y-3 rounded-lg border p-4">
            <input value={newRoll} onChange={(e) => setNewRoll(e.target.value)} placeholder="রোল" className="w-full rounded border p-2" required />
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="নাম" className="w-full rounded border p-2" required />
            <select value={newGender} onChange={(e) => setNewGender(e.target.value)} className="w-full rounded border p-2">
              <option>ছাত্র</option>
              <option>ছাত্রী</option>
            </select>
            <button type="submit" disabled={!className} className="w-full cursor-pointer rounded-lg bg-teal-600 py-2 text-white disabled:opacity-50">
              যোগ করুন
            </button>
          </form>
        </RoleGate>
      )}

      {msg && <p className="text-center text-sm text-gray-700">{msg}</p>}
    </div>
  );
}
