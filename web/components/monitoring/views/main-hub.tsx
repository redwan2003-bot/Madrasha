"use client";

import { BtnAccent, BtnPrimary } from "@/components/monitoring/ui";
import type { MonitorViewId } from "@/components/monitoring/monitoring-app";

const ITEMS: { id: MonitorViewId; label: string; accent?: boolean }[] = [
  { id: "current", label: "এই পিরিয়ডে ক্লাস চলছে" },
  { id: "next", label: "পরবর্তী পিরিয়ডে ক্লাস চলবে" },
  { id: "teachers", label: "শিক্ষক-কর্মচারি তালিকা" },
  { id: "leave", label: "ছুটিতে আছেন যারা" },
  { id: "monitor", label: "আপনার মনিটর ভূমিকা", accent: true },
  { id: "reports", label: "মনিটরিং রিপোর্ট" },
  { id: "teacher-entry", label: "শিক্ষক প্রবেশ", accent: true },
];

export function MainHubView({ onNavigate }: { onNavigate: (v: MonitorViewId) => void }) {
  return (
    <div className="flex flex-col space-y-3">
      {ITEMS.map((item) =>
        item.accent ? (
          <BtnAccent key={item.id} onClick={() => onNavigate(item.id)}>
            {item.label}
          </BtnAccent>
        ) : (
          <BtnPrimary key={item.id} onClick={() => onNavigate(item.id)}>
            {item.label}
          </BtnPrimary>
        ),
      )}
      <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
        মনিটর রিপোর্ট: «আপনার মনিটর ভূমিকা» থেকে জমা দিন। একাধিক রিপোর্ট «সেভ» করে নিচের সবুজ বাটনে জমা দিন।
      </p>
    </div>
  );
}
