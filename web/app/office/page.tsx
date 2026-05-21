export default function OfficePage() {
  return (
    <Placeholder
      title="অফিস প্যানেল"
      legacy="office.html"
      note="দৈনিক/মাসিক উপস্থিতি — Supabase RPC ও টেবিল ধাপে যোগ করা হবে।"
    />
  );
}

function Placeholder({
  title,
  legacy,
  note,
}: {
  title: string;
  legacy: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-teal-800">{title}</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{note}</p>
      <p className="mt-4 text-xs text-gray-500">
        Legacy: <code>{legacy}</code>
      </p>
    </div>
  );
}
