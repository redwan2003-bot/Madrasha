"use client";

import { toBengaliNumber } from "@/lib/bengali";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "savedReports_v2";

export type SavedReport = Record<string, string | number>;

export function useSavedReports() {
  const [saved, setSaved] = useState<SavedReport[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      setSaved([]);
    }
  }, []);

  function persist(next: SavedReport[]) {
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function add(report: SavedReport) {
    persist([...saved, report]);
  }

  function clear() {
    persist([]);
  }

  return { saved, add, clear };
}

export function BatchSubmitBar({
  onSubmitted,
}: {
  onSubmitted: () => void;
}) {
  const { saved, clear } = useSavedReports();
  const [busy, setBusy] = useState(false);

  if (saved.length === 0) return null;

  async function submitAll() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("batch_submit_monitor_reports", {
      p_reports: saved,
    });
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    clear();
    onSubmitted();
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
      <button
        type="button"
        onClick={submitAll}
        disabled={busy}
        className="w-full cursor-pointer rounded-full bg-green-600 py-3 text-white shadow-lg transition-colors hover:bg-green-700 disabled:opacity-60"
      >
        {busy
          ? "জমা হচ্ছে…"
          : `সেভ করা ${toBengaliNumber(saved.length)}টি রিপোর্ট জমা দিন`}
      </button>
    </div>
  );
}
