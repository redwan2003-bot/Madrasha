"use client";

import { useRequireRole } from "@/lib/hooks/use-require-role";
import type { AppRole } from "@/types/database";
import Link from "next/link";

export function RoleGate({
  roles,
  children,
  title = "অনুমতি নেই",
}: {
  roles: AppRole[];
  children: React.ReactNode;
  title?: string;
}) {
  const { isLoading, allowed, data } = useRequireRole(roles);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-lg font-bold text-amber-900">{title}</h2>
        <p className="mt-2 text-sm text-amber-800">
          আপনার ভূমিকা: <strong>{data?.role ?? "অজানা"}</strong>. প্রয়োজন:{" "}
          {roles.join(", ")}.
        </p>
        <p className="mt-2 text-xs text-amber-700">
          অ্যাডমিন সেটআপ: Supabase-এ <code>PATCH_PANEL_PAGES.sql</code> চালান।
        </p>
        <Link href="/" className="mt-4 inline-block text-teal-700 underline">
          মূল পাতায় ফিরুন
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
