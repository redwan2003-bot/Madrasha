"use client";

import { CLASS_LEVELS, CLASS_STRUCTURE } from "@/lib/monitoring/class-structure";
import { createClient } from "@/lib/supabase/client";
import type { TeacherPublic } from "@/types/database";
import { useEffect, useMemo, useState } from "react";

export function TeacherPicker({
  onSelect,
  selected,
}: {
  onSelect: (t: TeacherPublic | null) => void;
  selected: TeacherPublic | null;
}) {
  const [teachers, setTeachers] = useState<TeacherPublic[]>([]);
  const [indexQ, setIndexQ] = useState("");
  const [level, setLevel] = useState("");
  const [nameKey, setNameKey] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("teachers")
      .select("index_no, teacher_fn, designation, teacher_sub, tcr_address, mobile_no, grade, role, photo_url")
      .order("teacher_fn")
      .then(({ data, error }) => {
        if (error || !data) return;
        setTeachers(
          data.map((r) => ({
            IndexNo: r.index_no,
            TeacherFN: r.teacher_fn,
            Designation: r.designation ?? undefined,
            TeacherSub: r.teacher_sub ?? undefined,
            TcrAddress: r.tcr_address ?? undefined,
            MobileNo: r.mobile_no ?? undefined,
            Grade: r.grade ?? undefined,
            Role: r.role ?? undefined,
            PhotoUrl: r.photo_url ?? undefined,
            weeklyClassCount: 0,
          })),
        );
      });
  }, []);

  const namesForLevel = useMemo(() => {
    if (!level) return [];
    const classes = CLASS_STRUCTURE[level] ?? [];
    return teachers.filter((t) => t.Grade && classes.some((c) => t.Grade?.includes(c) || level === t.Grade));
  }, [level, teachers]);

  function pickByIndex() {
    const t = teachers.find((x) => x.IndexNo === indexQ.trim());
    onSelect(t ?? null);
  }

  function pickByName() {
    const t = namesForLevel.find((x) => x.IndexNo === nameKey);
    onSelect(t ?? null);
  }

  return (
    <div className="space-y-4 rounded-lg border bg-gray-50 p-4">
      <h3 className="font-semibold text-gray-800">শিক্ষক নির্বাচন</h3>
      <input
        value={indexQ}
        onChange={(e) => setIndexQ(e.target.value)}
        onBlur={pickByIndex}
        placeholder="ইনডেক্স নম্বর…"
        className="w-full rounded border p-2"
      />
      <p className="text-center text-xs text-gray-500">অথবা</p>
      <div className="flex gap-2">
        <select
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setNameKey("");
          }}
          className="w-1/2 rounded border p-2"
        >
          <option value="">স্তর</option>
          {CLASS_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={nameKey}
          onChange={(e) => {
            setNameKey(e.target.value);
            pickByName();
          }}
          disabled={!level}
          className="w-1/2 rounded border p-2"
        >
          <option value="">নাম</option>
          {(namesForLevel.length ? namesForLevel : teachers)
            .slice(0, 200)
            .map((t) => (
              <option key={t.IndexNo} value={t.IndexNo}>
                {t.TeacherFN}
              </option>
            ))}
        </select>
      </div>
      {selected && (
        <p className="rounded bg-teal-50 p-2 text-center font-bold text-teal-800">
          {selected.TeacherFN} ({selected.IndexNo})
        </p>
      )}
    </div>
  );
}
