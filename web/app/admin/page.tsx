export default function AdminPage() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-teal-800">এডমিন প্যানেল</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        শিক্ষক, মনিটরিং টিম, বার্তা — legacy <code>admin.html</code> থেকে স্থানান্তর চলছে।
      </p>
      <ul className="mt-4 list-inside list-disc text-sm text-gray-600">
        <li>profiles.role = admin প্রয়োজন</li>
        <li>RLS: monitoring_team, saved_messages, special_messages</li>
      </ul>
    </div>
  );
}
